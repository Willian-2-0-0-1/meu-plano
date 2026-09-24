import { mockCrawlers, getCrawler as getMockCrawler } from "./adapters";
import type { HealthPlanCrawler, HealthPlanProviderCrawler } from "./types";
import { unimedCampinasCrawler } from "./unimed-campinas";

export type RegisteredAdapter = {
  id: string;
  operator: string;
  isMock: boolean;
  kind: "real" | "mock";
};

export const realCrawlers: HealthPlanCrawler[] = [unimedCampinasCrawler];

export function listAdapters(): RegisteredAdapter[] {
  return [
    ...realCrawlers.map((c) => ({
      id: c.id,
      operator: c.operator,
      isMock: false,
      kind: "real" as const,
    })),
    ...mockCrawlers.map((c) => ({
      id: c.id,
      operator: c.operator,
      isMock: true,
      kind: "mock" as const,
    })),
  ];
}

export function getRealCrawler(id: string): HealthPlanCrawler | undefined {
  return realCrawlers.find((c) => c.id === id || c.operator.toLowerCase().includes(id.toLowerCase()));
}

export function getMockAdapter(id: string): HealthPlanProviderCrawler | undefined {
  return getMockCrawler(id);
}

export function isRealAdapter(id: string): boolean {
  return Boolean(getRealCrawler(id));
}
