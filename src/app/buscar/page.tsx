import { Suspense } from "react";
import { SearchExperience } from "@/components/search-experience";

function SearchInner({
  searchParams,
}: {
  searchParams: { q?: string; type?: string; specialty?: string };
}) {
  return (
    <main className="px-4 pb-8 pt-6 md:px-6">
      <h1 className="text-xl font-extrabold text-slate-900">Buscar atendimento</h1>
      <p className="mt-1 text-sm text-slate-600">
        Digite naturalmente, como “Dermatologista perto de mim” ou “Onde fazer ressonância pelo meu plano?”.
      </p>
      <div className="mt-4">
        <SearchExperience
          initialQuery={searchParams.q ?? ""}
          initialType={searchParams.type ?? ""}
          initialSpecialty={searchParams.specialty ?? ""}
        />
      </div>
    </main>
  );
}

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; specialty?: string }>;
}) {
  const sp = await searchParams;
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Carregando busca…</div>}>
      <SearchInner searchParams={sp} />
    </Suspense>
  );
}
