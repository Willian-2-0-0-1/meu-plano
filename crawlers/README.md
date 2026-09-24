# Crawlers — Meu Plano

Pipeline **fora do request path** do Next.js:

```
Worker → RAW → normalize → dedupe → provider + evidence + provider_plan + history
```

## Adapters

| id | Tipo | Operadora |
|----|------|-----------|
| `unimed-campinas` | **REAL** | Unimed Campinas (guia médico público) |
| `unimed`, `amil`, `sulamerica`, `bradesco`, `intermedica` | MOCK | fixtures |

## Por que Unimed Campinas?

- Guia público sem login de beneficiário
- Sem CAPTCHA no fluxo testado
- Especialidades via JSON (`?handler=Especialidades`)
- Resultado HTML estruturado (`/guia-medico/resultado?...`)
- Filtros plano / cidade / especialidade

## Worker

```bash
# Processa 1 job da fila
npm run crawler:worker -- --once

# Execução direta (teste real pequeno)
npm run crawler:run -- --adapter unimed-campinas --city Campinas --specialty Dermatologia --limit 8

# Poll contínuo
npm run crawler:worker -- --poll 5000
```

Admin enfileira job (`enqueueCrawler`); o worker consome. O app continua ok se o worker estiver parado.

## Deduplicação

CNES → CNPJ → id operadora/CRM → CEP+endereço → telefone → nome+endereço → coords+nome.  
Confiança baixa → `ProviderDedupeReview` (admin: Mesclar / Manter separado).

## Segurança

Só dados públicos. Sem cookies de usuário, carteirinha, CPF ou tokens de beneficiário.
