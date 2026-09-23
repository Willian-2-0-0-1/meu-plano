import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const plans = await prisma.healthPlan.findMany({
    orderBy: [{ operator: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ plans });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Faça login." }, { status: 401 });
  }

  const body = await req.json();
  const { healthPlanId, planNumber, city, latitude, longitude } = body;

  if (!healthPlanId) {
    return NextResponse.json({ error: "Plano obrigatório" }, { status: 400 });
  }

  await prisma.userPlan.updateMany({
    where: { userId: session.user.id, isActive: true },
    data: { isActive: false },
  });

  const userPlan = await prisma.userPlan.create({
    data: {
      userId: session.user.id,
      healthPlanId,
      planNumber: planNumber || null,
      isActive: true,
    },
    include: { healthPlan: true },
  });

  if (city || latitude || longitude) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        city: city ?? undefined,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
      },
    });
  }

  return NextResponse.json({ ok: true, userPlan });
}
