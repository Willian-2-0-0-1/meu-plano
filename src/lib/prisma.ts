import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function databaseUrl() {
  const configuredUrl = process.env.DATABASE_URL;

  // Vercel executa as funções em um filesystem somente-leitura. O MVP usa
  // SQLite, então copiamos o banco semeado para /tmp, que é gravável durante
  // a vida da instância da função.
  if (process.env.VERCEL === "1" && configuredUrl?.startsWith("file:")) {
    const bundledDb = path.join(process.cwd(), "prisma", "dev.db");
    const runtimeDb = "/tmp/meu-plano.db";

    if (!fs.existsSync(runtimeDb)) {
      fs.copyFileSync(bundledDb, runtimeDb);
    }

    return `file:${runtimeDb}`;
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
