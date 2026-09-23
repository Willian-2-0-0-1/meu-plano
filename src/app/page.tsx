import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Ambulance,
  FlaskConical,
  HeartPulse,
  Hospital,
  Microscope,
  Stethoscope,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { getCurrentUserProfile } from "@/lib/session";
import { HomeSearch } from "@/components/home-search";

const shortcuts = [
  { label: "Médicos", href: "/buscar?type=medico&q=médico", icon: Stethoscope },
  { label: "Exames", href: "/buscar?type=exame&q=exame", icon: FlaskConical },
  { label: "Laboratórios", href: "/buscar?type=laboratorio&q=laboratório", icon: Microscope },
  { label: "Hospitais", href: "/buscar?type=hospital&q=hospital", icon: Hospital },
  { label: "Pronto atendimento", href: "/buscar?type=pronto_atendimento&q=pronto atendimento", icon: Ambulance },
  { label: "Terapias", href: "/buscar?type=terapia&q=terapia", icon: HeartPulse },
];

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/entrar");

  const profile = await getCurrentUserProfile();
  const plan = profile?.plans[0];

  if (!plan) redirect("/onboarding");

  const firstName = (profile?.name || "você").split(" ")[0];

  return (
    <main className="px-4 pb-8 pt-6 md:px-6">
      <header className="animate-in fade-in duration-500">
        <p className="text-sm font-medium text-slate-500">Olá 👋</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
          O que você precisa encontrar, {firstName}?
        </h1>
      </header>

      <section className="mt-5 rounded-2xl border border-brand-100 bg-gradient-to-br from-white to-brand-50 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
              Seu plano
            </p>
            <p className="mt-1 text-base font-bold text-slate-900">
              {plan.healthPlan.operator} · {plan.healthPlan.name}
            </p>
            <p className="text-xs text-slate-500">
              {profile?.city ?? "São Paulo"}
              {plan.planNumber ? ` · nº ${plan.planNumber}` : ""}
            </p>
          </div>
          <Link
            href="/onboarding?trocar=1"
            className="shrink-0 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
          >
            Trocar plano
          </Link>
        </div>
      </section>

      <section className="mt-5">
        <HomeSearch />
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-slate-800">Atalhos</h2>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6 md:grid-cols-3 lg:grid-cols-6">
          {shortcuts.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-medium leading-tight text-slate-700">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      <Link
        href="/ajuda"
        className="mt-6 flex items-center gap-3 rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-sm transition hover:shadow-md"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">Meu plano não resolveu</p>
          <p className="text-xs text-slate-600">
            Não encontrou atendimento, exame negado ou quer falar com a operadora?
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-slate-400" />
      </Link>

      <p className="mt-8 text-center text-xs text-slate-400">
        Encontre quem realmente atende o seu plano, sem precisar ligar para ninguém.
      </p>
    </main>
  );
}
