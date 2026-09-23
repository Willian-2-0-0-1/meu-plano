import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProviderCard } from "@/components/provider-card";
import { Heart } from "lucide-react";
import { redirect } from "next/navigation";

export default async function FavoritosPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/entrar");

  const activePlan = await prisma.userPlan.findFirst({
    where: { userId: session.user.id, isActive: true },
  });

  const favorites = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    include: {
      provider: {
        include: {
          specialties: { include: { specialty: true } },
          plans: { include: { healthPlan: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const cards = favorites.map((f) => {
    const plan = activePlan
      ? f.provider.plans.find((p) => p.healthPlanId === activePlan.healthPlanId)
      : null;
    return {
      id: f.provider.id,
      name: f.provider.name,
      type: f.provider.type,
      rating: f.provider.rating,
      whatsapp: f.provider.whatsapp,
      neighborhood: f.provider.neighborhood,
      specialties: f.provider.specialties.map((s) => s.specialty.name),
      planStatus: plan?.status ?? null,
      planSource: plan?.source ?? null,
      lastVerifiedAt: plan?.lastVerifiedAt ?? null,
      planName: plan ? `${plan.healthPlan.operator} ${plan.healthPlan.name}` : null,
    };
  });

  return (
    <main className="px-4 pb-8 pt-6 md:px-6">
      <h1 className="text-xl font-extrabold text-slate-900">Favoritos</h1>
      <p className="mt-1 text-sm text-slate-600">Locais que você salvou para voltar depois.</p>

      {cards.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <Heart className="mx-auto h-8 w-8 text-slate-300" />
          <h2 className="mt-3 font-semibold text-slate-900">Nenhum favorito ainda</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ao ver um local que gostar, salve-o para voltar depois.
          </p>
          <a
            href="/buscar?q=Dermatologista"
            className="mt-4 inline-flex rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Buscar atendimento
          </a>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {cards.map((p) => (
            <ProviderCard key={p.id} provider={p} />
          ))}
        </div>
      )}
    </main>
  );
}
