/**
 * Pipeline: crawler → raw → normalize → dedupe → provider → evidence → provider_plan → history
 * Nunca inserir resultado cru na tabela principal.
 */
import { prisma } from "@/lib/prisma";
import { upsertPlanStatus } from "@/lib/plan-status";
import { mockCrawlers, getCrawler as getMockCrawler } from "../../crawlers/adapters";
import { pickBestMatch, scoreDuplicate } from "../../crawlers/dedupe";
import { hashNormalizedProvider } from "../../crawlers/normalize";
import { getRealCrawler, isRealAdapter, listAdapters } from "../../crawlers/registry";
import type {
  CrawlerSearchInput,
  NormalizedCrawlerResult,
  NormalizedProviderResult,
} from "../../crawlers/types";
import { UNIMED_CAMPINAS } from "../../crawlers/unimed-campinas";

import { evaluateMiss, DEFAULT_MISS_THRESHOLD } from "../../crawlers/misses";

const MISS_THRESHOLD = Number(process.env.CRAWLER_MISS_THRESHOLD ?? DEFAULT_MISS_THRESHOLD);

export type PipelineStats = {
  found: number;
  created: number;
  updated: number;
  duplicated: number;
  unchanged: number;
  errors: string[];
};

function fullAddress(row: NormalizedProviderResult): string {
  return [row.address, row.addressNumber, row.complement].filter(Boolean).join(", ") || "Endereço não informado";
}

function legacyToNormalized(row: NormalizedCrawlerResult): NormalizedProviderResult {
  return {
    operator: row.operator,
    planName: row.plan_name,
    planAnsCode: row.plan_ans_code ?? null,
    providerName: row.provider_name,
    providerDocument: row.provider_document ?? null,
    specialty: row.specialty ?? null,
    service: row.service ?? null,
    address: row.address ?? null,
    city: row.city ?? "São Paulo",
    state: row.state ?? "SP",
    postalCode: row.postal_code ?? null,
    phone: row.phone ?? null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    sourceUrl: row.source_url ?? `https://mock.meuplano.local/${row.operator}`,
    collectedAt: row.collected_at,
  };
}

export async function findDuplicateProvider(
  row: NormalizedProviderResult
): Promise<{ match: ReturnType<typeof scoreDuplicate>; provider: { id: string } | null }> {
  const city = row.city || "São Paulo";
  const docDigits = row.providerDocument?.replace(/\D/g, "") ?? "";
  const orClause: Array<Record<string, unknown>> = [{ city }];
  if (docDigits.length >= 8) {
    orClause.push({ documentCnpj: { contains: docDigits.slice(0, 8) } });
  }
  if (docDigits.length >= 4 && row.providerDocument?.toUpperCase().includes("CRM")) {
    orClause.push({ documentCnpj: { contains: docDigits } });
  }
  if (row.cnes) {
    orClause.push({ documentCnes: row.cnes });
  }

  const candidates = await prisma.provider.findMany({
    where: { OR: orClause },
    take: 400,
  });

  const scored = candidates
    .map((c) => {
      const candOpId = c.documentCnpj?.toUpperCase().includes("CRM")
        ? `CRM:${c.documentCnpj.replace(/\D/g, "")}`
        : null;
      return scoreDuplicate(row, c, {
        operatorProviderId: row.operatorProviderId,
        candidateOperatorId: candOpId,
      });
    })
    .filter(Boolean) as NonNullable<ReturnType<typeof scoreDuplicate>>[];

  const best = pickBestMatch(scored);
  if (!best) return { match: null, provider: null };

  if (best.needsReview) {
    const similar = candidates.filter(
      (c) =>
        c.id !== best.providerId &&
        c.name.toLowerCase().includes(row.providerName.slice(0, 10).toLowerCase())
    );
    if (similar[0]) {
      const ids = [best.providerId, similar[0].id].sort();
      await prisma.providerDedupeReview.upsert({
        where: { providerAId_providerBId: { providerAId: ids[0]!, providerBId: ids[1]! } },
        create: {
          providerAId: ids[0]!,
          providerBId: ids[1]!,
          confidence: best.confidence,
          reason: best.reason,
          status: "pending",
        },
        update: { confidence: best.confidence, reason: best.reason },
      });
    }
  }

  return {
    match: best,
    provider: { id: best.providerId },
  };
}

async function ensurePlan(row: NormalizedProviderResult, isMock: boolean) {
  let plan =
    (row.planAnsCode
      ? await prisma.healthPlan.findFirst({
          where: { ansCode: row.planAnsCode, operator: row.operator },
        })
      : null) ||
    (await prisma.healthPlan.findFirst({
      where: { operator: row.operator, name: row.planName },
    }));
  if (!plan) {
    plan = await prisma.healthPlan.create({
      data: {
        operator: row.operator,
        name: row.planName,
        ansCode: row.planAnsCode ?? null,
        category: isMock ? "Importado (mock)" : "Importado (crawler)",
      },
    });
  } else if (row.planAnsCode && !plan.ansCode) {
    plan = await prisma.healthPlan.update({
      where: { id: plan.id },
      data: { ansCode: row.planAnsCode },
    });
  } else if (plan.name !== row.planName && row.planName) {
    // Mantém o nome canônico do seed se já existir com ANS
  }
  return plan;
}

async function linkSpecialty(providerId: string, specialtyName: string | null | undefined) {
  if (!specialtyName) return;
  const needle = specialtyName.trim();
  const all = await prisma.specialty.findMany();
  const spec =
    all.find((s) => s.name.toLowerCase() === needle.toLowerCase()) ||
    all.find(
      (s) =>
        s.name.toLowerCase().includes(needle.toLowerCase()) ||
        needle.toLowerCase().includes(s.name.toLowerCase()) ||
        s.keywords.toLowerCase().includes(needle.toLowerCase())
    );
  if (!spec) return;
  await prisma.providerSpecialty.upsert({
    where: { providerId_specialtyId: { providerId, specialtyId: spec.id } },
    create: { providerId, specialtyId: spec.id },
    update: {},
  });
}

export async function processNormalizedRow(opts: {
  row: NormalizedProviderResult;
  rawId: string;
  runId: string;
  isMock: boolean;
  contentHash: string;
}): Promise<"created" | "updated" | "duplicated" | "unchanged"> {
  const { row, rawId, runId, isMock, contentHash: hash } = opts;

  const { match, provider: existingRef } = await findDuplicateProvider(row);
  let provider =
    existingRef &&
    (await prisma.provider.findUnique({ where: { id: existingRef.id } }));

  let outcome: "created" | "updated" | "duplicated" | "unchanged" = "created";

  const lat =
    row.latitude ??
    (row.city?.toLowerCase().includes("campinas")
      ? UNIMED_CAMPINAS.cityCentroid.latitude
      : -23.55);
  const lng =
    row.longitude ??
    (row.city?.toLowerCase().includes("campinas")
      ? UNIMED_CAMPINAS.cityCentroid.longitude
      : -46.63);

  if (!provider) {
    provider = await prisma.provider.create({
      data: {
        name: row.providerName,
        type: "medico",
        description: isMock
          ? `[MOCK crawler] ${row.providerName} — dado fictício da operadora ${row.operator}.`
          : `Coletado do guia público ${row.operator}. Coordenadas aproximadas da cidade quando a fonte não informa lat/lng.`,
        photoUrl: `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(row.providerName)}`,
        documentCnpj: row.providerDocument ?? null,
        documentCnes: row.cnes ?? null,
        phone: row.phone ?? null,
        address: fullAddress(row),
        neighborhood: row.neighborhood ?? "Centro",
        city: row.city,
        state: row.state,
        cep: row.postalCode ?? null,
        latitude: lat,
        longitude: lng,
      },
    });
    outcome = "created";
  } else {
    outcome = match && !match.needsReview ? "duplicated" : "updated";
    const patch: Record<string, unknown> = {};
    if (row.providerDocument && !provider.documentCnpj) patch.documentCnpj = row.providerDocument;
    if (row.cnes && !provider.documentCnes) patch.documentCnes = row.cnes;
    if (row.phone && row.phone !== provider.phone) patch.phone = row.phone;
    if (row.postalCode && row.postalCode !== provider.cep) patch.cep = row.postalCode;
    if (Object.keys(patch).length) {
      provider = await prisma.provider.update({ where: { id: provider.id }, data: patch });
      outcome = "updated";
    } else {
      outcome = "duplicated";
    }
  }

  const plan = await ensurePlan(row, isMock);
  await linkSpecialty(provider.id, row.specialty);

  const existingPlan = await prisma.providerPlan.findUnique({
    where: {
      providerId_healthPlanId: { providerId: provider.id, healthPlanId: plan.id },
    },
  });

  // Content hash: sem mudança → sem histórico desnecessário
  const prevEvidence = await prisma.providerPlanEvidence.findFirst({
    where: { providerId: provider.id, healthPlanId: plan.id, contentHash: hash },
    orderBy: { collectedAt: "desc" },
  });

  if (prevEvidence && existingPlan) {
    await prisma.providerPlan.update({
      where: { id: existingPlan.id },
      data: {
        lastSeenAt: row.collectedAt,
        lastCheckedAt: row.collectedAt,
        consecutiveMisses: 0,
        status:
          existingPlan.status === "possibly_removed" ||
          existingPlan.status === "removed_from_operator_network"
            ? "listed"
            : existingPlan.status,
      },
    });
    await prisma.crawlerRawResult.update({ where: { id: rawId }, data: { processed: true } });
    return "unchanged";
  }

  const changedFields: string[] = [];
  if (existingPlan) {
    if (existingPlan.sourceUrl !== row.sourceUrl) changedFields.push("sourceUrl");
    if (row.phone && provider.phone && row.phone !== provider.phone) changedFields.push("phone");
  }

  await upsertPlanStatus({
    providerId: provider.id,
    healthPlanId: plan.id,
    status: "listed",
    sourceType: "operator",
    sourceUrl: row.sourceUrl,
    sourceName: isMock ? `Mock crawler ${row.operator}` : `Guia oficial ${row.operator}`,
    confidence: match?.confidence ?? 0.85,
    lastCheckedAt: row.collectedAt,
    notes: changedFields.length ? `Alterações: ${changedFields.join(", ")}` : null,
  });

  const link = await prisma.providerPlan.findUnique({
    where: {
      providerId_healthPlanId: { providerId: provider.id, healthPlanId: plan.id },
    },
  });

  if (link) {
    await prisma.providerPlan.update({
      where: { id: link.id },
      data: {
        firstSeenAt: link.firstSeenAt ?? row.collectedAt,
        lastSeenAt: row.collectedAt,
        consecutiveMisses: 0,
      },
    });
  }

  await prisma.providerPlanEvidence.create({
    data: {
      providerId: provider.id,
      healthPlanId: plan.id,
      providerPlanId: link?.id,
      sourceType: "operator",
      sourceUrl: row.sourceUrl,
      sourceName: isMock ? `Mock ${row.operator}` : row.operator,
      collectedAt: row.collectedAt,
      contentHash: hash,
      note: isMock ? "mock" : "operator_guide",
      crawlerRunId: runId,
      rawResultId: rawId,
    },
  });

  await prisma.crawlerRawResult.update({ where: { id: rawId }, data: { processed: true } });

  if (existingPlan && changedFields.length === 0 && outcome === "duplicated") {
    return "unchanged";
  }
  return outcome;
}

/** Compat: processa raw legado (MOCK). */
export async function processRawRow(rawId: string) {
  const raw = await prisma.crawlerRawResult.findUnique({ where: { id: rawId } });
  if (!raw || raw.processed) return null;

  const row: NormalizedProviderResult = {
    operator: raw.operator,
    planName: raw.planName,
    planAnsCode: raw.planAnsCode,
    providerName: raw.providerName,
    providerDocument: raw.providerDocument,
    specialty: raw.specialty,
    service: raw.service,
    address: raw.address,
    city: raw.city ?? "São Paulo",
    state: raw.state ?? "SP",
    postalCode: raw.postalCode,
    phone: raw.phone,
    latitude: raw.latitude,
    longitude: raw.longitude,
    sourceUrl: raw.sourceUrl ?? "",
    collectedAt: raw.collectedAt,
    neighborhood: raw.neighborhood,
    complement: raw.complement,
    addressNumber: raw.addressNumber,
    unitName: raw.unitName,
    operatorProviderId: raw.operatorProviderId,
  };

  const hash = raw.contentHash || hashNormalizedProvider(row);
  await processNormalizedRow({
    row,
    rawId,
    runId: raw.runId,
    isMock: true,
    contentHash: hash,
  });
  return { ok: true };
}

export async function runRealCrawlerPipeline(
  adapterId: string,
  input: CrawlerSearchInput = {}
) {
  const crawler = getRealCrawler(adapterId);
  if (!crawler) throw new Error(`Adapter real desconhecido: ${adapterId}`);

  const started = Date.now();
  const searchParams = {
    city: input.city ?? UNIMED_CAMPINAS.defaults.city,
    specialty: input.specialty ?? UNIMED_CAMPINAS.defaults.specialty,
    plan: input.plan ?? UNIMED_CAMPINAS.defaults.planName,
    planAnsCode: input.planAnsCode ?? UNIMED_CAMPINAS.defaults.planAnsCode,
    limit: input.limit ?? 8,
  };

  const run = await prisma.crawlerRun.create({
    data: {
      operator: crawler.operator,
      adapter: crawler.id,
      status: "running",
      isMock: false,
      note: "Execução REAL — guia público",
      searchParametersJson: JSON.stringify(searchParams),
    },
  });

  const stats: PipelineStats = {
    found: 0,
    created: 0,
    updated: 0,
    duplicated: 0,
    unchanged: 0,
    errors: [],
  };

  try {
    const rawResults = await crawler.search(searchParams);
    stats.found = rawResults.length;

    for (const raw of rawResults) {
      try {
        const normalized = await crawler.normalize(raw);
        if (!normalized) {
          stats.errors.push("normalize returned null");
          continue;
        }
        const hash = hashNormalizedProvider(normalized);
        const rawRow = await prisma.crawlerRawResult.create({
          data: {
            runId: run.id,
            operator: normalized.operator,
            planName: normalized.planName,
            planAnsCode: normalized.planAnsCode ?? null,
            providerName: normalized.providerName,
            providerDocument: normalized.providerDocument ?? null,
            specialty: normalized.specialty ?? null,
            service: normalized.service ?? null,
            address: normalized.address ?? null,
            city: normalized.city,
            state: normalized.state,
            postalCode: normalized.postalCode ?? null,
            phone: normalized.phone ?? null,
            latitude: normalized.latitude ?? null,
            longitude: normalized.longitude ?? null,
            sourceUrl: normalized.sourceUrl,
            collectedAt: normalized.collectedAt,
            requestPayloadJson: JSON.stringify(raw.requestPayload),
            rawPayloadJson: JSON.stringify(raw.rawPayload),
            payloadJson: JSON.stringify(normalized),
            httpStatus: raw.httpStatus ?? null,
            contentHash: hash,
            unitName: normalized.unitName ?? null,
            neighborhood: normalized.neighborhood ?? null,
            complement: normalized.complement ?? null,
            addressNumber: normalized.addressNumber ?? null,
            operatorProviderId: normalized.operatorProviderId ?? null,
          },
        });

        const outcome = await processNormalizedRow({
          row: normalized,
          rawId: rawRow.id,
          runId: run.id,
          isMock: false,
          contentHash: hash,
        });
        if (outcome === "created") stats.created += 1;
        else if (outcome === "updated") stats.updated += 1;
        else if (outcome === "duplicated" || outcome === "unchanged") stats.duplicated += 1;
        if (outcome === "unchanged") stats.unchanged += 1;
      } catch (e) {
        stats.errors.push((e as Error).message);
      }
    }

    const status =
      stats.errors.length && stats.created + stats.updated + stats.duplicated + stats.unchanged === 0
        ? "failed"
        : stats.errors.length
          ? "partial"
          : "completed";

    await prisma.crawlerRun.update({
      where: { id: run.id },
      data: {
        status,
        finishedAt: new Date(),
        rawCount: stats.found,
        upserted: stats.created + stats.updated,
        recordsFound: stats.found,
        recordsCreated: stats.created,
        recordsUpdated: stats.updated,
        duplicatesDetected: stats.duplicated,
        errorsCount: stats.errors.length,
        durationMs: Date.now() - started,
        errorsJson: JSON.stringify(stats.errors),
        errorSummary: stats.errors.slice(0, 3).join("; ") || null,
      },
    });
  } catch (e) {
    await prisma.crawlerRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        durationMs: Date.now() - started,
        errorsCount: 1,
        errorsJson: JSON.stringify([(e as Error).message]),
        errorSummary: (e as Error).message,
      },
    });
    throw e;
  }

  return prisma.crawlerRun.findUnique({
    where: { id: run.id },
    include: { rawResults: true },
  });
}

export async function runMockCrawlerPipeline(adapterId: string) {
  const crawler = getMockCrawler(adapterId);
  if (!crawler) throw new Error(`Adapter mock desconhecido: ${adapterId}`);

  const started = Date.now();
  const run = await prisma.crawlerRun.create({
    data: {
      operator: crawler.operator,
      adapter: crawler.id,
      status: "running",
      isMock: true,
      note: "Execução MOCK — dados fictícios",
      searchParametersJson: JSON.stringify({ mock: true }),
    },
  });

  const errors: string[] = [];
  let created = 0;
  let updated = 0;
  let duplicated = 0;
  let unchanged = 0;

  try {
    const results = await crawler.crawl();
    for (const legacy of results) {
      const row = legacyToNormalized(legacy);
      const hash = hashNormalizedProvider(row);
      const raw = await prisma.crawlerRawResult.create({
        data: {
          runId: run.id,
          operator: row.operator,
          planName: row.planName,
          planAnsCode: row.planAnsCode ?? null,
          providerName: row.providerName,
          providerDocument: row.providerDocument ?? null,
          specialty: row.specialty ?? null,
          service: row.service ?? null,
          address: row.address ?? null,
          city: row.city,
          state: row.state,
          postalCode: row.postalCode ?? null,
          phone: row.phone ?? null,
          latitude: row.latitude ?? null,
          longitude: row.longitude ?? null,
          sourceUrl: row.sourceUrl,
          collectedAt: row.collectedAt,
          payloadJson: JSON.stringify(legacy),
          rawPayloadJson: JSON.stringify(legacy),
          requestPayloadJson: JSON.stringify({ mock: true }),
          contentHash: hash,
          httpStatus: 200,
        },
      });
      try {
        const outcome = await processNormalizedRow({
          row,
          rawId: raw.id,
          runId: run.id,
          isMock: true,
          contentHash: hash,
        });
        if (outcome === "created") created += 1;
        else if (outcome === "updated") updated += 1;
        else if (outcome === "duplicated" || outcome === "unchanged") duplicated += 1;
        if (outcome === "unchanged") unchanged += 1;
      } catch (e) {
        errors.push(`${row.providerName}: ${(e as Error).message}`);
      }
    }

    await prisma.crawlerRun.update({
      where: { id: run.id },
      data: {
        status: errors.length && created + updated === 0 ? "failed" : "completed",
        finishedAt: new Date(),
        rawCount: results.length,
        upserted: created + updated,
        recordsFound: results.length,
        recordsCreated: created,
        recordsUpdated: updated,
        duplicatesDetected: duplicated,
        errorsCount: errors.length,
        durationMs: Date.now() - started,
        errorsJson: JSON.stringify(errors),
      },
    });
  } catch (e) {
    await prisma.crawlerRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        errorsJson: JSON.stringify([(e as Error).message]),
        errorSummary: (e as Error).message,
        durationMs: Date.now() - started,
      },
    });
    throw e;
  }

  return prisma.crawlerRun.findUnique({
    where: { id: run.id },
    include: { rawResults: true },
  });
}

/** Entrada unificada usada pelo admin / worker. */
export async function runCrawlerPipeline(
  adapterId: string,
  input: CrawlerSearchInput = {}
) {
  if (isRealAdapter(adapterId)) {
    return runRealCrawlerPipeline(adapterId, input);
  }
  return runMockCrawlerPipeline(adapterId);
}

export async function runAllMockCrawlers() {
  const out = [];
  for (const c of mockCrawlers) {
    out.push(await runMockCrawlerPipeline(c.id));
  }
  return out;
}

export async function enqueueCrawlerJob(
  adapter: string,
  params: CrawlerSearchInput = {}
) {
  return prisma.crawlerJob.create({
    data: {
      adapter,
      status: "queued",
      paramsJson: JSON.stringify(params),
    },
  });
}

export async function processNextCrawlerJob() {
  const job = await prisma.crawlerJob.findFirst({
    where: { status: "queued" },
    orderBy: { createdAt: "asc" },
  });
  if (!job) return null;

  await prisma.crawlerJob.update({
    where: { id: job.id },
    data: { status: "running", startedAt: new Date() },
  });

  try {
    const params = JSON.parse(job.paramsJson || "{}") as CrawlerSearchInput;
    const run = await runCrawlerPipeline(job.adapter, params);
    await prisma.crawlerJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        finishedAt: new Date(),
        runId: run?.id,
      },
    });
    return { jobId: job.id, run };
  } catch (e) {
    await prisma.crawlerJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        error: (e as Error).message,
      },
    });
    throw e;
  }
}

/**
 * Após um run completo, incrementa misses de vínculos da mesma operadora/plano
 * que não foram vistos. Só marca possibly_removed após MISS_THRESHOLD.
 * Runs limitadas (teste) NÃO aplicam misses.
 */
export async function applyMissesForRun(runId: string) {
  const run = await prisma.crawlerRun.findUnique({
    where: { id: runId },
    include: { rawResults: true },
  });
  if (!run || run.isMock) return { skipped: true, reason: "mock_or_missing" };
  if (run.status !== "completed") return { skipped: true, reason: "not_completed" };

  const params = JSON.parse(run.searchParametersJson || "{}") as { limit?: number };
  const planNames = [...new Set(run.rawResults.map((r) => r.planName))];
  let updated = 0;
  let skippedLimited = 0;

  for (const planName of planNames) {
    const plan = await prisma.healthPlan.findFirst({
      where: { operator: run.operator, name: planName },
    });
    if (!plan) continue;

    const seenProviderDocs = new Set(
      run.rawResults.map((r) => r.providerDocument).filter(Boolean) as string[]
    );

    const links = await prisma.providerPlan.findMany({
      where: { healthPlanId: plan.id, sourceType: "operator" },
      include: { provider: true },
    });

    for (const link of links) {
      const doc = link.provider.documentCnpj;
      const seen = Boolean(doc && seenProviderDocs.has(doc));
      const decision = evaluateMiss({
        seenInRun: seen,
        limit: params.limit,
        consecutiveMisses: link.consecutiveMisses,
        currentStatus: link.status,
        missThreshold: MISS_THRESHOLD,
      });
      if (!decision.apply) {
        if (decision.reason === "limited_run") skippedLimited += 1;
        continue;
      }
      await prisma.providerPlan.update({
        where: { id: link.id },
        data: {
          consecutiveMisses: decision.nextMisses!,
          status: decision.nextStatus!,
          lastCheckedAt: new Date(),
        },
      });
      updated += 1;
    }
  }

  return { skipped: false, updated, skippedLimited };
}

export { listAdapters, mockCrawlers as crawlers };
