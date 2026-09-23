import Link from "next/link";
import { ChevronRight } from "lucide-react";

const categories = [
  {
    slug: "medico",
    title: "Não encontrei médico",
    body: "Se a busca não retornou especialistas do seu plano, amplie a distância, inclua não confirmados ou peça confirmação em um local da rede.",
  },
  {
    slug: "exame",
    title: "Exame não autorizado",
    body: "Autorizações dependem da operadora. Guarde o pedido médico e o protocolo. Em breve o Meu Plano+ ajudará a orientar seus direitos.",
  },
  {
    slug: "demora",
    title: "Demora na autorização",
    body: "Prazos regulatórios variam. Anote data do pedido e canais usados. Use o app para achar outro local já confirmado enquanto aguarda.",
  },
  {
    slug: "negado",
    title: "Atendimento negado",
    body: "Se um local que aparecia como aceito negou o atendimento, registre no app (Sim/Não após a visita). Isso atualiza o status para outras pessoas.",
  },
  {
    slug: "hospital",
    title: "Não encontrei hospital",
    body: "Tente o atalho Pronto atendimento ou filtre por hospital na busca. Em emergência, ligue 192 — o app não substitui atendimento de urgência.",
  },
  {
    slug: "operadora",
    title: "Quero falar com a operadora",
    body: "Use o SAC da sua operadora e anote o protocolo. Números fictícios de demo: Unimed 0800-000-0001 · SulAmérica 0800-000-0002 · Amil 0800-000-0003.",
  },
];

export default async function AjudaPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const sp = await searchParams;
  const selected = categories.find((c) => c.slug === sp.cat);

  if (selected) {
    return (
      <main className="px-4 pb-8 pt-6 md:px-6">
        <Link href="/ajuda" className="text-sm font-medium text-brand-700">
          ← Voltar
        </Link>
        <h1 className="mt-3 text-xl font-extrabold text-slate-900">{selected.title}</h1>
        <p className="mt-3 rounded-2xl border border-slate-100 bg-white p-4 text-sm leading-relaxed text-slate-700 shadow-sm">
          {selected.body}
        </p>
        <p className="mt-4 text-xs text-slate-500">
          Conteúdo informativo (MVP). Em breve: assistente de direitos do consumidor no Meu Plano+.
        </p>
        <Link
          href="/premium"
          className="mt-4 inline-flex rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Ver Meu Plano+
        </Link>
      </main>
    );
  }

  return (
    <main className="px-4 pb-8 pt-6 md:px-6">
      <h1 className="text-xl font-extrabold text-slate-900">Meu plano não resolveu</h1>
      <p className="mt-1 text-sm text-slate-600">
        Escolha o que aconteceu. Vamos te orientar com informações úteis (demo).
      </p>
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/ajuda?cat=${c.slug}`}
            className="flex items-center gap-3 border-b border-slate-50 px-4 py-3.5 last:border-0 hover:bg-slate-50"
          >
            <span className="flex-1 text-sm font-medium text-slate-800">{c.title}</span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </Link>
        ))}
      </div>
    </main>
  );
}
