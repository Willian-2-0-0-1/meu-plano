#!/usr/bin/env tsx
/**
 * Coleta controlada multi-especialidade (Campinas).
 * Rate limit entre especialidades; limites modestos.
 */
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env") });
if (process.env.VERCEL === "1" && !process.env.VERCEL_ENV) {
  delete process.env.VERCEL;
}

const SPECIALTIES = ["Dermatologia", "Pediatria", "Cardiologia"];
const LIMIT = Number(process.argv.find((a, i) => process.argv[i - 1] === "--limit") ?? 8);
const DELAY_MS = 1200;

async function main() {
  const { runCrawlerPipeline, applyMissesForRun } = await import("../../src/lib/crawler-pipeline");
  const summary: Array<Record<string, unknown>> = [];

  for (const specialty of SPECIALTIES) {
    console.log(`[batch] ${specialty} limit=${LIMIT}`);
    const run = await runCrawlerPipeline("unimed-campinas", {
      city: "Campinas",
      specialty,
      limit: LIMIT,
    });
    if (run?.id) await applyMissesForRun(run.id);
    summary.push({
      specialty,
      runId: run?.id,
      status: run?.status,
      found: run?.recordsFound,
      created: run?.recordsCreated,
      updated: run?.recordsUpdated,
      duplicated: run?.duplicatesDetected,
      durationMs: run?.durationMs,
    });
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log(JSON.stringify({ summary }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
