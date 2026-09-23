"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ProviderCard, type ProviderCardData } from "@/components/provider-card";
import { cn } from "@/lib/utils";
import { List, Map as MapIcon, Loader2, Filter } from "lucide-react";

const ProvidersMap = dynamic(
  () => import("@/components/map/providers-map").then((m) => m.ProvidersMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-72 items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-500">
        Carregando mapa…
      </div>
    ),
  }
);

export type SearchFilters = {
  q: string;
  type?: string;
  specialty?: string;
  distance: number;
  acceptsPlan: boolean;
  recentConfirm: boolean;
  openToday: boolean;
  minRating: number;
  includeUnconfirmed: boolean;
  includeNotAccepted: boolean;
  locationMode: "default" | "geo" | "place";
  lat?: number;
  lng?: number;
  place?: string;
};

type Props = {
  initialQuery?: string;
  initialType?: string;
  initialSpecialty?: string;
};

export function SearchExperience({
  initialQuery = "",
  initialType = "",
  initialSpecialty = "",
}: Props) {
  const [view, setView] = useState<"list" | "map">("list");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ProviderCardData[]>([]);
  const [meta, setMeta] = useState<{ activePlanName?: string | null; count?: number }>({});
  const [toast, setToast] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({
    q: initialQuery,
    type: initialType || undefined,
    specialty: initialSpecialty || undefined,
    distance: 25,
    acceptsPlan: false,
    recentConfirm: false,
    openToday: false,
    minRating: 0,
    includeUnconfirmed: true,
    includeNotAccepted: false,
    locationMode: "default",
  });
  const [queryInput, setQueryInput] = useState(initialQuery);

  async function runSearch(next?: Partial<SearchFilters>) {
    const f = { ...filters, ...next };
    setFilters(f);
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (f.q) params.set("q", f.q);
      if (f.type) params.set("type", f.type);
      if (f.specialty) params.set("specialty", f.specialty);
      params.set("distance", String(f.distance));
      if (f.acceptsPlan) params.set("acceptsPlan", "1");
      if (f.recentConfirm) params.set("recentConfirm", "1");
      if (f.openToday) params.set("openToday", "1");
      if (f.minRating) params.set("minRating", String(f.minRating));
      params.set("includeUnconfirmed", f.includeUnconfirmed ? "1" : "0");
      if (f.includeNotAccepted) params.set("includeNotAccepted", "1");
      params.set("locationMode", f.locationMode);
      if (f.lat != null) params.set("lat", String(f.lat));
      if (f.lng != null) params.set("lng", String(f.lng));
      if (f.place) params.set("place", f.place);

      const res = await fetch(`/api/search?${params.toString()}`);
      if (!res.ok) throw new Error("Falha na busca");
      const data = await res.json();
      setResults(data.results);
      setMeta(data.meta);
    } catch {
      setError("Não foi possível buscar agora. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setToast("Geolocalização não disponível neste dispositivo.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void runSearch({
          locationMode: "geo",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setToast("Localização atualizada.");
      },
      () => setToast("Não foi possível obter sua localização."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function trackWhatsApp(providerId: string) {
    await fetch("/api/whatsapp-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId }),
    });
  }

  async function requestConfirm(providerId: string) {
    const res = await fetch("/api/verification-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId }),
    });
    const data = await res.json();
    setToast(data.message || data.error || "Pedido enviado.");
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void runSearch({ q: queryInput });
        }}
        className="space-y-2"
      >
        <div className="flex gap-2">
          <input
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Ex.: Dermatologista perto de mim"
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-brand-500 focus:ring-2"
          />
          <button
            type="submit"
            className="rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Buscar
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={useMyLocation}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
          >
            Usar minha localização
          </button>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
          </button>
          <div className="ml-auto inline-flex rounded-full border border-slate-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
                view === "list" ? "bg-brand-600 text-white" : "text-slate-600"
              )}
            >
              <List className="h-3.5 w-3.5" /> Lista
            </button>
            <button
              type="button"
              onClick={() => setView("map")}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
                view === "map" ? "bg-brand-600 text-white" : "text-slate-600"
              )}
            >
              <MapIcon className="h-3.5 w-3.5" /> Mapa
            </button>
          </div>
        </div>
      </form>

      {showFilters && (
        <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <label className="block text-xs font-medium text-slate-600">
            CEP, bairro ou cidade
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Ex.: Pinheiros ou 05422-001"
              value={filters.place ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, place: e.target.value, locationMode: "place" }))
              }
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Distância: {filters.distance} km
            <input
              type="range"
              min={2}
              max={25}
              step={1}
              list="distances"
              value={filters.distance}
              onChange={(e) =>
                setFilters((f) => ({ ...f, distance: Number(e.target.value) }))
              }
              className="mt-2 w-full"
            />
            <datalist id="distances">
              <option value="2" />
              <option value="5" />
              <option value="10" />
              <option value="25" />
            </datalist>
            <div className="mt-1 flex justify-between text-[10px] text-slate-400">
              <span>2</span>
              <span>5</span>
              <span>10</span>
              <span>25 km</span>
            </div>
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {(
              [
                ["acceptsPlan", "Aceita meu plano"],
                ["recentConfirm", "Confirmação recente"],
                ["openToday", "Aberto hoje"],
                ["includeUnconfirmed", "Incluir não confirmados"],
                ["includeNotAccepted", "Incluir que não aceitam"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                <input
                  type="checkbox"
                  checked={Boolean(filters[key])}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, [key]: e.target.checked }))
                  }
                />
                {label}
              </label>
            ))}
          </div>
          <label className="block text-xs font-medium text-slate-600">
            Avaliação mínima
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={filters.minRating}
              onChange={(e) =>
                setFilters((f) => ({ ...f, minRating: Number(e.target.value) }))
              }
            >
              <option value={0}>Qualquer</option>
              <option value={3}>3+</option>
              <option value={4}>4+</option>
              <option value={4.5}>4,5+</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => void runSearch(filters)}
            className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white"
          >
            Aplicar filtros
          </button>
        </div>
      )}

      {meta.activePlanName && (
        <p className="text-xs text-slate-500">
          Resultados para o plano <strong className="text-slate-700">{meta.activePlanName}</strong>
        </p>
      )}

      {toast && (
        <div className="rounded-xl border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-brand-900">
          {toast}
          <button className="ml-2 underline" onClick={() => setToast(null)}>
            Fechar
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Buscando quem aceita seu plano…
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
          <button className="ml-2 font-semibold underline" onClick={() => void runSearch()}>
            Tentar de novo
          </button>
        </div>
      )}

      {!loading && !error && results.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
          <h3 className="text-base font-semibold text-slate-900">Nenhum resultado por perto</h3>
          <p className="mt-1 text-sm text-slate-500">
            Tente ampliar a busca ou incluir locais ainda não confirmados.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white"
              onClick={() => void runSearch({ distance: 25, includeUnconfirmed: true })}
            >
              Aumentar distância
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium"
              onClick={() => void runSearch({ acceptsPlan: false, includeUnconfirmed: true })}
            >
              Ver não confirmados
            </button>
            <a
              href="/ajuda"
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-900"
            >
              Pedir ajuda
            </a>
          </div>
        </div>
      )}

      {!loading && results.length > 0 && view === "list" && (
        <div className="space-y-3">
          {results.map((p) => (
            <ProviderCard
              key={p.id}
              provider={p}
              onWhatsApp={() => void trackWhatsApp(p.id)}
              onRequestConfirm={() => void requestConfirm(p.id)}
            />
          ))}
        </div>
      )}

      {!loading && results.length > 0 && view === "map" && (
        <ProvidersMap
          providers={results}
          origin={
            filters.lat != null && filters.lng != null
              ? { lat: filters.lat, lng: filters.lng }
              : undefined
          }
        />
      )}
    </div>
  );
}
