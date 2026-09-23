import { auth } from "@/lib/auth";
import { getCurrentUserProfile } from "@/lib/session";
import { resolveActivePlan } from "@/lib/guest-plan";
import { HomePlanFlow } from "@/components/home-plan-flow";
import { AlertTriangle, ChevronRight, Users } from "lucide-react";

export default async function HomePage() {
  const session = await auth();
  const profile = session?.user ? await getCurrentUserProfile() : null;
  const sessionPlan = profile?.plans[0];

  let initialPlan: { id: string; operator: string; name: string } | null = null;
  if (sessionPlan) {
    initialPlan = {
      id: sessionPlan.healthPlan.id,
      operator: sessionPlan.healthPlan.operator,
      name: sessionPlan.healthPlan.name,
    };
  } else {
    const guest = await resolveActivePlan();
    if (guest.healthPlanId && guest.planName) {
      const [operator, ...rest] = guest.planName.split(" ");
      // Better: look up from cookie parse — resolveActivePlan only returns name
      const parts = guest.planName.split(" ");
      // planName is "Operator Name..." — we need proper split. Use guest from cookie via prisma.
      initialPlan = {
        id: guest.healthPlanId,
        operator: parts[0] === "Bradesco" || parts[0] === "NotreDame" || parts[0] === "Porto"
          ? parts.slice(0, 2).join(" ")
          : parts[0],
        name: guest.planName.replace(/^(SulAmérica|Unimed|Amil|Hapvida|Bradesco Saúde|NotreDame Intermédica|Porto Saúde)\s+/, ""),
      };
      void operator;
    }
  }

  const firstName = profile?.name?.split(" ")[0];

  return (
    <main className="relative overflow-hidden px-4 pb-10 pt-8 md:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-brand-200/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-40 h-48 w-48 rounded-full bg-emerald-200/30 blur-3xl"
      />

      <header className="relative">
        <p className="text-sm font-semibold tracking-wide text-brand-700">Meu Plano</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
          Encontre atendimento pelo seu plano
        </h1>
        <p className="mt-3 max-w-xl text-base text-slate-600">
          Descubra onde seu plano está sendo aceito sem precisar ligar para vários lugares.
        </p>
        {firstName && (
          <p className="mt-2 text-sm text-slate-500">Olá, {firstName}.</p>
        )}
      </header>

      <div className="relative">
        <HomePlanFlow initialPlan={initialPlan} isLoggedIn={Boolean(session?.user)} />
      </div>

      <div className="relative mt-6 grid gap-3 sm:grid-cols-2">
        <a
          href="/comunidade"
          className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-brand-200"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Users className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">Comunidade</p>
            <p className="text-xs text-slate-500">Relatos recentes sobre redes e atendimento</p>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </a>
        <a
          href="/ajuda"
          className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-sm"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">Meu plano não resolveu</p>
            <p className="text-xs text-slate-600">Ajuda e canais da operadora</p>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </a>
      </div>

      {!session?.user && (
        <p className="relative mt-8 text-center text-xs text-slate-500">
          Busca livre.{" "}
          <a href="/entrar" className="font-medium text-brand-700 underline">
            Entrar
          </a>{" "}
          só para confirmar atendimento, comentar ou favoritar.
        </p>
      )}
    </main>
  );
}
