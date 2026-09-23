import { ProviderCard } from "@/components/provider-card";
import { runProviderSearch } from "@/lib/search";
import { Search } from "lucide-react";
import Link from "next/link";

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    specialty?: string;
    distance?: string;
    acceptsPlan?: string;
    includeUnconfirmed?: string;
    place?: string;
    planId?: string;
    locationMode?: string;
    lat?: string;
    lng?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const distance = sp.distance ?? "25";

  const { results, meta } = await runProviderSearch({
    q,
    type: sp.type,
    specialty: sp.specialty,
    distance,
    acceptsPlan: sp.acceptsPlan,
    includeUnconfirmed: sp.includeUnconfirmed ?? "1",
    place: sp.place,
    planId: sp.planId,
    locationMode: sp.locationMode,
    lat: sp.lat,
    lng: sp.lng,
  });

  const planQs = sp.planId ? `&planId=${encodeURIComponent(sp.planId)}` : "";

  return (
    <main className="px-4 pb-8 pt-6 md:px-6">
      <h1 className="text-xl font-extrabold text-slate-900">Buscar atendimento</h1>
      <p className="mt-1 text-sm text-slate-600">
        Digite naturalmente, como “Dermatologista perto de mim”. Sem login obrigatório.
      </p>

      <form method="GET" action="/buscar" className="mt-4 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Ex.: Dermatologista perto de mim"
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none ring-brand-500 focus:ring-2"
            />
          </div>
          <button
            type="submit"
            className="rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Buscar
          </button>
        </div>
        {sp.type ? <input type="hidden" name="type" value={sp.type} /> : null}
        {sp.planId ? <input type="hidden" name="planId" value={sp.planId} /> : null}
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            { d: "5", label: "5 km" },
            { d: "10", label: "10 km" },
            { d: "25", label: "25 km" },
          ].map(({ d, label }) => (
            <a
              key={d}
              href={`/buscar?q=${encodeURIComponent(q)}&distance=${d}${sp.type ? `&type=${sp.type}` : ""}${planQs}`}
              className={`rounded-full border px-3 py-1.5 font-medium ${
                distance === d
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              {label}
            </a>
          ))}
          <a
            href={`/buscar?q=${encodeURIComponent(q)}&distance=${distance}&acceptsPlan=1${planQs}`}
            className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-medium text-emerald-800"
          >
            Só quem aceita
          </a>
          <a
            href={`/buscar?q=${encodeURIComponent(q)}&distance=25&includeUnconfirmed=1${planQs}`}
            className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 font-medium text-amber-900"
          >
            Incluir listados
          </a>
        </div>
      </form>

      {meta.activePlanName ? (
        <p className="mt-3 text-xs text-slate-500">
          Resultados para o plano <strong className="text-slate-700">{meta.activePlanName}</strong>
          {results.length > 0 ? ` · ${results.length} locais` : ""}
        </p>
      ) : (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Nenhum plano selecionado.{" "}
          <Link href="/" className="font-semibold underline">
            Escolha seu plano na home
          </Link>{" "}
          para ver status de aceitação.
        </p>
      )}

      {results.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
          <h3 className="text-base font-semibold text-slate-900">Nenhum resultado por perto</h3>
          <p className="mt-1 text-sm text-slate-500">
            Tente ampliar a busca ou incluir locais ainda listados na rede.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <a
              href={`/buscar?q=${encodeURIComponent(q || "médico")}&distance=25&includeUnconfirmed=1${planQs}`}
              className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Aumentar distância
            </a>
            <a
              href="/ajuda"
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-900"
            >
              Pedir ajuda
            </a>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {results.map((p) => (
            <ProviderCard key={p.id} provider={p} showRequestConfirm />
          ))}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-slate-400">
        <a href={`/buscar?q=Dermatologista${planQs}`} className="underline">
          Atalho demo: Dermatologista
        </a>
      </p>
    </main>
  );
}
