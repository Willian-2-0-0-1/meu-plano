import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveActivePlan } from "@/lib/guest-plan";
import { formatRelativeDays } from "@/lib/utils";
import { Filter } from "lucide-react";

export default async function ComunidadePage({
  searchParams,
}: {
  searchParams: Promise<{
    planId?: string;
    specialty?: string;
    city?: string;
  }>;
}) {
  const sp = await searchParams;
  const session = await auth();

  let activePlanId = sp.planId ?? null;
  let activePlanName: string | null = null;

  if (!activePlanId && session?.user?.id) {
    const up = await prisma.userPlan.findFirst({
      where: { userId: session.user.id, isActive: true },
      include: { healthPlan: true },
    });
    if (up) {
      activePlanId = up.healthPlanId;
      activePlanName = `${up.healthPlan.operator} ${up.healthPlan.name}`;
    }
  }
  if (!activePlanId) {
    const g = await resolveActivePlan();
    activePlanId = g.healthPlanId;
    activePlanName = g.planName;
  } else if (!activePlanName) {
    const p = await prisma.healthPlan.findUnique({ where: { id: activePlanId } });
    if (p) activePlanName = `${p.operator} ${p.name}`;
  }

  const plans = await prisma.healthPlan.findMany({
    orderBy: [{ operator: "asc" }, { name: "asc" }],
  });
  const specialties = await prisma.specialty.findMany({ orderBy: { name: "asc" } });

  const specialty = sp.specialty
    ? await prisma.specialty.findFirst({
        where: {
          OR: [
            { slug: sp.specialty },
            { name: { contains: sp.specialty } },
          ],
        },
      })
    : null;

  const experiences = await prisma.providerExperience.findMany({
    where: {
      ...(activePlanId ? { healthPlanId: activePlanId } : {}),
      ...(specialty ? { specialtyId: specialty.id } : {}),
      ...(sp.city ? { provider: { city: { contains: sp.city } } } : {}),
    },
    include: {
      user: { select: { name: true } },
      provider: { select: { id: true, name: true, neighborhood: true, city: true } },
      healthPlan: true,
      specialty: true,
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  // Também mudanças recentes de status (atualizações de rede)
  const history = await prisma.providerPlanHistory.findMany({
    where: activePlanId ? { healthPlanId: activePlanId } : undefined,
    include: {
      provider: { select: { id: true, name: true, neighborhood: true } },
      healthPlan: true,
    },
    orderBy: { observedAt: "desc" },
    take: 15,
  });

  return (
    <main className="px-4 pb-10 pt-6 md:px-6">
      <h1 className="text-xl font-extrabold text-slate-900">Comunidade</h1>
      <p className="mt-1 text-sm text-slate-600">
        Relatos sobre redes, atendimento e planos — não é uma rede social genérica.
      </p>
      <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
        Baseado em relatos da comunidade. Não substitui informação oficial da operadora.
      </p>

      <form method="GET" action="/comunidade" className="mt-4 space-y-2 rounded-2xl border border-slate-100 bg-white p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <Filter className="h-3.5 w-3.5" /> Filtros
        </p>
        <select
          name="planId"
          defaultValue={activePlanId ?? ""}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">Todos os planos</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.operator} {p.name}
            </option>
          ))}
        </select>
        <select
          name="specialty"
          defaultValue={sp.specialty ?? ""}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">Todas especialidades</option>
          {specialties.map((s) => (
            <option key={s.id} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          name="city"
          defaultValue={sp.city ?? ""}
          placeholder="Cidade / região"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <button type="submit" className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white">
          Aplicar
        </button>
      </form>

      {activePlanName && (
        <p className="mt-3 text-xs text-slate-500">
          Foco no plano <strong>{activePlanName}</strong>
        </p>
      )}

      {history.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-slate-900">Atualizações de rede</h2>
          <ul className="mt-2 space-y-2">
            {history.map((h) => (
              <li key={h.id} className="rounded-xl border border-slate-100 bg-white p-3 text-sm shadow-sm">
                <a href={`/provedores/${h.provider.id}`} className="font-medium text-brand-800">
                  {h.provider.name}
                </a>
                <p className="text-xs text-slate-500">
                  {h.previousStatus ?? "—"} → {h.newStatus} · {h.healthPlan.operator}{" "}
                  {h.healthPlan.name} · {formatRelativeDays(h.observedAt)}
                </p>
                {h.note && <p className="mt-1 text-xs text-amber-800">{h.note}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-slate-900">Experiências recentes</h2>
        {experiences.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            Ainda não há relatos com esses filtros.
            {!session?.user && (
              <>
                {" "}
                <a href="/entrar?callbackUrl=/comunidade" className="text-brand-700 underline">
                  Entre
                </a>{" "}
                para publicar o primeiro.
              </>
            )}
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {experiences.map((ex) => (
              <li key={ex.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <a
                      href={`/provedores/${ex.provider.id}`}
                      className="font-semibold text-slate-900 hover:text-brand-700"
                    >
                      {ex.provider.name}
                    </a>
                    <p className="text-xs text-slate-500">
                      {ex.provider.neighborhood}, {ex.provider.city}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      ex.accepted
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {ex.accepted ? "ACEITOU" : "NÃO ACEITOU"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  {ex.healthPlan.operator} {ex.healthPlan.name}
                  {ex.specialty ? ` · ${ex.specialty.name}` : ""}
                  {" · "}
                  {ex.user.name.split(" ")[0]}
                  {" · "}
                  {formatRelativeDays(ex.createdAt)}
                </p>
                {ex.comment && (
                  <p className="mt-2 text-sm text-slate-700">&ldquo;{ex.comment}&rdquo;</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
