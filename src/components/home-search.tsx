import { Search } from "lucide-react";

/** Form GET nativo — funciona sem JavaScript */
export function HomeSearch() {
  return (
    <form method="GET" action="/buscar" className="relative">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
      <input
        name="q"
        placeholder="Busque médico, especialidade, exame ou clínica"
        className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-24 text-sm shadow-sm outline-none ring-brand-500 placeholder:text-slate-400 focus:ring-2"
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white"
      >
        Buscar
      </button>
    </form>
  );
}
