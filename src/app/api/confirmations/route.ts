import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Faça login para confirmar." }, { status: 401 });
  }

  const body = await req.json();
  const providerId = body.providerId as string;
  const answer = body.answer as string; // yes | no | unknown

  if (!providerId || !["yes", "no", "unknown"].includes(answer)) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const activePlan = await prisma.userPlan.findFirst({
    where: { userId: session.user.id, isActive: true },
  });

  if (!activePlan) {
    return NextResponse.json(
      { error: "Selecione um plano no perfil primeiro." },
      { status: 400 }
    );
  }

  const confirmation = await prisma.confirmation.create({
    data: {
      userId: session.user.id,
      providerId,
      healthPlanId: activePlan.healthPlanId,
      answer,
    },
  });

  // Update provider_plans based on answer
  if (answer === "yes" || answer === "no") {
    const status = answer === "yes" ? "confirmed" : "not_accepted";
    await prisma.providerPlan.upsert({
      where: {
        providerId_healthPlanId: {
          providerId,
          healthPlanId: activePlan.healthPlanId,
        },
      },
      create: {
        providerId,
        healthPlanId: activePlan.healthPlanId,
        status,
        source: "user",
        lastVerifiedAt: new Date(),
      },
      update: {
        status,
        source: "user",
        lastVerifiedAt: new Date(),
      },
    });
  }

  return NextResponse.json({
    ok: true,
    confirmation,
    message:
      answer === "unknown"
        ? "Obrigado! Sua resposta foi registrada."
        : "Obrigado! Sua confirmação ajuda outras pessoas com o mesmo plano.",
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ confirmations: [] });
  }

  const confirmations = await prisma.confirmation.findMany({
    where: { userId: session.user.id },
    include: {
      provider: true,
      healthPlan: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ confirmations });
}
