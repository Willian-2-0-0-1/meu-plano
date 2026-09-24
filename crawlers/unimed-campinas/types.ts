export const UNIMED_CAMPINAS = {
  id: "unimed-campinas",
  operator: "Unimed Campinas",
  baseUrl: "https://www.unimedcampinas.com.br",
  guiaPath: "/guia-medico",
  userAgent:
    "MeuPlanoCrawler/0.1 (+https://github.com/Willian-2-0-0-1/meu-plano; contato=dev@meuplano.local)",
  /** Centro aproximado de Campinas — só usado se lat/lng ausentes e schema exigir. */
  cityCentroid: { latitude: -22.9056, longitude: -47.0608 },
  defaults: {
    state: "SP",
    city: "Campinas",
    cityId: "53",
    specialty: "Dermatologia",
    specialtyId: "70",
    serviceType: "01", // Médicos Cooperados
    /** PLANO UNIMED PESSOA FISICA -0347 */
    planId: "7",
    planName: "PLANO UNIMED PESSOA FISICA -0347",
    planAnsCode: "0347",
  },
} as const;

export type UnimedCampinasRawItem = {
  name: string;
  crm?: string | null;
  specialty?: string | null;
  establishmentType?: string | null;
  addressHtml?: string | null;
  phones: string[];
  mapUrl?: string | null;
  sourceUrl: string;
  request: Record<string, unknown>;
  httpStatus: number;
};
