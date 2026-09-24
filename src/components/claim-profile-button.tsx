"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export function ClaimProfileButton({ providerId }: { providerId: string }) {
  const { status } = useSession();
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function claim() {
    if (status !== "authenticated") {
      router.push(`/entrar?callbackUrl=/provedores/${providerId}`);
      return;
    }
    setLoading(true);
    const res = await fetch("/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId,
        message: "Represento esta clínica e gostaria de reivindicar o perfil.",
      }),
    });
    const data = await res.json();
    setMsg(data.message || data.error);
    setLoading(false);
  }

  return (
    <section className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-center shadow-sm">
      <p className="text-sm font-medium text-slate-800">Você representa esta clínica?</p>
      <button
        type="button"
        disabled={loading}
        onClick={() => void claim()}
        className="mt-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800"
      >
        {loading ? "Enviando…" : "Reivindicar perfil"}
      </button>
      <p className="mt-2 text-[11px] text-slate-500">
        Arquitetura inicial — sem validação empresarial completa nesta versão.
      </p>
      {msg && <p className="mt-2 text-xs text-emerald-700">{msg}</p>}
    </section>
  );
}
