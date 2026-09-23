import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { getCurrentUserProfile } from "@/lib/session";
import {
  ChevronRight,
  Heart,
  Download,
  Settings,
  ShieldCheck,
  Sparkles,
  ClipboardList,
} from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function PerfilPage() {
  const session = await auth();
  if (!session?.user) redirect("/entrar");

  const profile = await getCurrentUserProfile();
  const plan = profile?.plans[0];

  const confirmations = await prisma.confirmation.findMany({
    where: { userId: session.user.id },
    include: { provider: true, healthPlan: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const links = [
    { href: "/onboarding?trocar=1", label: "Trocar plano", icon: ClipboardList },
    { href: "/favoritos", label: "Favoritos", icon: Heart },
    { href: "/premium", label: "Meu Plano+", icon: Sparkles },
    { href: "/perfil/instalar", label: "Instalar app", icon: Download },
    ...(session.user.role === "admin"
      ? [{ href: "/admin", label: "Painel admin", icon: ShieldCheck }]
      : []),
    { href: "/ajuda", label: "Ajuda e suporte", icon: Settings },
  ];

  return (
    <main className="px-4 pb-8 pt-6 md:px-6">
      <h1 className="text-xl font-extrabold text-slate-900">Perfil</h1>

      <section className="mt-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="text-lg font-bold text-slate-900">{profile?.name}</p>
        <p className="text-sm text-slate-500">{profile?.email}</p>
        <div className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-sm">
          <p className="text-xs font-medium uppercase text-brand-700">Plano atual</p>
          <p className="font-semibold text-slate-900">
            {plan
              ? `${plan.healthPlan.operator} · ${plan.healthPlan.name}`
              : "Nenhum plano selecionado"}
          </p>
          <p className="text-xs text-slate-500">{profile?.city ?? "—"}</p>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-xl bg-slate-50 py-2">
            <p className="text-lg font-bold text-slate-900">{profile?._count.favorites ?? 0}</p>
            <p className="text-slate-500">Favoritos</p>
          </div>
          <div className="rounded-xl bg-slate-50 py-2">
            <p className="text-lg font-bold text-slate-900">{profile?._count.confirmations ?? 0}</p>
            <p className="text-slate-500">Confirmações</p>
          </div>
          <div className="rounded-xl bg-slate-50 py-2">
            <p className="text-lg font-bold text-slate-900">
              {profile?._count.verificationRequests ?? 0}
            </p>
            <p className="text-slate-500">Pedidos</p>
          </div>
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 border-b border-slate-50 px-4 py-3.5 last:border-0 hover:bg-slate-50"
          >
            <Icon className="h-4 w-4 text-brand-600" />
            <span className="flex-1 text-sm font-medium text-slate-800">{label}</span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </Link>
        ))}
      </section>

      <section className="mt-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Minhas confirmações</h2>
        {confirmations.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Você ainda não enviou confirmações.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {confirmations.map((c) => (
              <li key={c.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <p className="font-medium text-slate-800">{c.provider.name}</p>
                <p className="text-xs text-slate-500">
                  {c.healthPlan.operator} {c.healthPlan.name} ·{" "}
                  {c.answer === "yes" ? "Aceita" : c.answer === "no" ? "Não aceita" : "Não sei"} ·{" "}
                  {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/entrar" });
        }}
        className="mt-6"
      >
        <button
          type="submit"
          className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700"
        >
          Sair
        </button>
      </form>
    </main>
  );
}
