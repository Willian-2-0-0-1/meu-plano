import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Faça login para pedir confirmação." }, { status: 401 });
  }

  const body = await req.json();
  const providerId = body.providerId as string;
  if (!providerId) {
    return NextResponse.json({ error: "providerId obrigatório" }, { status: 400 });
  }

  const activePlan = await prisma.userPlan.findFirst({
    where: { userId: session.user.id, isActive: true },
  });

  if (!activePlan) {
    return NextResponse.json(
      { error: "Selecione um plano primeiro." },
      { status: 400 }
    );
  }

  const existing = await prisma.verificationRequest.findFirst({
    where: {
      userId: session.user.id,
      providerId,
      healthPlanId: activePlan.healthPlanId,
      status: "pending",
    },
  });

  if (existing) {
    return NextResponse.json({
      ok: true,
      alreadyRequested: true,
      message: "Você já pediu confirmação para este local. Vamos avisar quando soubermos!",
    });
  }

  const request = await prisma.verificationRequest.create({
    data: {
      userId: session.user.id,
      providerId,
      healthPlanId: activePlan.healthPlanId,
      status: "pending",
      notes: "Solicitação via app (MVP — sem contato real)",
    },
  });

  return NextResponse.json({
    ok: true,
    request,
    message:
      "Pedido registrado! Em breve vamos verificar com o local se o seu plano é aceito.",
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ requests: [] });
  }

  const isAdmin = session.user.role === "admin";
  const requests = await prisma.verificationRequest.findMany({
    where: isAdmin ? undefined : { userId: session.user.id },
    include: {
      provider: true,
      healthPlan: true,
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ requests });
}
