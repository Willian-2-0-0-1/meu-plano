/**
 * Interface comum para adapters de rede de operadoras.
 * Implementações REAL e MOCK compartilham o mesmo contrato.
 */

export type CrawlerSearchInput = {
  operator?: string;
  plan?: string;
  planAnsCode?: string;
  state?: string;
  city?: string;
  specialty?: string;
  service?: string;
  /** Limite de registros para teste/MVP (ex.: 8). */
  limit?: number;
};

export type RawProviderResult = {
  operator: string;
  sourceUrl: string;
  collectedAt: Date;
  httpStatus?: number | null;
  requestPayload: Record<string, unknown>;
  rawPayload: unknown;
  /** Identificador estável do prestador na operadora, se existir. */
  operatorProviderId?: string | null;
};

export type NormalizedProviderResult = {
  operator: string;
  operatorId?: string | null;
  planName: string;
  planAnsCode?: string | null;
  providerName: string;
  providerDocument?: string | null;
  cnes?: string | null;
  unitName?: string | null;
  specialty?: string | null;
  service?: string | null;
  address?: string | null;
  addressNumber?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city: string;
  state: string;
  postalCode?: string | null;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  sourceUrl: string;
  collectedAt: Date;
  rawSourceId?: string | null;
  operatorProviderId?: string | null;
};

/** @deprecated Use NormalizedProviderResult — mantido para adapters MOCK legados. */
export type NormalizedCrawlerResult = {
  operator: string;
  plan_name: string;
  plan_ans_code?: string | null;
  provider_name: string;
  provider_document?: string | null;
  specialty?: string | null;
  service?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  source_url?: string | null;
  collected_at: Date;
};

export interface HealthPlanCrawler {
  readonly id: string;
  readonly operator: string;
  readonly isMock: boolean;
  search(input: CrawlerSearchInput): Promise<RawProviderResult[]>;
  normalize(result: RawProviderResult): Promise<NormalizedProviderResult | null>;
}

/** Compat legado MOCK: crawl() retorna já normalizado. */
export interface HealthPlanProviderCrawler {
  readonly id: string;
  readonly operator: string;
  readonly isMock?: boolean;
  crawl(opts?: { planName?: string }): Promise<NormalizedCrawlerResult[]>;
}
