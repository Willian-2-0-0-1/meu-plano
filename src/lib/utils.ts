import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDistance(km: number | null | undefined): string {
  if (km == null || Number.isNaN(km)) return "—";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace(".", ",")} km`;
}

export function formatRelativeDays(date: Date | string | null | undefined): string {
  if (!date) return "Sem confirmação recente";
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Confirmado hoje";
  if (days === 1) return "Confirmado há 1 dia";
  if (days < 30) return `Confirmado há ${days} dias`;
  const months = Math.floor(days / 30);
  if (months === 1) return "Confirmado há 1 mês";
  return `Confirmado há ${months} meses`;
}

export function sourceLabel(source: string): string {
  switch (source) {
    case "clinic":
      return "Confirmado pela clínica";
    case "user":
      return "Confirmado por usuários";
    case "operator":
      return "Rede da operadora";
    default:
      return "Fonte desconhecida";
  }
}

export function providerTypeLabel(type: string): string {
  const map: Record<string, string> = {
    medico: "Médico",
    clinica: "Clínica",
    laboratorio: "Laboratório",
    hospital: "Hospital",
    pronto_atendimento: "Pronto atendimento",
    terapia: "Terapia",
  };
  return map[type] ?? type;
}

export function statusBadge(status: string) {
  switch (status) {
    case "confirmed":
      return {
        label: "ACEITA SEU PLANO",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
        color: "green" as const,
      };
    case "unconfirmed":
      return {
        label: "PRECISA CONFIRMAR",
        className: "bg-amber-50 text-amber-800 border-amber-200",
        color: "yellow" as const,
      };
    case "not_accepted":
      return {
        label: "NÃO ACEITA",
        className: "bg-rose-50 text-rose-700 border-rose-200",
        color: "red" as const,
      };
    default:
      return {
        label: "SEM INFO",
        className: "bg-slate-50 text-slate-600 border-slate-200",
        color: "yellow" as const,
      };
  }
}

export const OPERATORS = [
  "Unimed",
  "Bradesco Saúde",
  "SulAmérica",
  "Amil",
  "NotreDame Intermédica",
  "Porto Saúde",
  "Hapvida",
] as const;

export const SHORTCUTS = [
  { label: "Médicos", query: "médico", type: "medico", icon: "Stethoscope" },
  { label: "Exames", query: "exame", type: "exame", icon: "FlaskConical" },
  { label: "Laboratórios", query: "laboratório", type: "laboratorio", icon: "Microscope" },
  { label: "Hospitais", query: "hospital", type: "hospital", icon: "Hospital" },
  { label: "Pronto atendimento", query: "pronto atendimento", type: "pronto_atendimento", icon: "Ambulance" },
  { label: "Terapias", query: "terapia", type: "terapia", icon: "HeartPulse" },
] as const;
