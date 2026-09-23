import { distanceKm } from "./geo";
import { isStale, normalizeSourceType, normalizeStatus } from "./plan-status";

export type RankableProvider = {
  id: string;
  rating: number;
  latitude: number;
  longitude: number;
  planStatus: string | null;
  planSource?: string | null;
  lastVerifiedAt: Date | string | null;
  specialtyMatch?: boolean;
};

/**
 * Ranking (spec §19):
 * plano exato → oficial recente → clínica recente → comunidade recente → distância → especialidade
 */
export function rankProviders<T extends RankableProvider>(
  items: T[],
  origin: { latitude: number; longitude: number }
): (T & { distanceKm: number; rankScore: number })[] {
  const statusScore = (s: string | null, source: string | null | undefined) => {
    const status = normalizeStatus(s);
    const src = normalizeSourceType(source ?? undefined);
    switch (status) {
      case "confirmed":
        if (src === "clinic") return 5000;
        if (src === "community") return 4200;
        return 4500; // operator/admin confirmed
      case "listed":
        return 3200; // oficial na rede
      case "stale":
        return 1800;
      case "conflicting":
        return 1500;
      case null:
        return 800;
      case "not_found":
        return 400;
      case "reported_not_accepting":
        return 0;
      default:
        return 600;
    }
  };

  const withMeta = items.map((item) => {
    const dist = distanceKm(
      origin.latitude,
      origin.longitude,
      item.latitude,
      item.longitude
    );
    const verified = item.lastVerifiedAt
      ? new Date(item.lastVerifiedAt).getTime()
      : 0;
    const recencyDays = verified
      ? Math.max(0, (Date.now() - verified) / (1000 * 60 * 60 * 24))
      : 999;
    const stalePenalty = isStale(item.lastVerifiedAt) ? -400 : 0;
    const recencyScore = Math.max(0, 600 - recencyDays * 6);
    const proximityScore = Math.max(0, 300 - dist * 20);
    const ratingScore = item.rating * 20;
    const specialtyBonus = item.specialtyMatch ? 150 : 0;

    const rankScore =
      statusScore(item.planStatus, item.planSource) +
      recencyScore +
      proximityScore +
      ratingScore +
      specialtyBonus +
      stalePenalty;

    return { ...item, distanceKm: dist, rankScore };
  });

  return withMeta.sort((a, b) => b.rankScore - a.rankScore);
}
