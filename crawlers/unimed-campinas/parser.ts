import type { UnimedCampinasRawItem } from "./types";

function decodeHtml(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/gi, '"');
}

function stripTags(s: string): string {
  return decodeHtml(s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parser HTML do resultado público do Guia Médico Unimed Campinas.
 * Extrai nome, CRM, especialidade, endereço e telefones — sem inventar campos.
 */
export function parseResultsHtml(
  html: string,
  meta: { sourceUrl: string; request: Record<string, unknown>; httpStatus: number }
): UnimedCampinasRawItem[] {
  const chunks = html.split(/<div class="result"/i).slice(1);
  const out: UnimedCampinasRawItem[] = [];

  for (const chunk of chunks) {
    const block = `<div class="result"${chunk}`;
    const nameMatch = block.match(/<h1>([\s\S]*?)<\/h1>/i);
    if (!nameMatch) continue;

    const h1 = nameMatch[1];
    const crmMatch = h1.match(/\(\s*CRM\s+(\d+)\s*\)/i);
    const name = stripTags(h1.replace(/\(\s*CRM\s+\d+\s*\)/i, "")).trim();
    if (!name) continue;

    const h2Match = block.match(/<h2>([\s\S]*?)<\/h2>/i);
    let specialty: string | null = null;
    let establishmentType: string | null = null;
    if (h2Match) {
      const h2text = stripTags(h2Match[1]);
      const parts = h2text.split(/\s+/).filter(Boolean);
      // "DERMATOLOGIA Demais Estabelecimentos"
      if (parts.length) {
        specialty = parts[0] ?? null;
        if (parts.length > 1) establishmentType = parts.slice(1).join(" ");
      }
      const spanEst = h2Match[1].match(/<span>([\s\S]*?)<\/span>/i);
      if (spanEst) establishmentType = stripTags(spanEst[1]);
      const beforeIcon = h2Match[1].split(/<i[\s>]/i)[0];
      if (beforeIcon) specialty = stripTags(beforeIcon) || specialty;
    }

    const addrMatch = block.match(
      /fa-map-marked-alt[\s\S]*?<strong>([\s\S]*?)<\/strong>/i
    );
    const addressHtml = addrMatch ? decodeHtml(addrMatch[1]).replace(/<br\s*\/?>/gi, "\n") : null;

    const phones: string[] = [];
    for (const m of block.matchAll(/href="tel:\s*([^"]+)"/gi)) {
      const tel = m[1].replace(/\D/g, "");
      if (tel && !phones.includes(tel)) phones.push(tel);
    }

    const mapMatch = block.match(
      /href="(https:\/\/www\.google\.com\.br\/maps\/place\/[^"]+)"/i
    );

    out.push({
      name,
      crm: crmMatch?.[1] ?? null,
      specialty,
      establishmentType,
      addressHtml,
      phones,
      mapUrl: mapMatch?.[1] ?? null,
      sourceUrl: meta.sourceUrl,
      request: meta.request,
      httpStatus: meta.httpStatus,
    });
  }

  return out;
}

export function parseAddressParts(addressHtml: string | null | undefined): {
  address: string | null;
  addressNumber: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
} {
  if (!addressHtml) {
    return {
      address: null,
      addressNumber: null,
      complement: null,
      neighborhood: null,
      city: null,
      state: null,
      postalCode: null,
    };
  }

  const lines = addressHtml
    .split(/\n+/)
    .map((l) => stripTags(l))
    .filter(Boolean);

  const line1 = lines[0] ?? "";
  const line2 = lines[1] ?? "";

  let complement: string | null = null;
  let streetPart = line1;
  const complMatch = line1.match(/\bCompl:\s*(.+)$/i);
  if (complMatch) {
    complement = complMatch[1].trim();
    streetPart = line1.slice(0, complMatch.index).trim();
  }

  let addressNumber: string | null = null;
  const numMatch = streetPart.match(/,(\d+)\s*$/);
  if (numMatch) {
    addressNumber = numMatch[1];
    streetPart = streetPart.slice(0, numMatch.index).trim();
  }

  let neighborhood: string | null = null;
  let city: string | null = null;
  let state: string | null = null;
  let postalCode: string | null = null;

  const loc = line2.match(/^(.+?),\s*(.+?)-([A-Z]{2})\s+CEP:\s*([\d-]+)/i);
  if (loc) {
    neighborhood = loc[1].trim();
    city = loc[2].trim();
    state = loc[3].toUpperCase();
    postalCode = loc[4].replace(/\D/g, "");
  }

  return {
    address: streetPart || null,
    addressNumber,
    complement,
    neighborhood,
    city,
    state,
    postalCode,
  };
}
