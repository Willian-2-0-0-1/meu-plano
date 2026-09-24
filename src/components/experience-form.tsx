"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Specialty = { id: string; name: string };
type Plan = { id: string; operator: string; name: string };

type Props = {
  providerId: string;
  planName?: string | null;
  mode?: "confirm" | "request" | "experience";
};

export function ExperienceForm({ providerId, planName }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState<"ask" | "details" | "done">("ask");
  const [accepted, setAccepted] = useState<boolean | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [healthPlanId, setHealthPlanId] = useState("");
  const [specialtyId, setSpecialtyId] = useState("");
  const [experienceDate, setExperienceDate] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/plans")
      .then((r) => r.json())
      .then((d) => setPlans(d.plans ?? []));
    void fetch(`/api/providers/${providerId}`)
      .then((r) => r.json())
      .then((d) => {
        const specs =
          d.provider?.specialties?.map(
            (s: { specialty: Specialty }) => s.specialty
          ) ?? [];
        setSpecialties(specs);
      })
      .catch(() => undefined);
  }, [providerId]);

  function requireLogin() {
    router.push(`/entrar?callbackUrl=${encodeURIComponent(`/provedores/${providerId}`)}`);
  }

  function choose(value: boolean) {
    if (status !== "authenticated") {
      requireLogin();
      return;
    }
    setAccepted(value);
    setStep("details");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (accepted == null) return;
    setLoading(true);
    const res = await fetch("/api/experiences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId,
        healthPlanId: healthPlanId || undefined,
        specialtyId: specialtyId || null,
        accepted,
        experienceDate: experienceDate || null,
        comment: comment || null,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      if (res.status === 401) {
        requireLogin();
        return;
      }
      setMsg(data.error || "Erro ao enviar.");
      return;
    }
    setMsg(data.message);
    setStep("done");
    router.refresh();
  }

  async function requestConfirm() {
    if (status !== "authenticated") {
      requireLogin();
      return;
    }
    setLoading(true);
    const res = await fetch("/api/verification-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId }),
    });
    const data = await res.json();
    setMsg(data.message || data.error);
    setLoading(false);
  }

  if (step === "done") {
    return (
      <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
        {msg || "Obrigado! Sua experiência ajuda outras pessoas com o mesmo plano."}
      </section>
    );
  }

  return (
    <section id="experiencia" className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">
        Você conseguiu atendimento nesta unidade usando seu plano
        {planName ? ` (${planName})` : ""}?
      </h2>
      <p className="text-xs text-slate-500">
        Confirmação estruturada antes do comentário. Não pedimos CPF, carteirinha nem diagnóstico.
      </p>

      {step === "ask" && (
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => choose(true)}
            className="rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white"
          >
            Sim
          </button>
          <button
            type="button"
            onClick={() => choose(false)}
            className="rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white"
          >
            Não
          </button>
        </div>
      )}

      {step === "details" && (
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          <p className="text-xs font-medium text-slate-700">
            Você respondeu: <strong>{accepted ? "Sim" : "Não"}</strong>
          </p>
          <label className="block text-xs font-medium text-slate-600">
            Plano usado
            <select
              value={healthPlanId}
              onChange={(e) => setHealthPlanId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Usar meu plano ativo</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.operator} {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Especialidade / procedimento (opcional)
            <select
              value={specialtyId}
              onChange={(e) => setSpecialtyId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {specialties.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Data aproximada
            <input
              type="date"
              value={experienceDate}
              onChange={(e) => setExperienceDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Comentário opcional
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Ex.: Atendimento ok com Especial 100 na dermatologia"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
            Não publique CPF, número de carteirinha, exames, diagnósticos ou outros dados sensíveis.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep("ask")}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Enviando…" : "Publicar"}
            </button>
          </div>
        </form>
      )}

      <div className="border-t border-slate-100 pt-3">
        <button
          type="button"
          disabled={loading}
          onClick={() => void requestConfirm()}
          className="w-full rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-sm font-medium text-amber-900"
        >
          Pedir confirmação à clínica
        </button>
      </div>
      {msg && <p className="text-xs text-slate-600">{msg}</p>}
      {status !== "authenticated" && (
        <p className="text-xs text-slate-500">
          <a href={`/entrar?callbackUrl=/provedores/${providerId}`} className="text-brand-700 underline">
            Entre
          </a>{" "}
          para publicar sua experiência.
        </p>
      )}
    </section>
  );
}

/** Compatibilidade com ConfirmationActions antigo */
export function ConfirmationActions({
  providerId,
  mode,
  planName,
}: {
  providerId: string;
  mode: "confirm" | "request";
  planName?: string | null;
}) {
  if (mode === "request") {
    return <ExperienceForm providerId={providerId} planName={planName} />;
  }
  return <ExperienceForm providerId={providerId} planName={planName} />;
}
