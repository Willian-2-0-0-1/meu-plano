import type { HealthPlanProviderCrawler, NormalizedCrawlerResult } from "./types";

function mockRow(
  operator: string,
  partial: Partial<NormalizedCrawlerResult> & {
    plan_name: string;
    provider_name: string;
  }
): NormalizedCrawlerResult {
  return {
    operator,
    plan_ans_code: partial.plan_ans_code ?? null,
    specialty: partial.specialty ?? "Clínica Geral",
    service: partial.service ?? "Consulta",
    address: partial.address ?? "Rua Mock, 100",
    city: partial.city ?? "São Paulo",
    state: partial.state ?? "SP",
    postal_code: partial.postal_code ?? "01000-000",
    phone: partial.phone ?? "11999990000",
    latitude: partial.latitude ?? -23.55,
    longitude: partial.longitude ?? -46.63,
    provider_document: partial.provider_document ?? null,
    source_url: partial.source_url ?? `https://mock.meuplano.local/${operator.toLowerCase()}`,
    collected_at: new Date(),
    plan_name: partial.plan_name,
    provider_name: partial.provider_name,
  };
}

function makeAdapter(id: string, operator: string, fixtures: NormalizedCrawlerResult[]): HealthPlanProviderCrawler {
  return {
    id,
    operator,
    async crawl() {
      // MOCK: retorna fixtures estáveis para testar o pipeline
      return fixtures.map((f) => ({ ...f, collected_at: new Date() }));
    },
  };
}

export const unimedCrawler = makeAdapter("unimed", "Unimed", [
  mockRow("Unimed", {
    plan_name: "Unimed Nacional",
    plan_ans_code: "UN-001",
    provider_name: "Clínica Saúde Mais",
    provider_document: "12.345.678/0001-90",
    specialty: "Dermatologia",
    address: "Rua dos Pinheiros, 1200 — Pinheiros",
    latitude: -23.5672,
    longitude: -46.6918,
  }),
  mockRow("Unimed", {
    plan_name: "Unimed Pleno",
    provider_name: "Hospital Horizonte Verde",
    provider_document: "98.765.432/0001-10",
    specialty: "Pronto Atendimento",
    address: "Rua Silva Bueno, 1500 — Ipiranga",
    latitude: -23.5881,
    longitude: -46.6098,
  }),
]);

export const amilCrawler = makeAdapter("amil", "Amil", [
  mockRow("Amil", {
    plan_name: "Amil 400",
    provider_name: "Centro de Imagem Aurora",
    specialty: "Ressonância Magnética",
    address: "Av. Eng. Luís Carlos Berrini, 800 — Brooklin",
    latitude: -23.6102,
    longitude: -46.6945,
  }),
]);

export const sulamericaCrawler = makeAdapter("sulamerica", "SulAmérica", [
  mockRow("SulAmérica", {
    plan_name: "Especial 100",
    plan_ans_code: "SA-100",
    provider_name: "Clínica Saúde Mais",
    provider_document: "12.345.678/0001-90",
    specialty: "Dermatologia",
    address: "Rua dos Pinheiros, 1200 — Pinheiros",
    latitude: -23.5672,
    longitude: -46.6918,
  }),
  mockRow("SulAmérica", {
    plan_name: "Especial 100",
    provider_name: "Rede Mock SulAmérica Paulista",
    provider_document: "11.222.333/0001-44",
    specialty: "Clínica Geral",
    address: "Av. Paulista, 900 — Bela Vista",
    latitude: -23.5631,
    longitude: -46.6544,
    source_url: "https://mock.meuplano.local/sulamerica/rede",
  }),
  mockRow("SulAmérica", {
    plan_name: "Exato",
    provider_name: "Centro Médico Paulista",
    specialty: "Dermatologia",
    address: "Av. Paulista, 1500 — Bela Vista",
    latitude: -23.5614,
    longitude: -46.6558,
  }),
]);

export const bradescoCrawler = makeAdapter("bradesco", "Bradesco Saúde", [
  mockRow("Bradesco Saúde", {
    plan_name: "Saúde Top Nacional",
    provider_name: "PediaKids Saúde",
    specialty: "Pediatria",
    address: "Av. Santo Amaro, 4500 — Campo Belo",
    latitude: -23.6189,
    longitude: -46.6721,
  }),
]);

export const intermedicaCrawler = makeAdapter("intermedica", "NotreDame Intermédica", [
  mockRow("NotreDame Intermédica", {
    plan_name: "Smart 200",
    provider_name: "UPA Demo Leste",
    specialty: "Pronto Atendimento",
    address: "Rua Dr. João Ribeiro, 100 — Penha",
    latitude: -23.5221,
    longitude: -46.5428,
  }),
]);

export const crawlers: HealthPlanProviderCrawler[] = [
  unimedCrawler,
  amilCrawler,
  sulamericaCrawler,
  bradescoCrawler,
  intermedicaCrawler,
];

export function getCrawler(id: string): HealthPlanProviderCrawler | undefined {
  return crawlers.find((c) => c.id === id || c.operator.toLowerCase().includes(id.toLowerCase()));
}
