"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function ServiceWorkerRegister() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // Na tela de login, desregistra SW para evitar cache antigo bloqueando submit/nav
    if (pathname.startsWith("/entrar")) {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => void r.unregister());
      });
      if ("caches" in window) {
        void caches.keys().then((keys) => keys.forEach((k) => void caches.delete(k)));
      }
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, [pathname]);

  return null;
}
