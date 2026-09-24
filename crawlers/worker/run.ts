#!/usr/bin/env tsx
/**
 * Worker separado do Next.js — processa a fila CrawlerJob ou roda um adapter direto.
 *
 * Uso:
 *   npx tsx crawlers/worker/run.ts --once
 *   npx tsx crawlers/worker/run.ts --adapter unimed-campinas --limit 8
 *   npx tsx crawlers/worker/run.ts --poll 5000
 */
import { config } from "dotenv";
import { resolve } from "node:path";

// Carregar .env ANTES de importar Prisma (imports ESM são avaliados em ordem neste arquivo).
config({ path: resolve(process.cwd(), ".env") });
// Ambiente local herdando VERCEL=1 redireciona SQLite para /tmp — não queremos isso no worker.
if (process.env.VERCEL === "1" && !process.env.VERCEL_ENV) {
  delete process.env.VERCEL;
}

async function main() {
  const { applyMissesForRun, processNextCrawlerJob, runCrawlerPipeline } = await import(
    "../../src/lib/crawler-pipeline"
  );

  function arg(name: string): string | undefined {
    const idx = process.argv.indexOf(`--${name}`);
    if (idx === -1) return undefined;
    return process.argv[idx + 1];
  }

  function hasFlag(name: string): boolean {
    return process.argv.includes(`--${name}`);
  }

  const adapter = arg("adapter");
  const once = hasFlag("once");
  const pollMs = Number(arg("poll") ?? 0);

  if (adapter) {
    const input = {
      city: arg("city"),
      specialty: arg("specialty"),
      plan: arg("plan"),
      planAnsCode: arg("plan-ans"),
      limit: arg("limit") ? Number(arg("limit")) : 8,
    };
    console.log("[worker] run direto", adapter, input);
    console.log("[worker] DATABASE_URL", process.env.DATABASE_URL);
    const run = await runCrawlerPipeline(adapter, input);
    if (run?.id) await applyMissesForRun(run.id);
    console.log(
      JSON.stringify(
        {
          runId: run?.id,
          status: run?.status,
          found: run?.recordsFound,
          created: run?.recordsCreated,
          updated: run?.recordsUpdated,
          duplicated: run?.duplicatesDetected,
          durationMs: run?.durationMs,
          errors: run?.errorsJson,
          sample: run?.rawResults?.slice(0, 2).map((r) => ({
            name: r.providerName,
            city: r.city,
            phone: r.phone,
            hash: r.contentHash,
            sourceUrl: r.sourceUrl,
          })),
        },
        null,
        2
      )
    );
    return;
  }

  async function tick() {
    const result = await processNextCrawlerJob();
    if (!result) {
      console.log("[worker] fila vazia");
      return false;
    }
    if (result.run?.id) await applyMissesForRun(result.run.id);
    console.log("[worker] job", result.jobId, "→ run", result.run?.id, result.run?.status);
    return true;
  }

  if (once || !pollMs) {
    await tick();
    return;
  }

  console.log(`[worker] polling a cada ${pollMs}ms`);
  for (;;) {
    try {
      await tick();
    } catch (e) {
      console.error("[worker] erro", (e as Error).message);
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
