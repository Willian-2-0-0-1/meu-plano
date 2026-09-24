import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scoreDuplicate, pickBestMatch } from "../dedupe";
import {
  normalizeName,
  normalizePhone,
  normalizeCep,
  hashNormalizedProvider,
} from "../normalize";
import { parseAddressParts, parseResultsHtml } from "../unimed-campinas/parser";

describe("normalize", () => {
  it("normaliza nome com acentos e abreviações", () => {
    assert.equal(normalizeName("Dr. José da Silva"), "doutor jose da silva");
    assert.equal(normalizeName("Av. Paulista"), "avenida paulista");
  });

  it("normaliza telefone e CEP", () => {
    assert.equal(normalizePhone("(19) 3235-2077"), "1932352077");
    assert.equal(normalizeCep("13020-431"), "13020431");
  });

  it("content hash estável", () => {
    const a = hashNormalizedProvider({
      operator: "Unimed Campinas",
      planName: "PLANO X",
      providerName: "Fulano",
      phone: "1932352077",
      city: "Campinas",
    });
    const b = hashNormalizedProvider({
      operator: "Unimed Campinas",
      planName: "PLANO X",
      providerName: "Fulano",
      phone: "(19) 3235-2077",
      city: "Campinas",
    });
    assert.equal(a, b);
  });
});

describe("dedupe", () => {
  const base = {
    operator: "Unimed Campinas",
    planName: "P",
    providerName: "ADELAIDE APARECIDA THOME",
    city: "Campinas",
    state: "SP",
    sourceUrl: "https://example.com",
    collectedAt: new Date(),
  };

  it("une pelo CRM", () => {
    const m = scoreDuplicate(
      { ...base, providerDocument: "CRM 63201", operatorProviderId: "CRM:63201" },
      {
        id: "p1",
        name: "ADELAIDE APARECIDA THOME",
        documentCnpj: "CRM 63201",
        documentCnes: null,
        address: "AV BARAO",
        city: "Campinas",
        cep: "13020431",
        phone: "1932352077",
        latitude: -22.9,
        longitude: -47.0,
      },
      { operatorProviderId: "CRM:63201", candidateOperatorId: "CRM:63201" }
    );
    assert.ok(m);
    assert.equal(m!.reason, "operator_provider_id");
    assert.equal(m!.needsReview, false);
  });

  it("não une unidades diferentes só pelo nome parcial", () => {
    const m = scoreDuplicate(
      {
        ...base,
        providerName: "Hospital Rede Norte Unidade A",
        address: "Rua A, 100",
        postalCode: "13000-000",
      },
      {
        id: "p2",
        name: "Hospital Rede Norte Unidade B",
        documentCnpj: null,
        documentCnes: null,
        address: "Rua B, 200",
        city: "Campinas",
        cep: "13000-001",
        phone: null,
        latitude: -22.9,
        longitude: -47.0,
      }
    );
    assert.equal(m, null);
  });

  it("pickBestMatch escolhe maior confiança", () => {
    const best = pickBestMatch([
      { providerId: "a", confidence: 0.7, reason: "x", needsReview: true },
      { providerId: "b", confidence: 0.95, reason: "y", needsReview: false },
    ]);
    assert.equal(best?.providerId, "b");
  });
});

describe("parser unimed-campinas", () => {
  it("parseia endereço", () => {
    const p = parseAddressParts(
      "AV BARAO DE ITAPURA,1100 Compl: 6 ANDAR\nBOTAFOGO, CAMPINAS-SP CEP: 13020-431"
    );
    assert.equal(p.address, "AV BARAO DE ITAPURA");
    assert.equal(p.addressNumber, "1100");
    assert.equal(p.neighborhood, "BOTAFOGO");
    assert.equal(p.city, "CAMPINAS");
    assert.equal(p.state, "SP");
    assert.equal(p.postalCode, "13020431");
  });

  it("parseia HTML de resultado", () => {
    const html = `
      <div class="result"><header><h1>JOAO SILVA <span>(CRM 12345)</span></h1>
      <h2>DERMATOLOGIA <i></i><span>Consultorio</span></h2></header>
      <strong>R TESTE,10<br />CENTRO, CAMPINAS-SP CEP: 13010-000</strong>
      <a href="tel: 1933334444">(19) 3333-4444</a></div>`;
    const items = parseResultsHtml(html, {
      sourceUrl: "https://www.unimedcampinas.com.br/guia-medico/resultado",
      request: {},
      httpStatus: 200,
    });
    assert.equal(items.length, 1);
    assert.equal(items[0]!.name, "JOAO SILVA");
    assert.equal(items[0]!.crm, "12345");
    assert.ok(items[0]!.phones.includes("1933334444"));
  });
});
