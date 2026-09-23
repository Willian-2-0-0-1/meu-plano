import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseSearchQuery } from "@/lib/search-parser";
import { rankProviders } from "@/lib/ranking";
import { DEFAULT_LOCATION, resolveCepOrCity } from "@/lib/geo";

export async function GET(req: NextRequest) {
  const session = await auth();
  const sp = req.nextUrl.searchParams;

  const q = sp.get("q") ?? "";
  const type = sp.get("type") ?? "";
  const specialty = sp.get("specialty") ?? "";
  const maxDistance = Number(sp.get("distance") || "25");
  const onlyAccepts = sp.get("acceptsPlan") === "1";
  const onlyRecent = sp.get("recentConfirm") === "1";
  const openToday = sp.get("openToday") === "1";
  const minRating = Number(sp.get("minRating") || "0");
  const locationMode = sp.get("locationMode") ?? "default";
  const lat = sp.get("lat") ? Number(sp.get("lat")) : null;
  const lng = sp.get("lng") ? Number(sp.get("lng")) : null;
  const place = sp.get("place") ?? "";
  const includeNotAccepted = sp.get("includeNotAccepted") === "1";
  const includeUnconfirmed = sp.get("includeUnconfirmed") !== "0";

  let origin = { ...DEFAULT_LOCATION };
  if (locationMode === "geo" && lat != null && lng != null) {
    origin = { city: "São Paulo", latitude: lat, longitude: lng };
  } else if (place) {
    const resolved = resolveCepOrCity(place);
    origin = {
      city: resolved.city,
      latitude: resolved.latitude,
      longitude: resolved.longitude,
    };
  } else if (session?.user?.id) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user?.latitude && user?.longitude) {
      origin = {
        city: user.city ?? "São Paulo",
        latitude: user.latitude,
        longitude: user.longitude,
      };
    }
  }

  const parsed = parseSearchQuery(q);

  let activePlanId: string | null = null;
  let activePlanName: string | null = null;
  if (session?.user?.id) {
    const up = await prisma.userPlan.findFirst({
      where: { userId: session.user.id, isActive: true },
      include: { healthPlan: true },
    });
    activePlanId = up?.healthPlanId ?? null;
    activePlanName = up ? `${up.healthPlan.operator} ${up.healthPlan.name}` : null;
  }

  const specialtyHints = [
    ...parsed.specialtyHints,
    ...(specialty ? [specialty] : []),
  ];

  const typeHints = [
    ...parsed.typeHints,
    ...(type ? [type] : []),
  ];

  const providers = await prisma.provider.findMany({
    include: {
      specialties: { include: { specialty: true } },
      plans: activePlanId
        ? {
            where: { healthPlanId: activePlanId },
            include: { healthPlan: true },
          }
        : {
            where: { id: "___no_active_plan___" },
            include: { healthPlan: true },
          },
    },
  });

  let filtered = providers.filter((p) => {
    if (openToday && !p.openToday) return false;
    if (p.rating < minRating) return false;

    if (typeHints.length) {
      const typeOk =
        typeHints.some((t) => p.type === t) ||
        (typeHints.includes("exame") &&
          p.specialties.some((s) => s.specialty.category === "exame")) ||
        (typeHints.includes("medico") &&
          (p.type === "medico" || p.type === "clinica"));
      if (!typeOk && !q) return false;
      // if query has type hints but provider doesn't match, still allow specialty match below
    }

    if (specialtyHints.length) {
      const hasSpec = p.specialties.some((s) =>
        specialtyHints.some(
          (h) =>
            s.specialty.name.toLowerCase().includes(h.toLowerCase()) ||
            h.toLowerCase().includes(s.specialty.name.toLowerCase()) ||
            s.specialty.keywords.toLowerCase().includes(h.toLowerCase())
        )
      );
      if (!hasSpec && specialtyHints.length && (q || specialty)) {
        // soft: also check name/description
        const blob = `${p.name} ${p.description ?? ""}`.toLowerCase();
        const soft = specialtyHints.some((h) => blob.includes(h.toLowerCase()));
        if (!hasSpec && !soft) return false;
      }
    } else if (q) {
      const blob = `${p.name} ${p.description ?? ""} ${p.neighborhood} ${p.specialties
        .map((s) => `${s.specialty.name} ${s.specialty.keywords}`)
        .join(" ")}`.toLowerCase();
      const tokens = parsed.keywords;
      if (tokens.length && !tokens.some((t) => blob.includes(t))) return false;
    }

    if (type && !specialtyHints.length && !q) {
      if (type === "exame") {
        if (!p.specialties.some((s) => s.specialty.category === "exame") && p.type !== "laboratorio")
          return false;
      } else if (type === "medico") {
        if (p.type !== "medico" && p.type !== "clinica") return false;
      } else if (p.type !== type) {
        return false;
      }
    }

    const plan = p.plans[0];
    const status = plan?.status ?? null;

    if (onlyAccepts && status !== "confirmed") return false;
    if (!includeNotAccepted && status === "not_accepted") return false;
    if (!includeUnconfirmed && status === "unconfirmed") return false;
    if (onlyRecent) {
      if (!plan?.lastVerifiedAt) return false;
      const days =
        (Date.now() - new Date(plan.lastVerifiedAt).getTime()) /
        (1000 * 60 * 60 * 24);
      if (days > 30) return false;
    }

    return true;
  });

  // If typeHints and specialty filtered everything with strict type, relax type
  if (filtered.length === 0 && (q || specialty)) {
    filtered = providers.filter((p) => {
      if (specialtyHints.length) {
        return p.specialties.some((s) =>
          specialtyHints.some(
            (h) =>
              s.specialty.name.toLowerCase().includes(h.toLowerCase()) ||
              s.specialty.keywords.toLowerCase().includes(h.toLowerCase())
          )
        );
      }
      return true;
    });
  }

  const rankable = filtered.map((p) => {
    const plan = p.plans[0];
    return {
      ...p,
      planStatus: plan?.status ?? null,
      lastVerifiedAt: plan?.lastVerifiedAt ?? null,
      planSource: plan?.source ?? null,
      planRecord: plan ?? null,
    };
  });

  const ranked = rankProviders(rankable, origin).filter(
    (p) => p.distanceKm <= maxDistance
  );

  if (session?.user?.id) {
    await prisma.searchEvent.create({
      data: {
        userId: session.user.id,
        query: q || specialty || type || "(atalho)",
        specialty: specialtyHints[0] ?? null,
        city: origin.city,
        planId: activePlanId,
        resultCount: ranked.length,
      },
    });
  }

  const results = ranked.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    photoUrl: p.photoUrl,
    address: p.address,
    neighborhood: p.neighborhood,
    city: p.city,
    latitude: p.latitude,
    longitude: p.longitude,
    rating: p.rating,
    reviewCount: p.reviewCount,
    openToday: p.openToday,
    phone: p.phone,
    whatsapp: p.whatsapp,
    distanceKm: p.distanceKm,
    specialties: p.specialties.map((s) => s.specialty.name),
    planStatus: p.planStatus,
    planSource: p.planSource,
    lastVerifiedAt: p.lastVerifiedAt,
    planName: activePlanName,
  }));

  return NextResponse.json({
    results,
    meta: {
      count: results.length,
      origin,
      parsed,
      activePlanName,
      activePlanId,
    },
  });
}
