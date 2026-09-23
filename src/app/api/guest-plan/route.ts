import { NextRequest, NextResponse } from "next/server";
import { GUEST_PLAN_COOKIE, serializeGuestPlan, parseGuestPlan } from "@/lib/guest-plan";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const raw = req.cookies.get(GUEST_PLAN_COOKIE)?.value;
  const guest = parseGuestPlan(raw);
  if (!guest) return NextResponse.json({ plan: null });
  const plan = await prisma.healthPlan.findUnique({ where: { id: guest.healthPlanId } });
  if (!plan) return NextResponse.json({ plan: null });
  return NextResponse.json({
    plan: { id: plan.id, operator: plan.operator, name: plan.name },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const healthPlanId = body.healthPlanId as string;
  if (!healthPlanId) {
    return NextResponse.json({ error: "healthPlanId obrigatório" }, { status: 400 });
  }
  const plan = await prisma.healthPlan.findUnique({ where: { id: healthPlanId } });
  if (!plan) {
    return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
  }

  const payload = serializeGuestPlan({
    healthPlanId: plan.id,
    operator: plan.operator,
    name: plan.name,
  });

  const res = NextResponse.json({
    ok: true,
    plan: { id: plan.id, operator: plan.operator, name: plan.name },
  });
  res.cookies.set(GUEST_PLAN_COOKIE, payload, {
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
    sameSite: "lax",
    httpOnly: false,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(GUEST_PLAN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
