import Link from "next/link";

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const callbackUrl = sp.callbackUrl && sp.callbackUrl.startsWith("/") ? sp.callbackUrl : "/";
  const hasError = sp.error != null;

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

        {/* Atalho GET — funciona mesmo se cliques em botão falharem na automação */}
        <a
          href={`/api/demo-login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="mb-4 flex w-full items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm font-bold text-emerald-900 hover:bg-emerald-100"
          data-testid="demo-login"
        >
          Entrar como Ana (demo)
        </a>

        <form
          method="POST"
          action="/api/login"
          className="space-y-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
          data-testid="login-form"
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
          {hasError && (
            <p className="text-sm text-rose-600">E-mail ou senha incorretos. Tente de novo.</p>
          )}
          <button
            type="submit"
            className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700"
            data-testid="login-submit"
          >
            Entrar
          </button>
        </form>

        <p className="mt-3 text-center text-xs text-slate-500">
          Ou{" "}
          <a
            className="font-semibold text-brand-700 underline"
            href={`/api/demo-login?role=admin&callbackUrl=${encodeURIComponent(callbackUrl)}`}
          >
            entrar como admin
          </a>
        </p>

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
