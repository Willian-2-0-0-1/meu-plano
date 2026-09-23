"use client";

import { useEffect, useState } from "react";
import { ProviderCard, type ProviderCardData } from "@/components/provider-card";
import Link from "next/link";
import { Heart } from "lucide-react";

export default function FavoritosPage() {
  const [favorites, setFavorites] = useState<ProviderCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/favorites")
      .then((r) => r.json())
      .then((d) => {
        setFavorites(d.favorites ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <main className="px-4 pb-8 pt-6 md:px-6">
      <h1 className="text-xl font-extrabold text-slate-900">Favoritos</h1>
      <p className="mt-1 text-sm text-slate-600">Locais que você salvou para voltar depois.</p>

      {loading && <p className="mt-8 text-sm text-slate-500">Carregando…</p>}

      {!loading && favorites.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <Heart className="mx-auto h-8 w-8 text-slate-300" />
          <h2 className="mt-3 font-semibold text-slate-900">Nenhum favorito ainda</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ao ver um local que gostar, toque no coração para salvar.
          </p>
          <Link
            href="/buscar"
            className="mt-4 inline-flex rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Buscar atendimento
          </Link>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {favorites.map((p) => (
          <ProviderCard key={p.id} provider={p} />
        ))}
      </div>
    </main>
  );
}
