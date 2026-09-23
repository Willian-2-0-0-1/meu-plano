"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type AdminData = {
  providers: Array<{
    id: string;
    name: string;
    type: string;
    neighborhood: string;
    city: string;
    plans: Array<{
      status: string;
      sourceType?: string;
      healthPlanId: string;
      healthPlan: { operator: string; name: string };
    }>;
  }>;
  plans: Array<{ id: string; operator: string; name: string; category: string | null }>;
  specialties: Array<{ id: string; name: string; category: string; keywords: string }>;
  verificationRequests: Array<{
    id: string;
    status: string;
    createdAt: string;
    provider: { name: string };
    healthPlan: { operator: string; name: string };
    user: { name: string; email: string };
  }>;
  confirmations: Array<{
    id: string;
    answer: string;
    createdAt: string;
    provider: { name: string };
    healthPlan: { operator: string; name: string };
    user: { name: string; email: string };
  }>;
  experiences: Array<{
    id: string;
    accepted: boolean;
    createdAt: string;
    comment: string | null;
    provider: { name: string };
    healthPlan: { operator: string; name: string };
    user: { name: string; email: string };
  }>;
  crawlerRuns: Array<{
    id: string;
    operator: string;
    adapter: string;
    status: string;
    rawCount: number;
    upserted: number;
    errorsJson: string;
    startedAt: string;
    finishedAt: string | null;
    note: string | null;
  }>;
  conflicts: Array<{
    id: string;
    status: string;
    notes: string | null;
    provider: { name: string };
    healthPlan: { operator: string; name: string };
  }>;
  reports: Array<{
    id: string;
    reason: string;
    status: string;
    targetType: string;
    targetId: string;
    createdAt: string;
    user: { name: string; email: string };
  }>;
  claims: Array<{
    id: string;
    status: string;
    message: string | null;
    createdAt: string;
    provider: { name: string };
    user: { name: string; email: string };
  }>;
  history: Array<{
    id: string;
    previousStatus: string | null;
    newStatus: string;
    sourceType: string;
    observedAt: string;
    provider: { name: string };
    healthPlan: { operator: string; name: string };
  }>;
  crawlerAdapters: Array<{ id: string; operator: string }>;
};

type Tab =
  | "providers"
  | "plans"
  | "specialties"
  | "requests"
  | "confirmations"
  | "crawlers"
  | "conflicts"
  | "reports"
  | "claims"
  | "history";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<AdminData | null>(null);
  const [tab, setTab] = useState<Tab>("providers");
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "clinica",
    address: "",
    neighborhood: "",
    city: "São Paulo",
    latitude: "-23.55",
    longitude: "-46.63",
    phone: "",
    whatsapp: "",
  });
  const [planForm, setPlanForm] = useState({ operator: "SulAmérica", name: "", category: "" });
  const [specForm, setSpecForm] = useState({ name: "", category: "medico", keywords: "" });
  const [linkForm, setLinkForm] = useState({
    providerId: "",
    healthPlanId: "",
    status: "confirmed",
    sourceType: "manual_admin",
  });

  async function load() {
    const res = await fetch("/api/admin");
    if (res.status === 403) {
      setMsg("Acesso restrito a administradores.");
      return;
    }
    const json = await res.json();
    setData(json);
    if (json.providers?.[0]) setLinkForm((f) => ({ ...f, providerId: json.providers[0].id }));
    if (json.plans?.[0]) setLinkForm((f) => ({ ...f, healthPlanId: json.plans[0].id }));
  }

  useEffect(() => {
    if (status === "unauthenticated") router.push("/entrar");
    if (status === "authenticated") void load();
  }, [status, router]);

  async function adminAction(body: unknown) {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      setMsg(json.error || "Erro");
      return;
    }
    setMsg("Salvo com sucesso.");
    await load();
  }

  if (status === "loading" || !data) {
    return <div className="p-6 text-sm text-slate-500">{msg || "Carregando admin…"}</div>;
  }

  if (session?.user?.role !== "admin") {
    return (
      <div className="p-6">
        <p className="text-sm text-rose-700">Você não tem permissão de admin.</p>
        <Link href="/" className="text-sm text-brand-700 underline">
          Voltar
        </Link>
      </div>
    );
  }

  const tabs: [Tab, string][] = [
    ["providers", "Clínicas"],
    ["plans", "Planos"],
    ["specialties", "Especialidades"],
    ["crawlers", "Crawlers"],
    ["conflicts", "Conflitos"],
    ["history", "Alterações"],
    ["requests", "Verificações"],
    ["confirmations", "Experiências"],
    ["reports", "Denúncias"],
    ["claims", "Reivindicações"],
  ];

  return (
    <main className="px-4 pb-10 pt-6 md:px-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold text-slate-900">Admin</h1>
        <Link href="/" className="text-sm font-medium text-brand-700">
          App
        </Link>
      </div>
      {msg && <p className="mt-2 text-sm text-emerald-700">{msg}</p>}

      <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
              tab === id ? "bg-brand-600 text-white" : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "providers" && (
        <div className="mt-4 space-y-4">
          <form
            className="space-y-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
            onSubmit={(e) => {
              e.preventDefault();
              void adminAction({ action: "upsertProvider", data: form });
              setForm({
                name: "",
                type: "clinica",
                address: "",
                neighborhood: "",
                city: "São Paulo",
                latitude: "-23.55",
                longitude: "-46.63",
                phone: "",
                whatsapp: "",
              });
            }}
          >
            <h2 className="text-sm font-semibold">Nova clínica / provedor</h2>
            {(
              [
                ["name", "Nome"],
                ["address", "Endereço"],
                ["neighborhood", "Bairro"],
                ["city", "Cidade"],
                ["latitude", "Latitude"],
                ["longitude", "Longitude"],
                ["phone", "Telefone"],
                ["whatsapp", "WhatsApp"],
              ] as const
            ).map(([key, label]) => (
              <input
                key={key}
                required={["name", "address", "neighborhood", "latitude", "longitude"].includes(key)}
                placeholder={label}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            ))}
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {["clinica", "medico", "laboratorio", "hospital", "pronto_atendimento", "terapia"].map(
                (t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                )
              )}
            </select>
            <button type="submit" className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white">
              Criar
            </button>
          </form>

          <div className="space-y-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Definir status de plano (com histórico)</h2>
            <select
              value={linkForm.providerId}
              onChange={(e) => setLinkForm((f) => ({ ...f, providerId: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {data.providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={linkForm.healthPlanId}
              onChange={(e) => setLinkForm((f) => ({ ...f, healthPlanId: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {data.plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.operator} {p.name}
                </option>
              ))}
            </select>
            <select
              value={linkForm.status}
              onChange={(e) => setLinkForm((f) => ({ ...f, status: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {[
                "confirmed",
                "listed",
                "reported_not_accepting",
                "not_found",
                "conflicting",
                "stale",
              ].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={linkForm.sourceType}
              onChange={(e) => setLinkForm((f) => ({ ...f, sourceType: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {["manual_admin", "operator", "clinic", "community"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white"
              onClick={() =>
                void adminAction({
                  action: "setProviderPlan",
                  data: { ...linkForm, force: true },
                })
              }
            >
              Salvar status
            </button>
          </div>

          <ul className="space-y-2">
            {data.providers.map((p) => (
              <li key={p.id} className="rounded-xl border border-slate-100 bg-white p-3 text-sm shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs text-slate-500">
                      {p.type} · {p.neighborhood}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-medium text-rose-600"
                    onClick={() => void adminAction({ action: "deleteProvider", id: p.id })}
                  >
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "plans" && (
        <div className="mt-4 space-y-4">
          <form
            className="space-y-2 rounded-2xl border border-slate-100 bg-white p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void adminAction({ action: "upsertPlan", data: planForm });
              setPlanForm({ operator: "SulAmérica", name: "", category: "" });
            }}
          >
            <input
              className="w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="Operadora"
              value={planForm.operator}
              onChange={(e) => setPlanForm((f) => ({ ...f, operator: e.target.value }))}
              required
            />
            <input
              className="w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="Nome do plano"
              value={planForm.name}
              onChange={(e) => setPlanForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <input
              className="w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="Categoria"
              value={planForm.category}
              onChange={(e) => setPlanForm((f) => ({ ...f, category: e.target.value }))}
            />
            <button type="submit" className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white">
              Criar plano
            </button>
          </form>
          <ul className="space-y-2">
            {data.plans.map((p) => (
              <li key={p.id} className="flex justify-between rounded-xl bg-white p-3 text-sm shadow-sm">
                <span>
                  {p.operator} · {p.name}
                </span>
                <button
                  type="button"
                  className="text-xs text-rose-600"
                  onClick={() => void adminAction({ action: "deletePlan", id: p.id })}
                >
                  Excluir
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "specialties" && (
        <div className="mt-4 space-y-4">
          <form
            className="space-y-2 rounded-2xl border border-slate-100 bg-white p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void adminAction({ action: "upsertSpecialty", data: specForm });
              setSpecForm({ name: "", category: "medico", keywords: "" });
            }}
          >
            <input
              className="w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="Nome"
              value={specForm.name}
              onChange={(e) => setSpecForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <select
              className="w-full rounded-xl border px-3 py-2 text-sm"
              value={specForm.category}
              onChange={(e) => setSpecForm((f) => ({ ...f, category: e.target.value }))}
            >
              {["medico", "exame", "laboratorio", "hospital", "pronto_atendimento", "terapia"].map(
                (c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                )
              )}
            </select>
            <input
              className="w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="Palavras-chave (csv)"
              value={specForm.keywords}
              onChange={(e) => setSpecForm((f) => ({ ...f, keywords: e.target.value }))}
            />
            <button type="submit" className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white">
              Criar especialidade
            </button>
          </form>
          <ul className="space-y-2">
            {data.specialties.map((s) => (
              <li key={s.id} className="flex justify-between rounded-xl bg-white p-3 text-sm shadow-sm">
                <span>
                  {s.name} <span className="text-xs text-slate-400">({s.category})</span>
                </span>
                <button
                  type="button"
                  className="text-xs text-rose-600"
                  onClick={() => void adminAction({ action: "deleteSpecialty", id: s.id })}
                >
                  Excluir
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "crawlers" && (
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Rodar crawler MOCK</h2>
            <p className="mt-1 text-xs text-slate-500">
              Dados fictícios — sem scrapers reais. Pipeline: raw → normalize → dedupe → status → histórico.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.crawlerAdapters.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white"
                  onClick={() => void adminAction({ action: "runCrawler", adapter: a.id })}
                >
                  {a.operator}
                </button>
              ))}
            </div>
          </div>
          <ul className="space-y-2">
            {data.crawlerRuns.map((r) => (
              <li key={r.id} className="rounded-xl bg-white p-3 text-sm shadow-sm">
                <p className="font-medium">
                  {r.adapter} · {r.status}
                </p>
                <p className="text-xs text-slate-500">
                  raw {r.rawCount} · upserted {r.upserted} ·{" "}
                  {new Date(r.startedAt).toLocaleString("pt-BR")}
                </p>
                {r.errorsJson !== "[]" && (
                  <p className="mt-1 text-xs text-rose-600">{r.errorsJson}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "conflicts" && (
        <ul className="mt-4 space-y-2">
          {data.conflicts.length === 0 && (
            <li className="text-sm text-slate-500">Nenhum conflito aberto.</li>
          )}
          {data.conflicts.map((c) => (
            <li key={c.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
              <p className="font-medium">{c.provider.name}</p>
              <p className="text-xs text-slate-600">
                {c.healthPlan.operator} {c.healthPlan.name}
              </p>
              {c.notes && <p className="mt-1 text-xs">{c.notes}</p>}
            </li>
          ))}
        </ul>
      )}

      {tab === "history" && (
        <ul className="mt-4 space-y-2">
          {data.history.map((h) => (
            <li key={h.id} className="rounded-xl bg-white p-3 text-sm shadow-sm">
              <p className="font-medium">{h.provider.name}</p>
              <p className="text-xs text-slate-500">
                {h.healthPlan.operator} {h.healthPlan.name}: {h.previousStatus ?? "—"} → {h.newStatus} (
                {h.sourceType}) · {new Date(h.observedAt).toLocaleString("pt-BR")}
              </p>
            </li>
          ))}
        </ul>
      )}

      {tab === "requests" && (
        <ul className="mt-4 space-y-2">
          {data.verificationRequests.map((r) => (
            <li key={r.id} className="rounded-xl bg-white p-3 text-sm shadow-sm">
              <p className="font-medium">{r.provider.name}</p>
              <p className="text-xs text-slate-500">
                {r.healthPlan.operator} {r.healthPlan.name} · {r.user.name} · {r.status}
              </p>
              <div className="mt-2 flex gap-2">
                {["pending", "contacted", "resolved"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    className="rounded-lg border px-2 py-1 text-[11px]"
                    onClick={() =>
                      void adminAction({ action: "updateVerification", id: r.id, status: st })
                    }
                  >
                    {st}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      {tab === "confirmations" && (
        <ul className="mt-4 space-y-2">
          {(data.experiences?.length ? data.experiences : []).map((c) => (
            <li key={c.id} className="rounded-xl bg-white p-3 text-sm shadow-sm">
              <p className="font-medium">{c.provider.name}</p>
              <p className="text-xs text-slate-500">
                {c.user.name} · {c.accepted ? "SIM" : "NÃO"} · {c.healthPlan.operator}{" "}
                {c.healthPlan.name} · {new Date(c.createdAt).toLocaleString("pt-BR")}
              </p>
              {c.comment && <p className="mt-1 text-xs text-slate-600">{c.comment}</p>}
            </li>
          ))}
        </ul>
      )}

      {tab === "reports" && (
        <ul className="mt-4 space-y-2">
          {data.reports.map((r) => (
            <li key={r.id} className="rounded-xl bg-white p-3 text-sm shadow-sm">
              <p className="font-medium">
                {r.reason} · {r.status}
              </p>
              <p className="text-xs text-slate-500">
                {r.targetType}/{r.targetId} · {r.user.name}
              </p>
              <div className="mt-2 flex gap-2">
                {["pending", "reviewed", "dismissed"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    className="rounded-lg border px-2 py-1 text-[11px]"
                    onClick={() =>
                      void adminAction({ action: "updateReport", id: r.id, status: st })
                    }
                  >
                    {st}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      {tab === "claims" && (
        <ul className="mt-4 space-y-2">
          {data.claims.map((c) => (
            <li key={c.id} className="rounded-xl bg-white p-3 text-sm shadow-sm">
              <p className="font-medium">{c.provider.name}</p>
              <p className="text-xs text-slate-500">
                {c.user.name} · {c.status}
              </p>
              {c.message && <p className="mt-1 text-xs">{c.message}</p>}
              <div className="mt-2 flex gap-2">
                {["pending", "approved", "rejected"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    className="rounded-lg border px-2 py-1 text-[11px]"
                    onClick={() =>
                      void adminAction({ action: "updateClaim", id: c.id, status: st })
                    }
                  >
                    {st}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
