import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  freshnessLabel,
  normalizeSourceType,
  normalizeStatus,
} from "@/lib/plan-status-helpers";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDistance(km: number | null | undefined): string {
  if (km == null || Number.isNaN(km)) return "—";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace(".", ",")} km`;
}

export function formatRelativeDays(date: Date | string | null | undefined): string {
  return freshnessLabel(date);
}

export function sourceLabel(source: string): string {
  const t = normalizeSourceType(source);
  switch (t) {
    case "clinic":
      return "Confirmado pela clínica";
    case "community":
      return "Confirmado por usuários";
    case "operator":
      return "Rede da operadora";
    case "manual_admin":
      return "Cadastro manual";
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

export type ProvenanceBadge = {
  label: string;
  className: string;
  color: "green" | "blue" | "yellow" | "red" | "amber";
  emoji: string;
};

/** Proveniência visual da spec §8 */
export function statusBadge(status: string | null | undefined, source?: string | null): ProvenanceBadge {
  const s = normalizeStatus(status);
  const src = normalizeSourceType(source ?? undefined);

  if (s === "conflicting") {
    return {
      label: "INFORMAÇÕES CONFLITANTES",
      className: "bg-amber-50 text-amber-900 border-amber-300",
      color: "amber",
      emoji: "⚠️",
    };
  }

  if (s === "confirmed") {
    if (src === "clinic") {
      return {
        label: "CONFIRMADO PELA CLÍNICA",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
        color: "green",
        emoji: "🟢",
      };
    }
    if (src === "community") {
      return {
        label: "CONFIRMADO POR USUÁRIOS",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
        color: "green",
        emoji: "🟢",
      };
    }
    return {
      label: "ACEITA SEU PLANO",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      color: "green",
      emoji: "🟢",
    };
  }

  if (s === "listed") {
    return {
      label: "CONSTA NA REDE",
      className: "bg-sky-50 text-sky-800 border-sky-200",
      color: "blue",
      emoji: "🔵",
    };
  }

  if (s === "stale") {
    return {
      label: "NÃO VERIFICADA RECENTEMENTE",
      className: "bg-amber-50 text-amber-800 border-amber-200",
      color: "yellow",
      emoji: "🟡",
    };
  }

  if (s === "reported_not_accepting") {
    return {
      label: "RELATARAM QUE NÃO ACEITA",
      className: "bg-rose-50 text-rose-700 border-rose-200",
      color: "red",
      emoji: "🔴",
    };
  }

  if (s === "not_found") {
    return {
      label: "NÃO ENCONTRADO NA REDE",
      className: "bg-slate-50 text-slate-600 border-slate-200",
      color: "yellow",
      emoji: "🟡",
    };
  }

  return {
    label: "SEM INFO RECENTE",
    className: "bg-slate-50 text-slate-600 border-slate-200",
    color: "yellow",
    emoji: "🟡",
  };
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

export const REPORT_REASONS = [
  { id: "spam", label: "Spam" },
  { id: "ofensa", label: "Ofensa" },
  { id: "info_pessoal", label: "Informação pessoal" },
  { id: "info_medica", label: "Informação médica sensível" },
  { id: "falsa", label: "Informação falsa" },
  { id: "outro", label: "Outro" },
] as const;
