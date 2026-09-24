import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Faça login para denunciar." }, { status: 401 });
  }

  const body = await req.json();
  const { targetType, targetId, reason, details } = body;

  if (!targetType || !targetId || !reason) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const report = await prisma.commentReport.create({
    data: {
      userId: session.user.id,
      targetType,
      targetId,
      reason,
      details: details || null,
    },
  });

  return NextResponse.json({ ok: true, report, message: "Denúncia registrada. Obrigado." });
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }
  const reports = await prisma.commentReport.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ reports });
}
