import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

/**
 * Login demo via GET — navegação simples por link (sem depender de form submit).
 * Apenas para MVP local.
 */
export async function GET(req: NextRequest) {
  const role = req.nextUrl.searchParams.get("role");
  const callbackUrl = req.nextUrl.searchParams.get("callbackUrl") || "/";
  const safeCallback = callbackUrl.startsWith("/") ? callbackUrl : "/";

  const email = role === "admin" ? "admin@meuplano.app" : "demo@meuplano.app";
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.redirect(new URL("/entrar?error=demo", req.url));
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "AUTH_SECRET missing" }, { status: 500 });
  }

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:43123";
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const origin = host.startsWith("0.0.0.0")
    ? `${proto}://localhost:${host.split(":")[1] || "43123"}`
    : `${proto}://${host}`;

  const cookieName = "authjs.session-token";
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

  const res = NextResponse.redirect(new URL(safeCallback, origin), 303);
  res.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: false,
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
