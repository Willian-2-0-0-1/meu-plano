import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

function sessionCookieName(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto");
  const secure =
    proto === "https" ||
    req.nextUrl.protocol === "https:" ||
    process.env.NODE_ENV === "production";
  return secure ? "__Secure-authjs.session-token" : "authjs.session-token";
}

async function authenticate(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return user;
}

async function buildSessionCookie(req: NextRequest, user: {
  id: string;
  email: string;
  name: string;
  role: string;
}) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET missing");
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
  return {
    cookieName,
    token,
    secure: cookieName.startsWith("__Secure-"),
  };
}

/** JSON login (SPA) */
export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";

  // Form HTML clássico (funciona sem JS)
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const callbackUrl = String(form.get("callbackUrl") ?? "/");
    const safeCallback = callbackUrl.startsWith("/") ? callbackUrl : "/";

    const user = await authenticate(email, password);
    if (!user) {
      const url = req.nextUrl.clone();
      url.pathname = "/entrar";
      url.searchParams.set("error", "credenciais");
      url.searchParams.set("callbackUrl", safeCallback);
      return NextResponse.redirect(url, 303);
    }

    const session = await buildSessionCookie(req, user);
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:43123";
    const proto = req.headers.get("x-forwarded-proto") || "http";
    // Evita redirect para 0.0.0.0 quando o server escuta em todas as interfaces
    const origin =
      host.startsWith("0.0.0.0")
        ? `${proto}://localhost:${host.split(":")[1] || "43123"}`
        : `${proto}://${host}`;
    const res = NextResponse.redirect(new URL(safeCallback, origin), 303);
    res.cookies.set(session.cookieName, session.token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: session.secure,
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "");
  const password = String(body.password ?? "");
  const callbackUrl = String(body.callbackUrl ?? "/");

  if (!email || !password) {
    return NextResponse.json({ error: "Informe e-mail e senha." }, { status: 400 });
  }

  const user = await authenticate(email, password);
  if (!user) {
    return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
  }

  const session = await buildSessionCookie(req, user);
  const res = NextResponse.json({
    ok: true,
    callbackUrl: callbackUrl.startsWith("/") ? callbackUrl : "/",
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
  res.cookies.set(session.cookieName, session.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: session.secure,
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
