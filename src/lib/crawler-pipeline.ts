/**
 * Pipeline: crawler → raw → normalização → deduplicação → provider → provider_plan_status → histórico
 */
import { prisma } from "@/lib/prisma";
import { upsertPlanStatus } from "@/lib/plan-status";
import { getCrawler, crawlers } from "../../crawlers/adapters";
import type { NormalizedCrawlerResult } from "../../crawlers/types";

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeDoc(doc: string | null | undefined): string | null {
  if (!doc) return null;
  return doc.replace(/\D/g, "") || null;
}

export async function findDuplicateProvider(row: NormalizedCrawlerResult) {
  const doc = normalizeDoc(row.provider_document);
  if (doc) {
    const byDoc = await prisma.provider.findFirst({
      where: {
        OR: [{ documentCnpj: { contains: doc.slice(0, 8) } }, { documentCnes: doc }],
      },
    });
    if (byDoc) return byDoc;
  }

  const nameKey = normalizeName(row.provider_name);
  const candidates = await prisma.provider.findMany({
    where: { city: row.city ?? "São Paulo" },
  });

  return (
    candidates.find((p) => {
      const sameName = normalizeName(p.name) === nameKey;
      const sameCep =
        row.postal_code && p.cep
          ? p.cep.replace(/\D/g, "") === row.postal_code.replace(/\D/g, "")
          : false;
      const samePhone =
        row.phone && p.phone
          ? p.phone.replace(/\D/g, "").endsWith(row.phone.replace(/\D/g, "").slice(-8))
          : false;
      const sameCoords =
        row.latitude != null &&
        row.longitude != null &&
        Math.abs(p.latitude - row.latitude) < 0.001 &&
        Math.abs(p.longitude - row.longitude) < 0.001;
      const sameAddress =
        row.address &&
        normalizeName(p.address).includes(normalizeName(row.address).slice(0, 20));

      return sameName && (sameCep || samePhone || sameCoords || sameAddress);
    }) ?? null
  );
}

export async function processRawRow(rawId: string) {
  const raw = await prisma.crawlerRawResult.findUnique({ where: { id: rawId } });
  if (!raw || raw.processed) return null;

  const row: NormalizedCrawlerResult = {
    operator: raw.operator,
    plan_name: raw.planName,
    plan_ans_code: raw.planAnsCode,
    provider_name: raw.providerName,
    provider_document: raw.providerDocument,
    specialty: raw.specialty,
    service: raw.service,
    address: raw.address,
    city: raw.city,
    state: raw.state,
    postal_code: raw.postalCode,
    phone: raw.phone,
    latitude: raw.latitude,
    longitude: raw.longitude,
    source_url: raw.sourceUrl,
    collected_at: raw.collectedAt,
  };

  let provider = await findDuplicateProvider(row);

  if (!provider) {
    provider = await prisma.provider.create({
      data: {
        name: row.provider_name,
        type: "clinica",
        description: `[MOCK crawler] ${row.provider_name} — dado fictício da operadora ${row.operator}.`,
        photoUrl: `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(row.provider_name)}`,
        documentCnpj: row.provider_document ?? null,
        phone: row.phone ?? null,
        address: row.address ?? "Endereço não informado",
        neighborhood: "Centro",
        city: row.city ?? "São Paulo",
        state: row.state ?? "SP",
        cep: row.postal_code ?? null,
        latitude: row.latitude ?? -23.55,
        longitude: row.longitude ?? -46.63,
      },
    });
  } else if (row.provider_document && !provider.documentCnpj) {
    await prisma.provider.update({
      where: { id: provider.id },
      data: { documentCnpj: row.provider_document },
    });
  }

  let plan = await prisma.healthPlan.findFirst({
    where: { operator: row.operator, name: row.plan_name },
  });
  if (!plan) {
    plan = await prisma.healthPlan.create({
      data: {
        operator: row.operator,
        name: row.plan_name,
        ansCode: row.plan_ans_code ?? null,
        category: "Importado (mock)",
      },
    });
  }

  if (row.specialty) {
    const spec = await prisma.specialty.findFirst({
      where: { name: { contains: row.specialty } },
    });
    if (spec) {
      await prisma.providerSpecialty.upsert({
        where: {
          providerId_specialtyId: { providerId: provider.id, specialtyId: spec.id },
        },
        create: { providerId: provider.id, specialtyId: spec.id },
        update: {},
      });
    }
  }

  await upsertPlanStatus({
    providerId: provider.id,
    healthPlanId: plan.id,
    status: "listed",
    sourceType: "operator",
    sourceUrl: row.source_url,
    sourceName: `Mock crawler ${row.operator}`,
    confidence: 0.7,
    lastCheckedAt: row.collected_at,
  });

  await prisma.crawlerRawResult.update({
    where: { id: rawId },
    data: { processed: true },
  });

  return { providerId: provider.id, healthPlanId: plan.id };
}

export async function runCrawlerPipeline(adapterId: string) {
  const crawler = getCrawler(adapterId);
  if (!crawler) throw new Error(`Adapter desconhecido: ${adapterId}`);

  const run = await prisma.crawlerRun.create({
    data: {
      operator: crawler.operator,
      adapter: crawler.id,
      status: "running",
      note: "Execução MOCK — dados fictícios",
    },
  });

  const errors: string[] = [];
  let upserted = 0;

  try {
    const results = await crawler.crawl();

    for (const row of results) {
      const raw = await prisma.crawlerRawResult.create({
        data: {
          runId: run.id,
          operator: row.operator,
          planName: row.plan_name,
          planAnsCode: row.plan_ans_code ?? null,
          providerName: row.provider_name,
          providerDocument: row.provider_document ?? null,
          specialty: row.specialty ?? null,
          service: row.service ?? null,
          address: row.address ?? null,
          city: row.city ?? null,
          state: row.state ?? null,
          postalCode: row.postal_code ?? null,
          phone: row.phone ?? null,
          latitude: row.latitude ?? null,
          longitude: row.longitude ?? null,
          sourceUrl: row.source_url ?? null,
          collectedAt: row.collected_at,
          payloadJson: JSON.stringify({
            ...row,
            collected_at: row.collected_at.toISOString(),
          }),
        },
      });

      try {
        await processRawRow(raw.id);
        upserted += 1;
      } catch (e) {
        errors.push(`${row.provider_name}: ${(e as Error).message}`);
      }
    }

    await prisma.crawlerRun.update({
      where: { id: run.id },
      data: {
        status: errors.length && upserted === 0 ? "failed" : "success",
        finishedAt: new Date(),
        rawCount: results.length,
        upserted,
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
      },
    });
    throw e;
  }

  return prisma.crawlerRun.findUnique({
    where: { id: run.id },
    include: { rawResults: true },
  });
}

export async function runAllMockCrawlers() {
  const out = [];
  for (const c of crawlers) {
    out.push(await runCrawlerPipeline(c.id));
  }
  return out;
}

export { crawlers };
