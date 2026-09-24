/**
 * Interface comum para adapters de rede de operadoras.
 * Implementações atuais são MOCK — sem scrapers reais.
 */
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

export interface HealthPlanProviderCrawler {
  readonly id: string;
  readonly operator: string;
  crawl(opts?: { planName?: string }): Promise<NormalizedCrawlerResult[]>;
}
