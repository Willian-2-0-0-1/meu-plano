import { headers } from "next/headers";
import { Heart, Home, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Início", icon: Home },
  { href: "/buscar", label: "Buscar", icon: Search },
  { href: "/favoritos", label: "Favoritos", icon: Heart },
  { href: "/perfil", label: "Perfil", icon: User },
];

/** Server Component + <a> nativos — sem next/navigation (evita HMR quebrado) */
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
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pb-1 pt-1">
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
                "flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[11px] font-medium transition",
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
