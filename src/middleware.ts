import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/** Rotas acessíveis sem login (leitura / busca / comunidade) */
const publicExact = [
  "/",
  "/entrar",
  "/onboarding",
  "/buscar",
  "/comunidade",
  "/premium",
  "/ajuda",
  "/manifest.webmanifest",
  "/sw.js",
];

const publicPrefixes = [
  "/provedores",
  "/api/plans",
  "/api/search",
  "/api/providers",
  "/api/experiences",
  "/api/guest-plan",
  "/api/demo-login",
  "/api/login",
  "/api/auth",
];

/** Ações que exigem login — middleware deixa passar API para retornar 401 */
const authRequiredPaths = [
  "/favoritos",
  "/perfil",
  "/admin",
];

function isPublic(pathname: string): boolean {
  if (publicExact.some((p) => pathname === p)) return true;
  if (publicPrefixes.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const secureCookie =
    req.nextUrl.protocol === "https:" || process.env.NODE_ENV === "production";
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie,
  });

  const needsAuth = authRequiredPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (!token && needsAuth) {
    const url = req.nextUrl.clone();
    url.pathname = "/entrar";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Visitantes em rotas públicas: nunca redirecionar para /entrar
  if (!token && !isPublic(pathname) && !pathname.startsWith("/api/")) {
    // Outras páginas desconhecidas → home (não login)
    if (pathname !== "/") {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
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
