import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const publicPaths = ["/entrar", "/premium", "/manifest.webmanifest", "/sw.js", "/api/demo-login", "/api/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/login") ||
    pathname.startsWith("/api/demo-login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const secureCookie =
    req.nextUrl.protocol === "https:" || process.env.NODE_ENV === "production";
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie,
  });

  if (!token && !isPublic && !pathname.startsWith("/api/")) {
    const url = req.nextUrl.clone();
    url.pathname = "/entrar";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (token && pathname === "/entrar") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && token?.role !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  response.headers.set("x-meu-plano-path", pathname);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
