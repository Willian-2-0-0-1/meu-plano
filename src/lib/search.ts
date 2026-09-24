import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseSearchQuery } from "@/lib/search-parser";
import { rankProviders } from "@/lib/ranking";
import { DEFAULT_LOCATION, originForPlan, resolveCepOrCity } from "@/lib/geo";
import { resolveActivePlan } from "@/lib/guest-plan";
import { isStale, normalizeSourceType, normalizeStatus } from "@/lib/plan-status-helpers";

export type SearchParamsInput = {
  q?: string;
  type?: string;
  specialty?: string;
  distance?: string | number;
  acceptsPlan?: string;
  recentConfirm?: string;
  openToday?: string;
  minRating?: string | number;
  includeUnconfirmed?: string;
  includeNotAccepted?: string;
  locationMode?: string;
  lat?: string | number;
  lng?: string | number;
  place?: string;
  planId?: string;
};

export type SearchResultItem = {
  id: string;
  name: string;
  type: string;
  photoUrl: string | null;
  address: string;
  neighborhood: string;
  city: string;
  latitude: number;
  longitude: number;
  rating: number;
  reviewCount: number;
  openToday: boolean;
  phone: string | null;
  whatsapp: string | null;
  distanceKm: number;
  specialties: string[];
  planStatus: string | null;
  planSource: string | null;
  planSourceUrl?: string | null;
  planOperator?: string | null;
  lastVerifiedAt: Date | string | null;
  planName: string | null;
  communityAccepted?: number;
  communityDenied?: number;
  conflicting?: boolean;
};

export async function runProviderSearch(input: SearchParamsInput) {
  const session = await auth();
  const q = input.q ?? "";
  const type = input.type ?? "";
  const specialty = input.specialty ?? "";
  const onlyAccepts = input.acceptsPlan === "1";
  const onlyRecent = input.recentConfirm === "1";
  const openToday = input.openToday === "1";
  const minRating = Number(input.minRating || "0");
  const locationMode = input.locationMode ?? "default";
  const lat = input.lat != null && input.lat !== "" ? Number(input.lat) : null;
  const lng = input.lng != null && input.lng !== "" ? Number(input.lng) : null;
  const place = input.place ?? "";
  const includeNotAccepted = input.includeNotAccepted === "1";
  const includeUnconfirmed = input.includeUnconfirmed !== "0";

  const parsed = parseSearchQuery(q);

  let activePlanId: string | null = null;
  let activePlanName: string | null = null;
  let activePlanMeta: { operator: string; name: string; ansCode: string | null } | null = null;

  if (session?.user?.id) {
    const up = await prisma.userPlan.findFirst({
      where: { userId: session.user.id, isActive: true },
      include: { healthPlan: true },
    });
    if (up) {
      activePlanId = up.healthPlanId;
      activePlanName = `${up.healthPlan.operator} ${up.healthPlan.name}`;
      activePlanMeta = {
        operator: up.healthPlan.operator,
        name: up.healthPlan.name,
        ansCode: up.healthPlan.ansCode,
      };
    }
  }

  if (!activePlanId) {
    const resolved = await resolveActivePlan({ planId: input.planId });
    activePlanId = resolved.healthPlanId;
    activePlanName = resolved.planName;
    if (activePlanId) {
      const hp = await prisma.healthPlan.findUnique({ where: { id: activePlanId } });
      if (hp) {
        activePlanMeta = { operator: hp.operator, name: hp.name, ansCode: hp.ansCode };
      }
    }
  }

  // Origem: place/geo explícitos > bias do plano (Unimed Campinas) > default SP
  let origin = { ...DEFAULT_LOCATION };
  const planOrigin = originForPlan(activePlanMeta);
  if (locationMode === "geo" && lat != null && lng != null) {
    origin = { city: place || planOrigin?.city || "São Paulo", latitude: lat, longitude: lng };
  } else if (place) {
    const resolvedPlace = resolveCepOrCity(place);
    origin = {
      city: resolvedPlace.city,
      latitude: resolvedPlace.latitude,
      longitude: resolvedPlace.longitude,
    };
  } else if (planOrigin) {
    origin = { ...planOrigin };
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

  // Distância padrão maior para rede Campinas (cidade + arredores)
  let maxDistance = Number(input.distance || "25");
  if (!input.distance && planOrigin) {
    maxDistance = 40;
  }

  const specialtyHints = [
    ...parsed.specialtyHints,
    ...(specialty ? [specialty] : []),
  ];
  const typeHints = [...parsed.typeHints, ...(type ? [type] : [])];
  void typeHints;

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
      experiences: activePlanId
        ? {
            where: { healthPlanId: activePlanId },
            select: { accepted: true },
          }
        : false,
    },
  });

  let filtered = providers.filter((p) => {
    if (openToday && !p.openToday) return false;
    if (p.rating < minRating) return false;

    if (specialtyHints.length) {
      const hasSpec = p.specialties.some((s) =>
        specialtyHints.some(
          (h) =>
            s.specialty.name.toLowerCase().includes(h.toLowerCase()) ||
            h.toLowerCase().includes(s.specialty.name.toLowerCase()) ||
            s.specialty.keywords.toLowerCase().includes(h.toLowerCase())
        )
      );
      const blob = `${p.name} ${p.description ?? ""}`.toLowerCase();
      const soft = specialtyHints.some((h) => blob.includes(h.toLowerCase()));
      if (!hasSpec && !soft && (q || specialty)) return false;
    } else if (q) {
      const blob = `${p.name} ${p.description ?? ""} ${p.neighborhood} ${p.specialties
        .map((s) => `${s.specialty.name} ${s.specialty.keywords}`)
        .join(" ")}`.toLowerCase();
      const tokens = parsed.keywords;
      if (tokens.length && !tokens.some((t) => blob.includes(t))) return false;
    }

    if (type && !specialtyHints.length && !q) {
      if (type === "exame") {
        if (
          !p.specialties.some((s) => s.specialty.category === "exame") &&
          p.type !== "laboratorio"
        )
          return false;
      } else if (type === "medico") {
        if (p.type !== "medico" && p.type !== "clinica") return false;
      } else if (p.type !== type) {
        return false;
      }
    }

    const plan = p.plans[0];
    let status = normalizeStatus(plan?.status ?? null);
    if (status === "listed" && isStale(plan?.lastCheckedAt ?? plan?.lastVerifiedAt)) {
      status = "stale";
    }
    if (onlyAccepts && status !== "confirmed") return false;
    if (
      !includeNotAccepted &&
      (status === "reported_not_accepting" || status === "not_accepted")
    )
      return false;
    if (!includeUnconfirmed && (status === "listed" || status === "stale" || status === "unconfirmed"))
      return false;
    if (onlyRecent) {
      if (!plan?.lastVerifiedAt && !plan?.lastCheckedAt) return false;
      const ref = plan.lastVerifiedAt ?? plan.lastCheckedAt;
      const days =
        (Date.now() - new Date(ref!).getTime()) / (1000 * 60 * 60 * 24);
      if (days > 30) return false;
    }
    return true;
  });

  if (filtered.length === 0 && (q || specialty)) {
    filtered = providers.filter((p) => {
      if (!specialtyHints.length) return true;
      return p.specialties.some((s) =>
        specialtyHints.some(
          (h) =>
            s.specialty.name.toLowerCase().includes(h.toLowerCase()) ||
            s.specialty.keywords.toLowerCase().includes(h.toLowerCase())
        )
      );
    });
  }

  const rankable = filtered.map((p) => {
    const plan = p.plans[0];
    let status = normalizeStatus(plan?.status ?? null);
    if (status === "listed" && isStale(plan?.lastCheckedAt ?? plan?.lastVerifiedAt)) {
      status = "stale";
    }
    const specialtyMatch = specialtyHints.length
      ? p.specialties.some((s) =>
          specialtyHints.some((h) =>
            s.specialty.name.toLowerCase().includes(h.toLowerCase())
          )
        )
      : false;
    return {
      ...p,
      planStatus: status,
      lastVerifiedAt: plan?.lastVerifiedAt ?? plan?.lastCheckedAt ?? null,
      planSource: plan?.sourceType || plan?.source || null,
      planSourceUrl: plan?.sourceUrl ?? null,
      planOperator: plan?.healthPlan?.operator ?? null,
      specialtyMatch,
    };
  });

  const ranked = rankProviders(rankable, origin).filter((p) => p.distanceKm <= maxDistance);

  await prisma.searchEvent.create({
    data: {
      userId: session?.user?.id ?? null,
      query: q || specialty || type || "(atalho)",
      specialty: specialtyHints[0] ?? null,
      city: origin.city,
      planId: activePlanId,
      resultCount: ranked.length,
    },
  });

  const results: SearchResultItem[] = ranked.map((p) => {
    const exps = Array.isArray(p.experiences) ? p.experiences : [];
    const communityAccepted = exps.filter((e) => e.accepted).length;
    const communityDenied = exps.filter((e) => !e.accepted).length;
    return {
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
      planSource: p.planSource ? normalizeSourceType(p.planSource) : null,
      planSourceUrl: p.planSourceUrl ?? null,
      planOperator: p.planOperator ?? null,
      lastVerifiedAt: p.lastVerifiedAt,
      planName: activePlanName,
      communityAccepted,
      communityDenied,
      conflicting: p.planStatus === "conflicting",
    };
  });

  return {
    results,
    meta: {
      count: results.length,
      origin,
      parsed,
      activePlanName,
      activePlanId,
    },
  };
}
