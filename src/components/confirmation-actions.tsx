"use client";

import { useState } from "react";

type Props = {
  providerId: string;
  mode: "confirm" | "request";
  planName?: string | null;
};

export function ConfirmationActions({ providerId, mode }: Props) {
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestConfirm() {
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

  async function confirm(answer: "yes" | "no" | "unknown") {
    setLoading(true);
    const res = await fetch("/api/confirmations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId, answer }),
    });
    const data = await res.json();
    setMsg(data.message || data.error);
    setLoading(false);
  }

  if (mode === "request") {
    return (
      <div>
        <button
          type="button"
          disabled={loading}
          onClick={() => void requestConfirm()}
          className="w-full rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-sm font-medium text-amber-900 disabled:opacity-60"
        >
          {loading ? "Enviando…" : "Pedir confirmação"}
        </button>
        {msg && <p className="mt-2 text-xs text-slate-600">{msg}</p>}
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">
        Essa clínica ainda aceita seu plano?
      </h2>
      <div className="mt-3 grid gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => void confirm("yes")}
          className="rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white"
        >
          Sim
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void confirm("no")}
          className="rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white"
        >
          Não
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void confirm("unknown")}
          className="rounded-xl border border-slate-200 py-3 text-sm font-medium"
        >
          Não sei
        </button>
      </div>
      {msg && <p className="mt-2 text-sm text-emerald-700">{msg}</p>}
    </section>
  );
}
