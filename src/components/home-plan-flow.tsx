"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Search } from "lucide-react";
import { OPERATORS } from "@/lib/utils";

type Plan = { id: string; operator: string; name: string; category: string | null };

type Props = {
  initialPlan?: { id: string; operator: string; name: string } | null;
  isLoggedIn?: boolean;
};

const EXAMPLES = [
  { label: "Dermatologista", q: "Dermatologista" },
  { label: "Exames de sangue", q: "exames de sangue" },
  { label: "Pronto atendimento", q: "pronto atendimento" },
  { label: "Pediatra", q: "Pediatra" },
];

export function HomePlanFlow({ initialPlan, isLoggedIn }: Props) {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [operator, setOperator] = useState(initialPlan?.operator ?? "SulAmérica");
  const [planId, setPlanId] = useState(initialPlan?.id ?? "");
  const [step, setStep] = useState<"plan" | "search">(initialPlan ? "search" : "plan");
  const [query, setQuery] = useState("");
  const [place, setPlace] = useState("");
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/plans")
      .then((r) => r.json())
      .then((d) => {
        setPlans(d.plans ?? []);
        if (!planId) {
          const preferred = (d.plans as Plan[]).find(
            (p) => p.operator === "SulAmérica" && p.name === "Especial 100"
          );
          if (preferred) {
            setPlanId(preferred.id);
            setOperator(preferred.operator);
          }
        }
      });
  }, [planId]);

  const filteredPlans = useMemo(
    () => plans.filter((p) => p.operator === operator),
    [plans, operator]
  );

  useEffect(() => {
    if (!filteredPlans.length) return;
    if (!filteredPlans.some((p) => p.id === planId)) {
      setPlanId(filteredPlans[0].id);
    }
  }, [filteredPlans, planId]);

  const selected = plans.find((p) => p.id === planId);

  async function savePlanAndContinue(e?: FormEvent) {
    e?.preventDefault();
    if (!planId || !selected) return;
    setSaving(true);
    setMsg(null);

    // Cookie para visitantes
    await fetch("/api/guest-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ healthPlanId: planId }),
    });

    try {
      localStorage.setItem(
        "mp_guest_plan",
        JSON.stringify({
          healthPlanId: planId,
          operator: selected.operator,
          name: selected.name,
        })
      );
    } catch {
      /* ignore */
    }

    // Se logado, também salva no perfil
    if (isLoggedIn) {
      await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ healthPlanId: planId }),
      });
    }

    setSaving(false);
    setStep("search");
  }

  function useLocation() {
    if (!navigator.geolocation) {
      setMsg("Geolocalização indisponível neste dispositivo.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setMsg("Localização capturada.");
      },
      () => setMsg("Não foi possível obter a localização.")
    );
  }

  function goSearch(e?: FormEvent, overrideQ?: string) {
    e?.preventDefault();
    const q = overrideQ ?? query;
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (planId) params.set("planId", planId);
    if (place) params.set("place", place);
    if (geo) {
      params.set("locationMode", "geo");
      params.set("lat", String(geo.lat));
      params.set("lng", String(geo.lng));
    }
    router.push(`/buscar?${params.toString()}`);
  }

  if (step === "plan") {
    return (
      <section className="mt-6 rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-sm backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Passo 1</p>
        <h2 className="mt-1 text-lg font-bold text-slate-900">Qual é o seu plano?</h2>
        <p className="mt-1 text-sm text-slate-600">
          Sem cadastro. Guardamos só no seu aparelho para filtrar a busca.
        </p>

        <form onSubmit={(e) => void savePlanAndContinue(e)} className="mt-4 space-y-3">
          <label className="block text-xs font-medium text-slate-600">
            Operadora
            <select
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              {OPERATORS.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Plano
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
              required
            >
              {filteredPlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.category ? ` (${p.category})` : ""}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={saving || !planId}
            className="w-full rounded-2xl bg-brand-600 py-3.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Salvando…" : "Continuar"}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="mt-6 space-y-4">
      <div className="rounded-3xl border border-brand-100 bg-gradient-to-br from-white to-brand-50 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-brand-700">Seu plano</p>
            <p className="mt-1 text-base font-bold text-slate-900">
              {selected ? `${selected.operator} · ${selected.name}` : "Plano selecionado"}
            </p>
            <p className="text-xs text-slate-500">
              {isLoggedIn ? "Salvo no seu perfil" : "Salvo neste aparelho · sem login"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStep("plan")}
            className="shrink-0 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-700"
          >
            Trocar
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Passo 2</p>
        <h2 className="mt-1 text-lg font-bold text-slate-900">O que você está procurando?</h2>
        <p className="mt-1 text-sm text-slate-600">
          Especialidade, exame, clínica ou hospital.
        </p>

        <form onSubmit={(e) => goSearch(e)} className="mt-4 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex.: Dermatologista"
              className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-10 pr-3 text-sm outline-none ring-brand-500 focus:ring-2"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.q}
                type="button"
                onClick={() => goSearch(undefined, ex.q)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-brand-200 hover:bg-brand-50"
              >
                {ex.label}
              </button>
            ))}
          </div>

          <label className="block text-xs font-medium text-slate-600">
            CEP, cidade ou bairro
            <input
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="Ex.: Pinheiros ou 05422-001"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          </label>

          <button
            type="button"
            onClick={useLocation}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700"
          >
            <MapPin className="h-4 w-4 text-brand-600" />
            {geo ? "Localização capturada ✓" : "Usar minha localização"}
          </button>

          {msg && <p className="text-xs text-slate-600">{msg}</p>}

          <button
            type="submit"
            className="w-full rounded-2xl bg-brand-600 py-3.5 text-sm font-semibold text-white"
          >
            Buscar atendimento
          </button>
        </form>
      </div>
    </section>
  );
}
