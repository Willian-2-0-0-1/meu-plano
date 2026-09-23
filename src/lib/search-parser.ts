/**
 * Parser de linguagem natural (MVP) — preparado para troca por IA no futuro.
 * Extrai especialidade, tipo, intenção de proximidade e termos de exame.
 */

export type ParsedSearch = {
  raw: string;
  specialtyHints: string[];
  typeHints: string[];
  nearMe: boolean;
  acceptsPlanIntent: boolean;
  keywords: string[];
};

const SPECIALTY_PATTERNS: { pattern: RegExp; hint: string; type?: string }[] = [
  { pattern: /dermatolog/i, hint: "Dermatologia", type: "medico" },
  { pattern: /cardiolog/i, hint: "Cardiologia", type: "medico" },
  { pattern: /pediatr/i, hint: "Pediatria", type: "medico" },
  { pattern: /ortoped/i, hint: "Ortopedia", type: "medico" },
  { pattern: /ginecolog|obstetr/i, hint: "Ginecologia", type: "medico" },
  { pattern: /oftalmolog|oculista/i, hint: "Oftalmologia", type: "medico" },
  { pattern: /psiquiat/i, hint: "Psiquiatria", type: "medico" },
  { pattern: /fono(audi)?|fala/i, hint: "Fonoaudiologia", type: "terapia" },
  { pattern: /fisio/i, hint: "Fisioterapia", type: "terapia" },
  { pattern: /psic[oó]log/i, hint: "Psicologia", type: "terapia" },
  { pattern: /resson[aâ]ncia|\brm\b/i, hint: "Ressonância Magnética", type: "exame" },
  { pattern: /tomograf/i, hint: "Tomografia", type: "exame" },
  { pattern: /laborat[oó]rio|\blab\b|hemograma|exame de sangue/i, hint: "Exames Laboratoriais", type: "laboratorio" },
  { pattern: /pronto\s*(atendimento|socorro)|urg[eê]ncia|emerg[eê]ncia|\bupa\b/i, hint: "Pronto Atendimento", type: "pronto_atendimento" },
  { pattern: /cl[ií]nico\s*geral|cl[ií]nica\s*geral/i, hint: "Clínica Geral", type: "medico" },
  { pattern: /hospital/i, hint: "Pronto Atendimento", type: "hospital" },
  { pattern: /m[eé]dico/i, hint: "Clínica Geral", type: "medico" },
  { pattern: /exame/i, hint: "Exames Laboratoriais", type: "exame" },
  { pattern: /terapia/i, hint: "Psicologia", type: "terapia" },
];

export function parseSearchQuery(raw: string): ParsedSearch {
  const text = raw.trim();
  const specialtyHints: string[] = [];
  const typeHints: string[] = [];

  for (const { pattern, hint, type } of SPECIALTY_PATTERNS) {
    if (pattern.test(text)) {
      if (!specialtyHints.includes(hint)) specialtyHints.push(hint);
      if (type && !typeHints.includes(type)) typeHints.push(type);
    }
  }

  const nearMe = /perto de mim|próximo|proximo|aqui perto|na minha região|na minha regiao/i.test(text);
  const acceptsPlanIntent = /meu plano|pelo meu plano|aceita|credenciado|conveniado/i.test(text);

  const keywords = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  return {
    raw: text,
    specialtyHints,
    typeHints,
    nearMe,
    acceptsPlanIntent,
    keywords,
  };
}

/** Interface reservada para futura integração com LLM */
export type FutureAISearchAdapter = {
  parse(query: string, context: { planName?: string; city?: string }): Promise<ParsedSearch>;
};
