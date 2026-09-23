"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OPERATORS } from "@/lib/utils";

type Plan = { id: string; operator: string; name: string; category: string | null };

function OnboardingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const isTrocar = params.get("trocar") === "1";

  const [step, setStep] = useState(isTrocar ? 1 : 0);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [operator, setOperator] = useState("SulAmérica");
  const [planId, setPlanId] = useState("");
  const [planNumber, setPlanNumber] = useState("");
  const [city, setCity] = useState("São Paulo");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/plans")
      .then((r) => r.json())
      .then((d) => {
        setPlans(d.plans);
        const preferred = d.plans.find(
          (p: Plan) => p.operator === "SulAmérica" && p.name === "Especial 100"
        );
        if (preferred) setPlanId(preferred.id);
      });
  }, []);

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

  function useLocation() {
    if (!navigator.geolocation) {
      setMsg("Geolocalização indisponível.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setMsg("Localização capturada.");
      },
      () => setMsg("Não foi possível obter a localização.")
    );
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!planId) return;
    setLoading(true);
    const res = await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        healthPlanId: planId,
        planNumber: planNumber || null,
        city,
        latitude: lat,
        longitude: lng,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setMsg(data.error || "Erro ao salvar plano.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  if (step === 0) {
    return (
      <main className="flex min-h-dvh flex-col justify-between px-4 pb-10 pt-12 md:px-6">
        <div>
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-xl font-extrabold text-white">
            MP
          </div>
          <h1 className="text-3xl font-extrabold leading-tight text-slate-900">
            Meu Plano
          </h1>
          <p className="mt-3 text-base text-slate-600">
            Encontre médicos, clínicas e hospitais que <strong>realmente aceitam</strong> o seu
            plano — sem ligar para ninguém.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-slate-700">
            <li className="rounded-2xl bg-white p-4 shadow-sm">✓ Busca pelo seu plano específico</li>
            <li className="rounded-2xl bg-white p-4 shadow-sm">✓ Status confirmado por clínicas e usuários</li>
            <li className="rounded-2xl bg-white p-4 shadow-sm">✓ WhatsApp e rota em um toque</li>
          </ul>
        </div>
        <button
          type="button"
          onClick={() => setStep(1)}
          className="mt-8 w-full rounded-2xl bg-brand-600 py-3.5 text-sm font-semibold text-white"
        >
          Começar
        </button>
      </main>
    );
  }

  return (
    <main className="px-4 pb-10 pt-8 md:px-6">
      <h1 className="text-2xl font-extrabold text-slate-900">Qual é o seu plano?</h1>
      <p className="mt-1 text-sm text-slate-600">
        Vamos usar isso para mostrar quem realmente atende você.
      </p>

      <form onSubmit={save} className="mt-6 space-y-4">
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
          Nome do plano
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

        <label className="block text-xs font-medium text-slate-600">
          Número do plano (opcional)
          <input
            value={planNumber}
            onChange={(e) => setPlanNumber(e.target.value)}
            placeholder="Ex.: SA-100-88421"
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
          />
        </label>

        <label className="block text-xs font-medium text-slate-600">
          Cidade
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            required
          />
        </label>

        <button
          type="button"
          onClick={useLocation}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700"
        >
          {lat != null ? "Localização capturada ✓" : "Usar localização atual (opcional)"}
        </button>

        {msg && <p className="text-sm text-slate-600">{msg}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-brand-600 py-3.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Salvando…" : "Salvar e continuar"}
        </button>
      </form>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingInner />
    </Suspense>
  );
}
