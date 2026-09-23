import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { upsertPlanStatus } from "@/lib/plan-status";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const providerId = searchParams.get("providerId");
  const healthPlanId = searchParams.get("healthPlanId");
  const specialtyId = searchParams.get("specialtyId");
  const city = searchParams.get("city");
  const take = Math.min(Number(searchParams.get("take") || "30"), 100);

  const experiences = await prisma.providerExperience.findMany({
    where: {
      ...(providerId ? { providerId } : {}),
      ...(healthPlanId ? { healthPlanId } : {}),
      ...(specialtyId ? { specialtyId } : {}),
      ...(city
        ? { provider: { city: { contains: city } } }
        : {}),
    },
    include: {
      user: { select: { name: true } },
      provider: { select: { id: true, name: true, neighborhood: true, city: true } },
      healthPlan: { select: { operator: true, name: true } },
      specialty: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  return NextResponse.json({ experiences });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Faça login para confirmar atendimento." },
      { status: 401 }
    );
  }

  const body = await req.json();
  const providerId = body.providerId as string;
  const accepted = body.accepted as boolean;
  let healthPlanId = body.healthPlanId as string | undefined;
  const specialtyId = (body.specialtyId as string) || null;
  const comment = (body.comment as string) || null;
  const experienceDate = body.experienceDate
    ? new Date(body.experienceDate as string)
    : null;

  if (!providerId || typeof accepted !== "boolean") {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  if (!healthPlanId) {
    const up = await prisma.userPlan.findFirst({
      where: { userId: session.user.id, isActive: true },
    });
    healthPlanId = up?.healthPlanId;
  }

  if (!healthPlanId) {
    return NextResponse.json(
      { error: "Selecione um plano antes de confirmar." },
      { status: 400 }
    );
  }

  const experience = await prisma.providerExperience.create({
    data: {
      userId: session.user.id,
      providerId,
      healthPlanId,
      specialtyId,
      accepted,
      experienceDate,
      comment,
    },
  });

  // Também registra confirmação legada
  await prisma.confirmation.create({
    data: {
      userId: session.user.id,
      providerId,
      healthPlanId,
      answer: accepted ? "yes" : "no",
    },
  });

  const { conflict } = await upsertPlanStatus({
    providerId,
    healthPlanId,
    status: accepted ? "confirmed" : "reported_not_accepting",
    sourceType: "community",
    sourceName: "Relato de usuário",
    confidence: 0.55,
  });

  return NextResponse.json({
    ok: true,
    experience,
    conflict,
    message: conflict
      ? "Registrado. Há informações conflitantes nesta unidade — mostramos os dois lados."
      : "Obrigado! Sua confirmação ajuda outras pessoas com o mesmo plano.",
  });
}
