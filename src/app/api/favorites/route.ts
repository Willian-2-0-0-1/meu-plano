import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ favorites: [] });
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    include: {
      provider: {
        include: {
          specialties: { include: { specialty: true } },
          plans: {
            include: { healthPlan: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const activePlan = await prisma.userPlan.findFirst({
    where: { userId: session.user.id, isActive: true },
  });

  const mapped = favorites.map((f) => {
    const plan = activePlan
      ? f.provider.plans.find((p) => p.healthPlanId === activePlan.healthPlanId)
      : null;
    return {
      id: f.provider.id,
      favoriteId: f.id,
      name: f.provider.name,
      type: f.provider.type,
      photoUrl: f.provider.photoUrl,
      address: f.provider.address,
      neighborhood: f.provider.neighborhood,
      city: f.provider.city,
      latitude: f.provider.latitude,
      longitude: f.provider.longitude,
      rating: f.provider.rating,
      reviewCount: f.provider.reviewCount,
      whatsapp: f.provider.whatsapp,
      specialties: f.provider.specialties.map((s) => s.specialty.name),
      planStatus: plan?.status ?? null,
      planSource: plan?.source ?? null,
      lastVerifiedAt: plan?.lastVerifiedAt ?? null,
      planName: plan
        ? `${plan.healthPlan.operator} ${plan.healthPlan.name}`
        : null,
    };
  });

  return NextResponse.json({ favorites: mapped });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Faça login para favoritar." }, { status: 401 });
  }

  const body = await req.json();
  const providerId = body.providerId as string;
  if (!providerId) {
    return NextResponse.json({ error: "providerId obrigatório" }, { status: 400 });
  }

  const existing = await prisma.favorite.findUnique({
    where: {
      userId_providerId: { userId: session.user.id, providerId },
    },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorited: false });
  }

  await prisma.favorite.create({
    data: { userId: session.user.id, providerId },
  });
  return NextResponse.json({ favorited: true });
}
