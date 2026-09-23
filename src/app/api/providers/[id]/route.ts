import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  const provider = await prisma.provider.findUnique({
    where: { id },
    include: {
      specialties: { include: { specialty: true } },
      plans: { include: { healthPlan: true } },
      confirmations: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { healthPlan: true, user: { select: { name: true } } },
      },
    },
  });

  if (!provider) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  let activePlanId: string | null = null;
  let favorited = false;
  if (session?.user?.id) {
    const up = await prisma.userPlan.findFirst({
      where: { userId: session.user.id, isActive: true },
    });
    activePlanId = up?.healthPlanId ?? null;
    const fav = await prisma.favorite.findUnique({
      where: {
        userId_providerId: { userId: session.user.id, providerId: id },
      },
    });
    favorited = Boolean(fav);
  }

  const planForUser = activePlanId
    ? provider.plans.find((p) => p.healthPlanId === activePlanId)
    : null;

  return NextResponse.json({
    provider: {
      ...provider,
      hours: JSON.parse(provider.hoursJson || "{}"),
      specialties: provider.specialties.map((s) => s.specialty),
      userPlanStatus: planForUser?.status ?? null,
      userPlanSource: planForUser?.source ?? null,
      userPlanVerifiedAt: planForUser?.lastVerifiedAt ?? null,
      favorited,
    },
  });
}
