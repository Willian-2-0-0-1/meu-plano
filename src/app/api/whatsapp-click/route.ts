import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json();
  const providerId = body.providerId as string;
  if (!providerId) {
    return NextResponse.json({ error: "providerId obrigatório" }, { status: 400 });
  }

  await prisma.whatsAppClick.create({
    data: {
      userId: session?.user?.id ?? null,
      providerId,
    },
  });

  return NextResponse.json({ ok: true });
}
