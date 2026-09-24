# Crawlers MOCK — Meu Plano

Adapters stub para testar o pipeline de proveniência **sem scrapers reais**.

## Adapters

| id | Operadora |
|----|-----------|
| `unimed` | Unimed |
| `amil` | Amil |
| `sulamerica` | SulAmérica |
| `bradesco` | Bradesco Saúde |
| `intermedica` | NotreDame Intermédica |

## Pipeline

```
crawler → crawler_raw_results → normalização → deduplicação → provider → provider_plan_status → histórico
```

Nunca inserir resultado cru na tabela principal.

## Como rodar

Via admin (aba Crawlers) ou API:

```bash
curl -X POST http://localhost:43123/api/admin \
  -H 'Content-Type: application/json' \
  -d '{"action":"runCrawler","adapter":"sulamerica"}'
```

(requer sessão admin)

## Deduplicação

1. CNPJ / CNES  
2. Senão: nome normalizado + endereço + CEP + telefone + coordenadas  

Unidades diferentes da mesma rede permanecem separadas.
