"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/";
  const error = params.get("error");

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

        {/* Form nativo POST — funciona mesmo se o JS do React não hidratar */}
        <form
          method="POST"
          action="/api/login"
          className="space-y-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
        >
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <label className="block text-xs font-medium text-slate-600">
            E-mail
            <input
              type="email"
              name="email"
              required
              defaultValue="demo@meuplano.app"
              autoComplete="username"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Senha
            <input
              type="password"
              name="password"
              required
              defaultValue="demo123"
              autoComplete="current-password"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
          {error && (
            <p className="text-sm text-rose-600">
              E-mail ou senha incorretos. Tente de novo.
            </p>
          )}
          <button
            type="submit"
            className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Entrar
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
