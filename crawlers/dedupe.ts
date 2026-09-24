import type { NormalizedProviderResult } from "./types";
import {
  normalizeCep,
  normalizeDoc,
  normalizeName,
  normalizeText,
  phoneTail,
} from "./normalize";

export type DedupeMatch = {
  providerId: string;
  confidence: number;
  reason: string;
  needsReview: boolean;
};

type ProviderRow = {
  id: string;
  name: string;
  documentCnpj: string | null;
  documentCnes: string | null;
  address: string;
  city: string;
  cep: string | null;
  phone: string | null;
  latitude: number;
  longitude: number;
};

/**
 * Ordem: CNES → CNPJ → id oficial operadora → CEP+endereço+número → telefone → nome+endereço → coords+nome.
 * Baixa confiança → needsReview (não unir automaticamente).
 */
export function scoreDuplicate(
  row: NormalizedProviderResult,
  candidate: ProviderRow,
  opts?: { operatorProviderId?: string | null; candidateOperatorId?: string | null }
): DedupeMatch | null {
  const cnes = normalizeDoc(row.cnes);
  if (cnes && candidate.documentCnes && normalizeDoc(candidate.documentCnes) === cnes) {
    return { providerId: candidate.id, confidence: 0.99, reason: "cnes", needsReview: false };
  }

  const doc = normalizeDoc(row.providerDocument);
  const candDoc = normalizeDoc(candidate.documentCnpj);
  // CNPJ (14) — CRM curto não conta como CNPJ
  if (doc && doc.length >= 12 && candDoc && candDoc.length >= 12) {
    if (doc === candDoc || doc.slice(0, 8) === candDoc.slice(0, 8)) {
      return { providerId: candidate.id, confidence: 0.97, reason: "cnpj", needsReview: false };
    }
  }

  if (
    opts?.operatorProviderId &&
    opts.candidateOperatorId &&
    opts.operatorProviderId === opts.candidateOperatorId
  ) {
    return {
      providerId: candidate.id,
      confidence: 0.95,
      reason: "operator_provider_id",
      needsReview: false,
    };
  }

  // CRM match via document field "CRM 123"
  if (doc && candDoc && doc === candDoc && row.providerDocument?.toUpperCase().includes("CRM")) {
    return { providerId: candidate.id, confidence: 0.94, reason: "crm", needsReview: false };
  }

  const sameName = normalizeName(row.providerName) === normalizeName(candidate.name);
  const cep = normalizeCep(row.postalCode);
  const candCep = normalizeCep(candidate.cep);
  const sameCep = Boolean(cep && candCep && cep === candCep);
  const addrA = normalizeText(
    [row.address, row.addressNumber].filter(Boolean).join(" ")
  );
  const addrB = normalizeText(candidate.address);
  const sameAddress =
    Boolean(addrA && addrB) &&
    (addrA === addrB || addrA.includes(addrB.slice(0, 16)) || addrB.includes(addrA.slice(0, 16)));

  if (sameName && sameCep && sameAddress) {
    return {
      providerId: candidate.id,
      confidence: 0.9,
      reason: "cep_address_name",
      needsReview: false,
    };
  }

  const phoneA = phoneTail(row.phone);
  const phoneB = phoneTail(candidate.phone);
  if (sameName && phoneA && phoneB && phoneA === phoneB) {
    return {
      providerId: candidate.id,
      confidence: 0.85,
      reason: "phone_name",
      needsReview: false,
    };
  }

  if (sameName && sameAddress) {
    return {
      providerId: candidate.id,
      confidence: 0.75,
      reason: "name_address",
      needsReview: true,
    };
  }

  if (
    sameName &&
    row.latitude != null &&
    row.longitude != null &&
    Math.abs(candidate.latitude - row.latitude) < 0.0008 &&
    Math.abs(candidate.longitude - row.longitude) < 0.0008
  ) {
    return {
      providerId: candidate.id,
      confidence: 0.7,
      reason: "coords_name",
      needsReview: true,
    };
  }

  return null;
}

export function pickBestMatch(matches: DedupeMatch[]): DedupeMatch | null {
  if (!matches.length) return null;
  return [...matches].sort((a, b) => b.confidence - a.confidence)[0] ?? null;
}
