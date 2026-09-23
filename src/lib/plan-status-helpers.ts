/** Helpers puros de proveniência — sem Prisma (seguro para client components) */

export type PlanStatus =
  | "confirmed"
  | "listed"
  | "reported_not_accepting"
  | "not_found"
  | "conflicting"
  | "stale"
  | "unconfirmed"
  | "not_accepted";

export type SourceType = "operator" | "clinic" | "community" | "manual_admin";

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
