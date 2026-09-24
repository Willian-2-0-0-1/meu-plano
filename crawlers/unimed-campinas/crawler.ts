import type { CrawlerSearchInput, HealthPlanCrawler, NormalizedProviderResult, RawProviderResult } from "../types";
import { UnimedCampinasClient } from "./client";
import { normalizeUnimedCampinas, toRawProviderResult } from "./normalizer";
import { parseResultsHtml } from "./parser";
import { UNIMED_CAMPINAS } from "./types";

function resolveSpecialtyId(
  specialties: Array<{ IdEspecialidade: number; NomeEspecialidade: string }>,
  wanted: string
): string {
  const norm = wanted.trim().toLowerCase();
  const hit =
    specialties.find((s) => s.NomeEspecialidade.toLowerCase() === norm) ||
    specialties.find((s) => s.NomeEspecialidade.toLowerCase().includes(norm));
  if (hit) return String(hit.IdEspecialidade);
  if (norm.includes("dermat")) return UNIMED_CAMPINAS.defaults.specialtyId;
  throw new Error(`Especialidade não encontrada no guia Unimed Campinas: ${wanted}`);
}

export class UnimedCampinasCrawler implements HealthPlanCrawler {
  readonly id = UNIMED_CAMPINAS.id;
  readonly operator = UNIMED_CAMPINAS.operator;
  readonly isMock = false;

  private client = new UnimedCampinasClient();
  private lastPlanName: string = UNIMED_CAMPINAS.defaults.planName;
  private lastPlanAns: string | null = UNIMED_CAMPINAS.defaults.planAnsCode;

  async search(input: CrawlerSearchInput = {}): Promise<RawProviderResult[]> {
    const city = input.city ?? UNIMED_CAMPINAS.defaults.city;
    const specialtyName = input.specialty ?? UNIMED_CAMPINAS.defaults.specialty;
    const limit = input.limit ?? 8;

    this.lastPlanName = input.plan ?? UNIMED_CAMPINAS.defaults.planName;
    this.lastPlanAns = input.planAnsCode ?? UNIMED_CAMPINAS.defaults.planAnsCode;

    // Cidade: por enquanto só Campinas (id conhecido no guia público).
    if (!city.toLowerCase().includes("campinas")) {
      throw new Error(
        `Unimed Campinas MVP: cidade suportada no teste real é Campinas (recebido: ${city})`
      );
    }

    await this.client.warmSession();
    const specialties = await this.client.listSpecialties();
    const especialidadeId = resolveSpecialtyId(specialties, specialtyName);

    const { html, finalUrl, httpStatus, request } = await this.client.searchResultsHtml({
      especialidadeId,
      cidadeId: UNIMED_CAMPINAS.defaults.cityId,
      planoId: UNIMED_CAMPINAS.defaults.planId,
    });

    if (httpStatus >= 400) {
      throw new Error(`Unimed Campinas busca HTTP ${httpStatus}`);
    }

    const items = parseResultsHtml(html, {
      sourceUrl: finalUrl,
      request: {
        ...request,
        planName: this.lastPlanName,
        planAnsCode: this.lastPlanAns,
        specialtyName,
        city,
        limit,
      },
      httpStatus,
    });

    return items.slice(0, limit).map(toRawProviderResult);
  }

  async normalize(result: RawProviderResult): Promise<NormalizedProviderResult | null> {
    return normalizeUnimedCampinas(result, {
      planName: this.lastPlanName,
      planAnsCode: this.lastPlanAns,
    });
  }
}

export const unimedCampinasCrawler = new UnimedCampinasCrawler();
