import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const GUEST_PLAN_COOKIE = "mp_guest_plan";

export type GuestPlan = {
  healthPlanId: string;
  operator: string;
  name: string;
};

export function serializeGuestPlan(plan: GuestPlan): string {
  return encodeURIComponent(JSON.stringify(plan));
}

export function parseGuestPlan(raw: string | undefined | null): GuestPlan | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(decodeURIComponent(raw)) as GuestPlan;
    if (!data.healthPlanId || !data.operator || !data.name) return null;
    return data;
  } catch {
    return null;
  }
}

/** Resolve plano ativo: sessão logada > cookie visitante > planId explícito */
export async function resolveActivePlan(opts?: {
  planId?: string | null;
  cookieHeader?: string | null;
}): Promise<{
  healthPlanId: string | null;
  planName: string | null;
  from: "session" | "cookie" | "param" | null;
}> {
  if (opts?.planId) {
    const plan = await prisma.healthPlan.findUnique({ where: { id: opts.planId } });
    if (plan) {
      return {
        healthPlanId: plan.id,
        planName: `${plan.operator} ${plan.name}`,
        from: "param",
      };
    }
  }

  // Session is resolved by caller when available; cookie fallback here
  const jar = await cookies();
  const guest = parseGuestPlan(jar.get(GUEST_PLAN_COOKIE)?.value);
  if (guest) {
    const plan = await prisma.healthPlan.findUnique({ where: { id: guest.healthPlanId } });
    if (plan) {
      return {
        healthPlanId: plan.id,
        planName: `${plan.operator} ${plan.name}`,
        from: "cookie",
      };
    }
  }

  return { healthPlanId: null, planName: null, from: null };
}
