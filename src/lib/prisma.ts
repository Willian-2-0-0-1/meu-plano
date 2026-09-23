import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function databaseUrl() {
  const configuredUrl = process.env.DATABASE_URL;

  // Vercel: filesystem somente-leitura → copiar SQLite semeado para /tmp.
  // Atualiza /tmp quando o banco do build for mais recente (evita schema stale).
  if (process.env.VERCEL === "1" && configuredUrl?.startsWith("file:")) {
    const bundledDb = path.join(process.cwd(), "prisma", "dev.db");
    const runtimeDb = "/tmp/meu-plano.db";

    if (fs.existsSync(bundledDb)) {
      const needsCopy =
        !fs.existsSync(runtimeDb) ||
        fs.statSync(bundledDb).mtimeMs > fs.statSync(runtimeDb).mtimeMs;
      if (needsCopy) {
        fs.copyFileSync(bundledDb, runtimeDb);
      }
    }

    return `file:${runtimeDb}`;
  }

  if (configuredUrl?.startsWith("file:") && !configuredUrl.startsWith("file:/")) {
    const rel = configuredUrl.slice("file:".length);
    const abs = path.resolve(process.cwd(), rel);
    return `file:${abs}`;
  }

  return configuredUrl;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: databaseUrl() } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
