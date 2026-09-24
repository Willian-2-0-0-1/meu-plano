import type { NormalizedProviderResult, RawProviderResult } from "../types";
import { parseAddressParts } from "./parser";
import type { UnimedCampinasRawItem } from "./types";
import { UNIMED_CAMPINAS } from "./types";

export function toRawProviderResult(item: UnimedCampinasRawItem): RawProviderResult {
  return {
    operator: UNIMED_CAMPINAS.operator,
    sourceUrl: item.sourceUrl,
    collectedAt: new Date(),
    httpStatus: item.httpStatus,
    requestPayload: item.request,
    rawPayload: item,
    operatorProviderId: item.crm ? `CRM:${item.crm}` : null,
  };
}

export function normalizeUnimedCampinas(
  raw: RawProviderResult,
  opts: { planName: string; planAnsCode?: string | null }
): NormalizedProviderResult | null {
  const item = raw.rawPayload as UnimedCampinasRawItem;
  if (!item?.name) return null;

  const addr = parseAddressParts(item.addressHtml);
  const phone = item.phones[0] ?? null;

  return {
    operator: UNIMED_CAMPINAS.operator,
    operatorId: null,
    planName: opts.planName,
    planAnsCode: opts.planAnsCode ?? null,
    providerName: item.name.trim(),
    providerDocument: item.crm ? `CRM ${item.crm}` : null,
    cnes: null,
    unitName: item.establishmentType ?? null,
    specialty: item.specialty ?? null,
    service: "Consulta",
    address: addr.address,
    addressNumber: addr.addressNumber,
    complement: addr.complement,
    neighborhood: addr.neighborhood,
    city: addr.city ?? UNIMED_CAMPINAS.defaults.city,
    state: addr.state ?? UNIMED_CAMPINAS.defaults.state,
    postalCode: addr.postalCode,
    phone,
    latitude: null,
    longitude: null,
    sourceUrl: raw.sourceUrl,
    collectedAt: raw.collectedAt,
    rawSourceId: null,
    operatorProviderId: item.crm ? `CRM:${item.crm}` : null,
  };
}
