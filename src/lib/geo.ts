/** Haversine distance in kilometers */
export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const DEFAULT_LOCATION = {
  city: "São Paulo",
  latitude: -23.5505,
  longitude: -46.6333,
};

export const CAMPINAS_LOCATION = {
  city: "Campinas",
  latitude: -22.9056,
  longitude: -47.0608,
};

/** Rough CEP → neighborhood centroids for São Paulo demo + Campinas (rede real) */
export function resolveCepOrCity(input: string): {
  city: string;
  latitude: number;
  longitude: number;
  neighborhood?: string;
} {
  const q = input.trim().toLowerCase();

  if (q.includes("campinas") || q.replace(/\D/g, "").startsWith("130")) {
    return { ...CAMPINAS_LOCATION };
  }

  const neighborhoods: Record<string, { lat: number; lng: number; name: string }> = {
    pinheiros: { lat: -23.5672, lng: -46.6918, name: "Pinheiros" },
    moema: { lat: -23.6015, lng: -46.6632, name: "Moema" },
    "vila madalena": { lat: -23.5531, lng: -46.6902, name: "Vila Madalena" },
    jardins: { lat: -23.5589, lng: -46.6621, name: "Jardins" },
    tatuapé: { lat: -23.5401, lng: -46.5752, name: "Tatuapé" },
    tatuape: { lat: -23.5401, lng: -46.5752, name: "Tatuapé" },
    santana: { lat: -23.5089, lng: -46.6291, name: "Santana" },
    brooklin: { lat: -23.6102, lng: -46.6945, name: "Brooklin" },
    perdizes: { lat: -23.5368, lng: -46.6734, name: "Perdizes" },
    ipiranga: { lat: -23.5881, lng: -46.6098, name: "Ipiranga" },
  };

  for (const [key, val] of Object.entries(neighborhoods)) {
    if (q.includes(key)) {
      return {
        city: "São Paulo",
        latitude: val.lat,
        longitude: val.lng,
        neighborhood: val.name,
      };
    }
  }

  // CEP prefix heuristic (demo)
  const digits = q.replace(/\D/g, "");
  if (digits.startsWith("054")) return { city: "São Paulo", latitude: -23.5672, longitude: -46.6918, neighborhood: "Pinheiros" };
  if (digits.startsWith("040")) return { city: "São Paulo", latitude: -23.6015, longitude: -46.6632, neighborhood: "Moema" };
  if (digits.startsWith("013")) return { city: "São Paulo", latitude: -23.5614, longitude: -46.6558, neighborhood: "Bela Vista" };

  return { ...DEFAULT_LOCATION };
}

/** Origem sugerida a partir do plano ativo (rede real Unimed Campinas). */
export function originForPlan(plan?: {
  operator?: string | null;
  name?: string | null;
  ansCode?: string | null;
} | null): typeof CAMPINAS_LOCATION | null {
  if (!plan) return null;
  const op = (plan.operator ?? "").toLowerCase();
  const name = (plan.name ?? "").toLowerCase();
  const ans = plan.ansCode ?? "";
  if (op.includes("campinas") || name.includes("0347") || ans === "0347") {
    return { ...CAMPINAS_LOCATION };
  }
  return null;
}
