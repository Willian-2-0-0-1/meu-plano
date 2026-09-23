import Link from "next/link";
import { Check, Sparkles } from "lucide-react";

export default function PremiumPage() {
  return (
    <main className="px-4 pb-8 pt-6 md:px-6">
      <div className="rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-emerald-600 p-6 text-white shadow-lg">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5" /> Em breve
        </div>
        <h1 className="mt-4 text-2xl font-extrabold">Meu Plano+</h1>
        <p className="mt-2 text-sm text-white/90">
          Confirmações prioritárias, alertas quando o status do seu plano mudar e assistência
          guiada quando o plano não resolver.
        </p>
        <p className="mt-4 text-3xl font-extrabold">
          R$ 4,99<span className="text-base font-medium text-white/80">/mês</span>
        </p>
      </div>

      <ul className="mt-5 space-y-2">
        {[
          "Prioridade em pedidos de confirmação",
          "Alertas de mudança de status do plano",
          "Histórico completo de confirmações",
          "Assistente de direitos do consumidor (futuro)",
        ].map((item) => (
          <li
            key={item}
            className="flex items-start gap-2 rounded-2xl border border-slate-100 bg-white p-3 text-sm text-slate-700 shadow-sm"
          >
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            {item}
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled
        className="mt-6 w-full cursor-not-allowed rounded-2xl bg-slate-200 py-3.5 text-sm font-semibold text-slate-500"
      >
        Em breve — pagamentos ainda não disponíveis
      </button>

      <Link href="/" className="mt-4 block text-center text-sm font-medium text-brand-700">
        Voltar ao início
      </Link>
    </main>
  );
}
