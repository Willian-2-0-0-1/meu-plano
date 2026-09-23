"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function InstalarPage() {
  const [ios, setIos] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        // @ts-expect-error ios
        window.navigator.standalone === true
    );
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  return (
    <main className="px-4 pb-8 pt-6 md:px-6">
      <Link href="/perfil" className="text-sm font-medium text-brand-700">
        ← Perfil
      </Link>
      <h1 className="mt-3 text-xl font-extrabold text-slate-900">Instalar Meu Plano</h1>
      <p className="mt-1 text-sm text-slate-600">
        Use como app na tela inicial — rápido e offline para telas já visitadas.
      </p>

      {standalone ? (
        <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
          O Meu Plano já está instalado neste dispositivo.
        </div>
      ) : ios ? (
        <ol className="mt-6 list-decimal space-y-3 rounded-2xl border border-slate-100 bg-white p-4 pl-8 text-sm text-slate-700 shadow-sm">
          <li>Toque no botão Compartilhar no Safari.</li>
          <li>
            Role e toque em <strong>Adicionar à Tela de Início</strong>.
          </li>
          <li>Confirme o nome “Meu Plano” e toque em Adicionar.</li>
        </ol>
      ) : (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-slate-600">
            No Android/Chrome, toque no botão abaixo ou use o menu do navegador → Instalar app.
          </p>
          <button
            type="button"
            disabled={!deferred}
            onClick={async () => {
              if (!deferred) return;
              await deferred.prompt();
            }}
            className="w-full rounded-2xl bg-brand-600 py-3.5 text-sm font-semibold text-white disabled:bg-slate-200 disabled:text-slate-500"
          >
            {deferred ? "Instalar Meu Plano" : "Prompt de instalação indisponível neste navegador"}
          </button>
        </div>
      )}
    </main>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}
