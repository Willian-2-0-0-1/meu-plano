import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  cn,
  formatRelativeDays,
  providerTypeLabel,
  sourceLabel,
  statusBadge,
} from "@/lib/utils";
import {
  ArrowLeft,
  Heart,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Star,
  Clock,
} from "lucide-react";
import { ConfirmationActions } from "@/components/confirmation-actions";

export default async function ProviderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const provider = await prisma.provider.findUnique({
    where: { id },
    include: {
      specialties: { include: { specialty: true } },
      plans: { include: { healthPlan: true } },
    },
  });

  if (!provider) notFound();

  let favorited = false;
  let userPlanStatus: string | null = null;
  let userPlanSource: string | null = null;
  let userPlanVerifiedAt: Date | null = null;
  let planName: string | null = null;

  if (session?.user?.id) {
    const up = await prisma.userPlan.findFirst({
      where: { userId: session.user.id, isActive: true },
      include: { healthPlan: true },
    });
    const fav = await prisma.favorite.findUnique({
      where: { userId_providerId: { userId: session.user.id, providerId: id } },
    });
    favorited = Boolean(fav);
    if (up) {
      planName = `${up.healthPlan.operator} ${up.healthPlan.name}`;
      const plan = provider.plans.find((p) => p.healthPlanId === up.healthPlanId);
      userPlanStatus = plan?.status ?? null;
      userPlanSource = plan?.source ?? null;
      userPlanVerifiedAt = plan?.lastVerifiedAt ?? null;
    }
  }

  const badge = statusBadge(userPlanStatus ?? "unconfirmed");
  const hours = JSON.parse(provider.hoursJson || "{}") as Record<string, string>;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${provider.latitude},${provider.longitude}`;
  const wa = provider.whatsapp
    ? `https://wa.me/${provider.whatsapp}?text=${encodeURIComponent(
        `Olá! Encontrei ${provider.name} no Meu Plano e gostaria de agendar.`
      )}`
    : null;

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
          <form action={`/api/favorites`} method="POST">
            {/* Favoritos via client island abaixo */}
          </form>
          <span className="rounded-full bg-white/90 p-2 shadow" title={favorited ? "Favorito" : ""}>
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
              {badge.label}
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
              : userPlanStatus === "not_accepted"
                ? "Usuários reportaram que este local não aceita seu plano."
                : "Ainda sem confirmação recente para o seu plano."}
          </p>

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

          {userPlanStatus === "unconfirmed" && (
            <div id="pedir-confirmacao" className="mt-2">
              <ConfirmationActions providerId={id} mode="request" />
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Endereço e contato</h2>
          <p className="mt-2 text-sm text-slate-700">{provider.address}</p>
          {provider.phone && (
            <a
              href={`tel:${provider.phone}`}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700"
            >
              <Phone className="h-4 w-4" />
              {provider.phone}
            </a>
          )}
        </section>

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

        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Planos neste local</h2>
          <ul className="mt-2 space-y-2">
            {provider.plans.map((p) => {
              const b = statusBadge(p.status);
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm"
                >
                  <span>
                    {p.healthPlan.operator} {p.healthPlan.name}
                  </span>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", b.className)}>
                    {b.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {provider.description && (
          <section className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-600 shadow-sm">
            {provider.description}
          </section>
        )}

        <ConfirmationActions providerId={id} mode="confirm" planName={planName} />
      </div>
    </main>
  );
}
