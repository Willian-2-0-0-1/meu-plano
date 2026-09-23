import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseSearchQuery } from "@/lib/search-parser";
import { rankProviders } from "@/lib/ranking";
import { DEFAULT_LOCATION, resolveCepOrCity } from "@/lib/geo";

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
  lastVerifiedAt: Date | string | null;
  planName: string | null;
};

export async function runProviderSearch(input: SearchParamsInput) {
  const session = await auth();
  const q = input.q ?? "";
  const type = input.type ?? "";
  const specialty = input.specialty ?? "";
  const maxDistance = Number(input.distance || "25");
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
  const typeHints = [...parsed.typeHints, ...(type ? [type] : [])];

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
    return {
      ...p,
      planStatus: plan?.status ?? null,
      lastVerifiedAt: plan?.lastVerifiedAt ?? null,
      planSource: plan?.source ?? null,
    };
  });

  const ranked = rankProviders(rankable, origin).filter((p) => p.distanceKm <= maxDistance);

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

  const results: SearchResultItem[] = ranked.map((p) => ({
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
