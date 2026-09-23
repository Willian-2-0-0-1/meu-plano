import {
  cn,
  formatDistance,
  formatRelativeDays,
  statusBadge,
  sourceLabel,
} from "@/lib/utils";
import { MapPin, Star, MessageCircle } from "lucide-react";

export type ProviderCardData = {
  id: string;
  name: string;
  specialties?: string[];
  distanceKm?: number | null;
  rating: number;
  planName?: string | null;
  planStatus?: string | null;
  planSource?: string | null;
  lastVerifiedAt?: string | Date | null;
  whatsapp?: string | null;
  neighborhood?: string;
};

type Props = {
  provider: ProviderCardData;
  showRequestConfirm?: boolean;
  onWhatsApp?: () => void;
  onRequestConfirm?: () => void;
};

/** Card 100% server-friendly (links <a> nativos) */
export function ProviderCard({
  provider,
  showRequestConfirm,
  onWhatsApp,
  onRequestConfirm,
}: Props) {
  const badge = statusBadge(provider.planStatus ?? "unconfirmed");
  const wa = provider.whatsapp
    ? `https://wa.me/${provider.whatsapp}?text=${encodeURIComponent(
        `Olá! Encontrei vocês no Meu Plano e gostaria de agendar. Aceitam meu plano ${provider.planName ?? ""}?`
      )}`
    : null;

  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-100/80">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-slate-900">{provider.name}</h3>
          <p className="mt-0.5 truncate text-sm text-slate-500">
            {provider.specialties?.slice(0, 2).join(" · ") || provider.neighborhood}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide",
            badge.className
          )}
        >
          {badge.label}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
        {provider.distanceKm != null && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-brand-500" />
            {formatDistance(provider.distanceKm)}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          {provider.rating.toFixed(1)}
        </span>
        {provider.planName && (
          <span className="truncate text-slate-500">{provider.planName}</span>
        )}
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {provider.planStatus === "confirmed"
          ? `${formatRelativeDays(provider.lastVerifiedAt)} · ${sourceLabel(provider.planSource ?? "operator")}`
          : provider.planStatus === "not_accepted"
            ? `Usuários reportaram que não aceita · ${formatRelativeDays(provider.lastVerifiedAt).replace("Confirmado", "Info de")}`
            : "Aparece na rede, mas sem confirmação recente"}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={`/provedores/${provider.id}`}
          className="inline-flex min-w-[120px] flex-1 items-center justify-center rounded-xl bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Ver detalhes
        </a>
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onWhatsApp}
            className="inline-flex min-w-[120px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
        )}
      </div>

      {(showRequestConfirm || onRequestConfirm) && provider.planStatus === "unconfirmed" && (
        <a
          href={`/provedores/${provider.id}#pedir-confirmacao`}
          onClick={onRequestConfirm}
          className="mt-2 block w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm font-medium text-amber-900 hover:bg-amber-100"
        >
          Pedir confirmação
        </a>
      )}
    </article>
  );
}
