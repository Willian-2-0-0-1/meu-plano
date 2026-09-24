"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

type Props = {
  operator?: string | null;
  planName?: string | null;
  sourceUrl?: string | null;
  collectedAt?: string | Date | null;
  sourceLabel?: string | null;
};

/** UI mínima de rastreabilidade — sem payload técnico. */
export function SourceOriginLink({
  operator,
  planName,
  sourceUrl,
  collectedAt,
  sourceLabel = "Fonte oficial",
}: Props) {
  const [open, setOpen] = useState(false);
  if (!sourceUrl && !operator) return null;

  const when = collectedAt
    ? new Date(collectedAt).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-semibold text-brand-700 underline-offset-2 hover:underline"
      >
        Ver origem
      </button>
      {open && (
        <span className="absolute z-20 mt-8 max-w-xs rounded-xl border border-slate-200 bg-white p-3 text-left text-xs text-slate-700 shadow-lg">
          <p className="font-semibold text-slate-900">{sourceLabel}</p>
          {operator && <p className="mt-1">Operadora: {operator}</p>}
          {planName && <p>Plano: {planName}</p>}
          {when && <p>Coletado em: {when}</p>}
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 font-medium text-brand-700 underline"
            >
              Abrir fonte <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <button
            type="button"
            className="mt-2 block text-[11px] text-slate-400"
            onClick={() => setOpen(false)}
          >
            Fechar
          </button>
        </span>
      )}
    </span>
  );
}
