import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Faça login para reivindicar o perfil." },
      { status: 401 }
    );
  }

  const body = await req.json();
  const providerId = body.providerId as string;
  const message = (body.message as string) || null;

  if (!providerId) {
    return NextResponse.json({ error: "providerId obrigatório" }, { status: 400 });
  }

  const claim = await prisma.profileClaim.create({
    data: {
      userId: session.user.id,
      providerId,
      message,
    },
  });

  return NextResponse.json({
    ok: true,
    claim,
    message:
      "Solicitação registrada. Em breve entraremos em contato para validar se você representa esta clínica.",
  });
}
