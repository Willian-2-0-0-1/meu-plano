"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("demo@meuplano.app");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          callbackUrl: params.get("callbackUrl") || "/",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível entrar.");
        setLoading(false);
        return;
      }
      router.push(data.callbackUrl || "/");
      router.refresh();
    } catch {
      setError("Falha de rede. Tente de novo.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col px-4 pb-10 pt-10 md:px-6">
      <div className="mx-auto w-full max-w-md flex-1">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-xl font-extrabold text-white shadow-lg shadow-brand-600/30">
            MP
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Meu Plano</h1>
          <p className="mt-2 text-sm text-slate-600">
            Encontre quem realmente atende o seu plano, sem precisar ligar para ninguém.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <label className="block text-xs font-medium text-slate-600">
            E-mail
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Senha
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs text-slate-600">
          <p className="font-semibold text-slate-800">Contas demo</p>
          <p className="mt-1">Usuário: demo@meuplano.app / demo123</p>
          <p>Admin: admin@meuplano.app / admin123</p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Ao continuar, você concorda em usar dados fictícios apenas para demonstração.
        </p>
        <p className="mt-2 text-center text-xs">
          <Link href="/premium" className="text-brand-700 underline">
            Conhecer Meu Plano+
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function EntrarPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Carregando…</div>}>
      <LoginForm />
    </Suspense>
  );
}
