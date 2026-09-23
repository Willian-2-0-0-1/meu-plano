import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const [providers, plans, specialties, verificationRequests, confirmations] =
    await Promise.all([
      prisma.provider.findMany({
        include: {
          specialties: { include: { specialty: true } },
          plans: { include: { healthPlan: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.healthPlan.findMany({ orderBy: [{ operator: "asc" }, { name: "asc" }] }),
      prisma.specialty.findMany({ orderBy: { name: "asc" } }),
      prisma.verificationRequest.findMany({
        include: {
          provider: true,
          healthPlan: true,
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.confirmation.findMany({
        include: {
          provider: true,
          healthPlan: true,
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

  return NextResponse.json({
    providers,
    plans,
    specialties,
    verificationRequests,
    confirmations,
  });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const body = await req.json();
  const action = body.action as string;

  if (action === "upsertProvider") {
    const data = body.data;
    if (data.id) {
      const updated = await prisma.provider.update({
        where: { id: data.id },
        data: {
          name: data.name,
          type: data.type,
          address: data.address,
          neighborhood: data.neighborhood,
          city: data.city,
          phone: data.phone,
          whatsapp: data.whatsapp,
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          rating: Number(data.rating ?? 4.5),
          openToday: Boolean(data.openToday ?? true),
          description: data.description,
        },
      });
      return NextResponse.json({ provider: updated });
    }
    const created = await prisma.provider.create({
      data: {
        name: data.name,
        type: data.type,
        address: data.address,
        neighborhood: data.neighborhood,
        city: data.city || "São Paulo",
        phone: data.phone,
        whatsapp: data.whatsapp,
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
        rating: Number(data.rating ?? 4.5),
        openToday: Boolean(data.openToday ?? true),
        description: data.description,
        photoUrl: `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(data.name)}`,
      },
    });
    return NextResponse.json({ provider: created });
  }

  if (action === "deleteProvider") {
    await prisma.provider.delete({ where: { id: body.id } });
    return NextResponse.json({ ok: true });
  }

  if (action === "upsertPlan") {
    const data = body.data;
    if (data.id) {
      const updated = await prisma.healthPlan.update({
        where: { id: data.id },
        data: {
          operator: data.operator,
          name: data.name,
          category: data.category,
        },
      });
      return NextResponse.json({ plan: updated });
    }
    const created = await prisma.healthPlan.create({
      data: {
        operator: data.operator,
        name: data.name,
        category: data.category,
      },
    });
    return NextResponse.json({ plan: created });
  }

  if (action === "deletePlan") {
    await prisma.healthPlan.delete({ where: { id: body.id } });
    return NextResponse.json({ ok: true });
  }

  if (action === "upsertSpecialty") {
    const data = body.data;
    const slug =
      data.slug ||
      data.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-");
    if (data.id) {
      const updated = await prisma.specialty.update({
        where: { id: data.id },
        data: {
          name: data.name,
          slug,
          category: data.category,
          keywords: data.keywords ?? "",
        },
      });
      return NextResponse.json({ specialty: updated });
    }
    const created = await prisma.specialty.create({
      data: {
        name: data.name,
        slug,
        category: data.category,
        keywords: data.keywords ?? "",
      },
    });
    return NextResponse.json({ specialty: created });
  }

  if (action === "deleteSpecialty") {
    await prisma.specialty.delete({ where: { id: body.id } });
    return NextResponse.json({ ok: true });
  }

  if (action === "setProviderPlan") {
    const { providerId, healthPlanId, status, source } = body.data;
    const record = await prisma.providerPlan.upsert({
      where: {
        providerId_healthPlanId: { providerId, healthPlanId },
      },
      create: {
        providerId,
        healthPlanId,
        status,
        source: source || "operator",
        lastVerifiedAt: status === "confirmed" ? new Date() : null,
      },
      update: {
        status,
        source: source || "operator",
        lastVerifiedAt: status === "confirmed" ? new Date() : undefined,
      },
    });
    return NextResponse.json({ providerPlan: record });
  }

  if (action === "updateVerification") {
    const updated = await prisma.verificationRequest.update({
      where: { id: body.id },
      data: { status: body.status },
    });
    return NextResponse.json({ request: updated });
  }

  return NextResponse.json({ error: "Ação desconhecida" }, { status: 400 });
}
