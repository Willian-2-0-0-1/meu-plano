import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 dias

function sessionCookieName(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto");
  const secure =
    proto === "https" ||
    req.nextUrl.protocol === "https:" ||
    process.env.NODE_ENV === "production";
  return secure ? "__Secure-authjs.session-token" : "authjs.session-token";
}

/**
 * Login demo estável: valida credenciais e grava o cookie de sessão Auth.js
 * diretamente (sem callback CSRF). Sessão continua sendo lida pelo Auth.js.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const callbackUrl = String(body.callbackUrl ?? "/");

  if (!email || !password) {
    return NextResponse.json({ error: "Informe e-mail e senha." }, { status: 400 });
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "AUTH_SECRET não configurado." }, { status: 500 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
  }

  const cookieName = sessionCookieName(req);
  const token = await encode({
    token: {
      sub: user.id,
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    secret,
    salt: cookieName,
    maxAge: SESSION_MAX_AGE,
  });

  const res = NextResponse.json({
    ok: true,
    callbackUrl: callbackUrl.startsWith("/") ? callbackUrl : "/",
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });

  res.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: cookieName.startsWith("__Secure-"),
    maxAge: SESSION_MAX_AGE,
  });

  return res;
}
