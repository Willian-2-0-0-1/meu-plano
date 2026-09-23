import { distanceKm } from "./geo";

export type RankableProvider = {
  id: string;
  rating: number;
  latitude: number;
  longitude: number;
  planStatus: string | null; // confirmed | unconfirmed | not_accepted | null
  lastVerifiedAt: Date | string | null;
};

/**
 * Ranking:
 * 1) aceita o plano do usuário (confirmed > unconfirmed > sem info > not_accepted)
 * 2) confirmação mais recente
 * 3) proximidade
 * 4) avaliação
 */
export function rankProviders<T extends RankableProvider>(
  items: T[],
  origin: { latitude: number; longitude: number }
): (T & { distanceKm: number; rankScore: number })[] {
  const statusScore = (s: string | null) => {
    switch (s) {
      case "confirmed":
        return 4000;
      case "unconfirmed":
        return 2500;
      case null:
        return 1000;
      case "not_accepted":
        return 0;
      default:
        return 500;
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
    const recencyScore = Math.max(0, 500 - recencyDays * 5);
    const proximityScore = Math.max(0, 300 - dist * 20);
    const ratingScore = item.rating * 20;

    const rankScore =
      statusScore(item.planStatus) + recencyScore + proximityScore + ratingScore;

    return { ...item, distanceKm: dist, rankScore };
  });

  return withMeta.sort((a, b) => b.rankScore - a.rankScore);
}
