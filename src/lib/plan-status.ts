import { prisma } from "@/lib/prisma";

export type PlanStatus =
  | "confirmed"
  | "listed"
  | "reported_not_accepting"
  | "not_found"
  | "conflicting"
  | "stale"
  // legado
  | "unconfirmed"
  | "not_accepted";

export type SourceType = "operator" | "clinic" | "community" | "manual_admin";

/** Normaliza status legado → novo */
export function normalizeStatus(status: string | null | undefined): PlanStatus | null {
  if (!status) return null;
  if (status === "unconfirmed") return "listed";
  if (status === "not_accepted") return "reported_not_accepting";
  return status as PlanStatus;
}

export function normalizeSourceType(source: string | null | undefined): SourceType {
  if (source === "user" || source === "community") return "community";
  if (source === "clinic") return "clinic";
  if (source === "manual_admin") return "manual_admin";
  return "operator";
}

const OFFICIAL = new Set(["operator", "clinic", "manual_admin"]);
const COMMUNITY = new Set(["community"]);

function sourcesConflict(
  existingStatus: string,
  existingSource: string,
  incomingStatus: string,
  incomingSource: string
): boolean {
  const a = normalizeStatus(existingStatus);
  const b = normalizeStatus(incomingStatus);
  if (!a || !b || a === b) return false;

  const acceptA = a === "confirmed" || a === "listed";
  const denyA = a === "reported_not_accepting" || a === "not_found";
  const acceptB = b === "confirmed" || b === "listed";
  const denyB = b === "reported_not_accepting" || b === "not_found";

  const differentCamps =
    (OFFICIAL.has(normalizeSourceType(existingSource)) &&
      COMMUNITY.has(normalizeSourceType(incomingSource))) ||
    (COMMUNITY.has(normalizeSourceType(existingSource)) &&
      OFFICIAL.has(normalizeSourceType(incomingSource)));

  return differentCamps && ((acceptA && denyB) || (denyA && acceptB));
}

export type UpsertPlanStatusInput = {
  providerId: string;
  healthPlanId: string;
  status: PlanStatus;
  sourceType: SourceType;
  sourceUrl?: string | null;
  sourceName?: string | null;
  confidence?: number;
  lastCheckedAt?: Date;
  notes?: string | null;
  /** Se true, força update mesmo em conflito (admin) */
  force?: boolean;
};

/**
 * Atualiza provider_plan_status sem sobrescrever silenciosamente.
 * Em conflito entre fontes oficiais e comunidade → marca conflicting e grava histórico.
 */
export async function upsertPlanStatus(input: UpsertPlanStatusInput) {
  const existing = await prisma.providerPlan.findUnique({
    where: {
      providerId_healthPlanId: {
        providerId: input.providerId,
        healthPlanId: input.healthPlanId,
      },
    },
  });

  const previousStatus = existing?.status ?? null;
  const existingSource = existing?.sourceType || existing?.source || "operator";
  let nextStatus: PlanStatus = normalizeStatus(input.status) ?? "listed";
  let conflict = false;

  if (
    existing &&
    !input.force &&
    sourcesConflict(existing.status, existingSource, input.status, input.sourceType)
  ) {
    nextStatus = "conflicting";
    conflict = true;
  }

  const checkedAt = input.lastCheckedAt ?? new Date();
  const isPositive = nextStatus === "confirmed";

  const record = await prisma.providerPlan.upsert({
    where: {
      providerId_healthPlanId: {
        providerId: input.providerId,
        healthPlanId: input.healthPlanId,
      },
    },
    create: {
      providerId: input.providerId,
      healthPlanId: input.healthPlanId,
      status: nextStatus,
      sourceType: input.sourceType,
      source: input.sourceType === "community" ? "user" : input.sourceType,
      sourceUrl: input.sourceUrl ?? null,
      sourceName: input.sourceName ?? null,
      confidence: input.confidence ?? 0.5,
      lastCheckedAt: checkedAt,
      lastVerifiedAt: isPositive ? checkedAt : null,
      notes: input.notes ?? null,
    },
    update: {
      status: nextStatus,
      sourceType: conflict ? existingSource : input.sourceType,
      source: conflict
        ? existingSource === "community"
          ? "user"
          : existingSource
        : input.sourceType === "community"
          ? "user"
          : input.sourceType,
      sourceUrl: input.sourceUrl ?? undefined,
      sourceName: input.sourceName ?? undefined,
      confidence: input.confidence ?? undefined,
      lastCheckedAt: checkedAt,
      lastVerifiedAt: isPositive ? checkedAt : existing?.lastVerifiedAt,
      notes: conflict
        ? `Conflito: ${existingSource}/${previousStatus} vs ${input.sourceType}/${input.status}`
        : input.notes ?? undefined,
    },
  });

  if (previousStatus !== nextStatus) {
    await prisma.providerPlanHistory.create({
      data: {
        providerId: input.providerId,
        healthPlanId: input.healthPlanId,
        previousStatus,
        newStatus: nextStatus,
        sourceType: input.sourceType,
        sourceUrl: input.sourceUrl ?? null,
        observedAt: checkedAt,
        note: conflict
          ? `Conflito detectado entre ${existingSource} e ${input.sourceType}`
          : null,
      },
    });
  }

  return { record, conflict, previousStatus, nextStatus };
}

export function freshnessLabel(date: Date | string | null | undefined): string {
  if (!date) return "Sem data de verificação";
  const d = typeof date === "string" ? new Date(date) : date;
  const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Atualizado hoje";
  if (days === 1) return "Confirmado há 1 dia";
  if (days < 30) return `Confirmado há ${days} dias`;
  return `Informação de ${days} dias atrás`;
}

export function isStale(date: Date | string | null | undefined, thresholdDays = 45): boolean {
  if (!date) return true;
  const d = typeof date === "string" ? new Date(date) : date;
  const days = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
  return days > thresholdDays;
}
