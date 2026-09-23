import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveActivePlan } from "@/lib/guest-plan";
import { normalizeSourceType, normalizeStatus } from "@/lib/plan-status-helpers";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const session = await auth();
  const planIdParam = req.nextUrl.searchParams.get("planId");

  const provider = await prisma.provider.findUnique({
    where: { id },
    include: {
      specialties: { include: { specialty: true } },
      plans: { include: { healthPlan: true } },
      planHistory: {
        include: { healthPlan: true },
        orderBy: { observedAt: "desc" },
        take: 20,
      },
      experiences: {
        include: {
          user: { select: { name: true } },
          healthPlan: true,
          specialty: true,
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      },
    },
  });

  if (!provider) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  let activePlanId: string | null = null;
  if (session?.user?.id) {
    const up = await prisma.userPlan.findFirst({
      where: { userId: session.user.id, isActive: true },
    });
    activePlanId = up?.healthPlanId ?? null;
  }
  if (!activePlanId) {
    const resolved = await resolveActivePlan({ planId: planIdParam });
    activePlanId = resolved.healthPlanId;
  }

  const activePlan = activePlanId
    ? provider.plans.find((p) => p.healthPlanId === activePlanId)
    : null;

  return NextResponse.json({
    provider: {
      ...provider,
      plans: provider.plans.map((p) => ({
        ...p,
        status: normalizeStatus(p.status),
        sourceType: normalizeSourceType(p.sourceType || p.source),
      })),
    },
    activePlan: activePlan
      ? {
          ...activePlan,
          status: normalizeStatus(activePlan.status),
          sourceType: normalizeSourceType(activePlan.sourceType || activePlan.source),
        }
      : null,
  });
}
