/** Normalização compartilhada (caixa, acentos, telefone, CEP, abreviações). */

const ABBREV: Array<[RegExp, string]> = [
  [/\bav\.?\b/gi, "avenida"],
  [/\br\.?\b/gi, "rua"],
  [/\bdr\.?\b/gi, "doutor"],
  [/\bdra\.?\b/gi, "doutora"],
  [/\bprof\.?\b/gi, "professor"],
  [/\bjardim\b/gi, "jardim"],
  [/\bcj\.?\b/gi, "conjunto"],
  [/\bsl\.?\b/gi, "sala"],
  [/\band\.?\b/gi, "andar"],
  [/\bcompl\.?:?\b/gi, "complemento"],
];

export function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeText(value: string | null | undefined): string {
  if (!value) return "";
  let out = stripAccents(value).toLowerCase();
  for (const [re, repl] of ABBREV) {
    out = out.replace(re, repl);
  }
  return out.replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

export function normalizeName(name: string | null | undefined): string {
  return normalizeText(name);
}

export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return digits.slice(-11);
}

export function normalizeCep(cep: string | null | undefined): string | null {
  if (!cep) return null;
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  return digits;
}

export function normalizeDoc(doc: string | null | undefined): string | null {
  if (!doc) return null;
  const digits = doc.replace(/\D/g, "");
  return digits || null;
}

export function phoneTail(phone: string | null | undefined, n = 8): string | null {
  const p = normalizePhone(phone);
  return p ? p.slice(-n) : null;
}

export function contentHash(parts: Record<string, unknown>): string {
  const stable = JSON.stringify(parts, Object.keys(parts).sort());
  // FNV-1a 32-bit — suficiente para dedupe de conteúdo no MVP
  let h = 0x811c9dc5;
  for (let i = 0; i < stable.length; i++) {
    h ^= stable.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function hashNormalizedProvider(row: {
  operator: string;
  planName: string;
  providerName: string;
  providerDocument?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  specialty?: string | null;
}): string {
  return contentHash({
    operator: normalizeName(row.operator),
    plan: normalizeName(row.planName),
    name: normalizeName(row.providerName),
    doc: normalizeDoc(row.providerDocument),
    address: normalizeText(row.address),
    city: normalizeName(row.city),
    cep: normalizeCep(row.postalCode),
    phone: normalizePhone(row.phone),
    specialty: normalizeName(row.specialty),
  });
}
