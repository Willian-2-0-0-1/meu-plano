"use client";

import { useEffect, useState } from "react";

const DISMISSED_KEY = "meuplano-install-dismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISSED_KEY) === "1") return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS safari
      window.navigator.standalone === true;

    if (isStandalone) return;

    if (isIos) {
      setIosHint(true);
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 z-50 mx-auto max-w-lg px-4">
      <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-lg shadow-brand-900/10">
        <p className="text-sm font-semibold text-slate-900">Instalar Meu Plano</p>
        {iosHint ? (
          <p className="mt-1 text-xs text-slate-600">
            No iPhone: toque em Compartilhar e depois em <strong>Adicionar à Tela de Início</strong>.
          </p>
        ) : (
          <p className="mt-1 text-xs text-slate-600">
            Instale o app na tela inicial para buscar mais rápido, sem digitar o site.
          </p>
        )}
        <div className="mt-3 flex gap-2">
          {!iosHint && deferred && (
            <button
              type="button"
              className="flex-1 rounded-xl bg-brand-600 py-2 text-sm font-semibold text-white"
              onClick={async () => {
                await deferred.prompt();
                setVisible(false);
                localStorage.setItem(DISMISSED_KEY, "1");
              }}
            >
              Instalar
            </button>
          )}
          <button
            type="button"
            className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-700"
            onClick={() => {
              setVisible(false);
              localStorage.setItem(DISMISSED_KEY, "1");
            }}
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}
