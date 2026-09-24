import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveActivePlan } from "@/lib/guest-plan";
import {
  cn,
  formatRelativeDays,
  providerTypeLabel,
  sourceLabel,
  statusBadge,
} from "@/lib/utils";
import { normalizeSourceType, normalizeStatus } from "@/lib/plan-status-helpers";
import {
  ArrowLeft,
  Heart,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Star,
  Clock,
  AlertTriangle,
  Building2,
} from "lucide-react";
import { ExperienceForm } from "@/components/experience-form";
import { ClaimProfileButton } from "@/components/claim-profile-button";
import { ReportButton } from "@/components/report-button";
import { SourceOriginLink } from "@/components/source-origin-link";

export default async function ProviderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; planId?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = sp.tab ?? "visao";
  const session = await auth();

  const provider = await prisma.provider.findUnique({
    where: { id },
    include: {
      specialties: { include: { specialty: true } },
      plans: { include: { healthPlan: true } },
      planHistory: {
        include: { healthPlan: true },
        orderBy: { observedAt: "desc" },
        take: 25,
      },
      experiences: {
        include: {
          user: { select: { name: true } },
          healthPlan: true,
          specialty: true,
        },
        orderBy: { createdAt: "desc" },
        take: 40,
      },
    },
  });

  if (!provider) notFound();

  let favorited = false;
  let userPlanStatus: string | null = null;
  let userPlanSource: string | null = null;
  let userPlanVerifiedAt: Date | null = null;
  let userPlanSourceUrl: string | null = null;
  let userPlanOperator: string | null = null;
  let planName: string | null = null;
  let activePlanId: string | null = null;
  let operatorSide: string | null = null;
  let communitySide: string | null = null;

  if (session?.user?.id) {
    const fav = await prisma.favorite.findUnique({
      where: { userId_providerId: { userId: session.user.id, providerId: id } },
    });
    favorited = Boolean(fav);
    const up = await prisma.userPlan.findFirst({
      where: { userId: session.user.id, isActive: true },
      include: { healthPlan: true },
    });
    if (up) {
      activePlanId = up.healthPlanId;
      planName = `${up.healthPlan.operator} ${up.healthPlan.name}`;
    }
  }

  if (!activePlanId) {
    const g = await resolveActivePlan({ planId: sp.planId });
    activePlanId = g.healthPlanId;
    planName = g.planName;
  }

  if (activePlanId) {
    const plan = provider.plans.find((p) => p.healthPlanId === activePlanId);
    userPlanStatus = normalizeStatus(plan?.status ?? null);
    userPlanSource = normalizeSourceType(plan?.sourceType || plan?.source);
    userPlanVerifiedAt = plan?.lastVerifiedAt ?? plan?.lastCheckedAt ?? null;
    userPlanSourceUrl = plan?.sourceUrl ?? null;
    userPlanOperator = plan?.healthPlan?.operator ?? null;

    const relatedHistory = provider.planHistory.filter(
      (h) => h.healthPlanId === activePlanId
    );
    const official = relatedHistory.find((h) =>
      ["operator", "clinic", "manual_admin"].includes(h.sourceType)
    );
    const community = relatedHistory.find((h) => h.sourceType === "community");
    operatorSide = official
      ? `${official.sourceType}: ${official.newStatus}`
      : plan && ["operator", "clinic", "manual_admin"].includes(userPlanSource || "")
        ? `${userPlanSource}: ${userPlanStatus}`
        : null;
    communitySide = community
      ? `community: ${community.newStatus}`
      : plan && userPlanSource === "community"
        ? `community: ${userPlanStatus}`
        : null;
  }

  const badge = statusBadge(userPlanStatus, userPlanSource);
  const hours = JSON.parse(provider.hoursJson || "{}") as Record<string, string>;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${provider.latitude},${provider.longitude}`;
  const wa = provider.whatsapp
    ? `https://wa.me/${provider.whatsapp}?text=${encodeURIComponent(
        `Olá! Encontrei ${provider.name} no Meu Plano e gostaria de agendar.`
      )}`
    : null;

  const planExperiences = activePlanId
    ? provider.experiences.filter((e) => e.healthPlanId === activePlanId)
    : provider.experiences;
  const acceptedCount = planExperiences.filter((e) => e.accepted).length;
  const deniedCount = planExperiences.filter((e) => !e.accepted).length;

  const tabs = [
    { id: "visao", label: "Visão geral" },
    { id: "planos", label: "Planos" },
    { id: "especialidades", label: "Especialidades" },
    { id: "comunidade", label: "Comunidade" },
    { id: "localizacao", label: "Localização" },
  ] as const;

  return (
    <main className="pb-10">
      <div className="relative h-44 bg-gradient-to-br from-brand-600 to-emerald-500 md:h-56">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={provider.photoUrl || ""}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-overlay"
        />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <a href="/buscar" className="rounded-full bg-white/90 p-2 shadow" aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </a>
          <span className="rounded-full bg-white/90 p-2 shadow" title={favorited ? "Favorito" : "Favoritar exige login"}>
            <Heart className={cn("h-5 w-5", favorited ? "fill-rose-500 text-rose-500" : "text-slate-700")} />
          </span>
        </div>
      </div>

      <div className="-mt-8 space-y-4 px-4 md:px-6">
        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {providerTypeLabel(provider.type)}
              </p>
              <h1 className="mt-1 text-xl font-extrabold text-slate-900">{provider.name}</h1>
              <p className="mt-1 text-sm text-slate-600">
                {provider.specialties.map((s) => s.specialty.name).join(" · ")}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold",
                badge.className
              )}
            >
              {badge.emoji} {badge.label}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              {provider.rating.toFixed(1)} ({provider.reviewCount})
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4 text-brand-500" />
              {provider.neighborhood}, {provider.city}
            </span>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            {userPlanStatus === "confirmed"
              ? `${formatRelativeDays(userPlanVerifiedAt)} · ${sourceLabel(userPlanSource ?? "operator")}`
              : userPlanStatus === "reported_not_accepting"
                ? "Usuários relataram que este local não aceita seu plano."
                : userPlanStatus === "listed"
                  ? `Consta na rede da operadora · ${formatRelativeDays(userPlanVerifiedAt)}`
                  : "Ainda sem confirmação recente para o seu plano."}
          </p>
          {userPlanSource === "operator" && (
            <p className="relative mt-1 text-xs text-slate-500">
              Fonte oficial
              {userPlanVerifiedAt &&
              Date.now() - new Date(userPlanVerifiedAt).getTime() < 36e5 * 24
                ? " · Atualizado hoje"
                : ""}
              {" · "}
              <SourceOriginLink
                operator={userPlanOperator}
                planName={planName}
                sourceUrl={userPlanSourceUrl}
                collectedAt={userPlanVerifiedAt}
              />
            </p>
          )}

          {userPlanStatus === "conflicting" && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <p className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-4 w-4" /> Informações conflitantes
              </p>
              <ul className="mt-2 space-y-1 text-xs">
                {operatorSide && <li>Operadora / clínica: {operatorSide}</li>}
                {communitySide && <li>Comunidade: {communitySide}</li>}
              </ul>
              <a
                href="#experiencia"
                className="mt-2 inline-block text-xs font-semibold text-amber-900 underline"
              >
                Confirmar situação
              </a>
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-3 text-sm font-semibold text-white"
              >
                <MessageCircle className="h-4 w-4" />
                Agendar pelo WhatsApp
              </a>
            )}
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 py-3 text-sm font-semibold text-brand-800"
            >
              <Navigation className="h-4 w-4" />
              Traçar rota
            </a>
          </div>
        </section>

        <nav className="flex gap-1 overflow-x-auto pb-1">
          {tabs.map((t) => (
            <a
              key={t.id}
              href={`/provedores/${id}?tab=${t.id}${sp.planId ? `&planId=${sp.planId}` : ""}`}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold",
                tab === t.id
                  ? "bg-brand-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600"
              )}
            >
              {t.label}
            </a>
          ))}
        </nav>

        {(tab === "visao" || tab === "comunidade") && (
          <div id="pedir-confirmacao">
            <ExperienceForm providerId={id} planName={planName} />
          </div>
        )}

        {tab === "visao" && (
          <>
            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                <Clock className="h-4 w-4" /> Horários
              </h2>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {Object.entries(hours).map(([day, h]) => (
                  <div key={day} className="flex justify-between gap-2 border-b border-slate-50 py-1">
                    <dt className="capitalize text-slate-500">{day}</dt>
                    <dd className="font-medium text-slate-800">{h}</dd>
                  </div>
                ))}
              </dl>
            </section>
            {provider.description && (
              <section className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-600 shadow-sm">
                {provider.description}
              </section>
            )}
            <ClaimProfileButton providerId={id} />
          </>
        )}

        {tab === "planos" && (
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Produtos exatos da operadora</h2>
            <ul className="mt-2 space-y-2">
              {provider.plans.map((p) => {
                const st = normalizeStatus(p.status);
                const src = normalizeSourceType(p.sourceType || p.source);
                const b = statusBadge(st, src);
                return (
                  <li
                    key={p.id}
                    className="rounded-xl bg-slate-50 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        {p.healthPlan.operator} {p.healthPlan.name}
                      </span>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", b.className)}>
                        {b.emoji} {b.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {sourceLabel(src)} · {formatRelativeDays(p.lastVerifiedAt ?? p.lastCheckedAt)}
                      {p.sourceUrl ? (
                        <>
                          {" · "}
                          <a href={p.sourceUrl} className="underline" target="_blank" rel="noreferrer">
                            fonte
                          </a>
                        </>
                      ) : null}
                    </p>
                  </li>
                );
              })}
            </ul>

            {provider.planHistory.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Histórico
                </h3>
                <ul className="mt-2 space-y-1.5 text-xs text-slate-600">
                  {provider.planHistory.slice(0, 8).map((h) => (
                    <li key={h.id}>
                      {h.healthPlan.operator} {h.healthPlan.name}: {h.previousStatus ?? "—"} →{" "}
                      {h.newStatus} ({h.sourceType}) · {formatRelativeDays(h.observedAt)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {tab === "especialidades" && (
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Especialidades</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {provider.specialties.map((s) => (
                <li
                  key={s.specialtyId}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
                >
                  {s.specialty.name}
                </li>
              ))}
            </ul>
          </section>
        )}

        {tab === "comunidade" && (
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Experiências recentes</h2>
            <p className="mt-1 text-xs text-slate-500">
              Baseado em relatos da comunidade · {acceptedCount} sim · {deniedCount} não
              {planName ? ` para ${planName}` : ""}
            </p>
            {planExperiences.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Ainda sem relatos nesta unidade.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {planExperiences.map((ex) => (
                  <li key={ex.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-800">
                        {ex.user.name.split(" ")[0]}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold",
                          ex.accepted ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        )}
                      >
                        {ex.accepted ? "SIM" : "NÃO"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {ex.healthPlan.operator} {ex.healthPlan.name}
                      {ex.specialty ? ` · ${ex.specialty.name}` : ""} ·{" "}
                      {formatRelativeDays(ex.createdAt)}
                    </p>
                    {ex.comment && <p className="mt-1 text-slate-700">{ex.comment}</p>}
                    <div className="mt-2">
                      <ReportButton targetType="experience" targetId={ex.id} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === "localizacao" && (
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Endereço e contato</h2>
            <p className="mt-2 text-sm text-slate-700">{provider.address}</p>
            <p className="text-xs text-slate-500">
              {provider.neighborhood} · {provider.city}/{provider.state}
              {provider.cep ? ` · CEP ${provider.cep}` : ""}
            </p>
            {provider.phone && (
              <a
                href={`tel:${provider.phone}`}
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700"
              >
                <Phone className="h-4 w-4" />
                {provider.phone}
              </a>
            )}
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white"
            >
              <Building2 className="h-4 w-4" />
              Abrir no mapa
            </a>
          </section>
        )}
      </div>
    </main>
  );
}
