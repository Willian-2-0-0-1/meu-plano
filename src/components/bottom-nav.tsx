import { Heart, Home, Search, User, Users } from "lucide-react";
import { headers } from "next/headers";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Início", icon: Home },
  { href: "/buscar", label: "Buscar", icon: Search },
  { href: "/comunidade", label: "Comunidade", icon: Users },
  { href: "/favoritos", label: "Favoritos", icon: Heart },
  { href: "/perfil", label: "Perfil", icon: User },
];

export async function BottomNav() {
  const h = await headers();
  const pathname = h.get("x-meu-plano-path") || "";

  const hide =
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/entrar") ||
    pathname.startsWith("/admin");

  if (hide) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200/80 bg-white/95 backdrop-blur-md safe-bottom">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pb-1 pt-1 md:max-w-3xl">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/" || pathname === ""
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <a
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-medium transition sm:text-[11px]",
                active ? "text-brand-600" : "text-slate-500 hover:text-slate-800"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "stroke-[2.5px]")} aria-hidden />
              {label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
