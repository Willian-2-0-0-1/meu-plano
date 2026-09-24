# Meu Plano

PWA mobile-first para descobrir **quem realmente atende o seu plano de saúde**, combinando rede da operadora, confirmações de clínicas e relatos da comunidade.

> **Encontre atendimento pelo seu plano — sem precisar ligar para vários lugares.**

## Novidades desta evolução

- Busca **sem login** (plano no cookie/localStorage)
- Proveniência (`provider_plan_status`) + histórico imutável
- Comunidade + confirmação estruturada (SIM/NÃO)
- Conflitos explícitos (operadora vs comunidade)
- Crawlers **MOCK** em `/crawlers` + pipeline de deduplicação
- Admin com crawlers, conflitos, denúncias e reivindicações

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Prisma + SQLite (migrável para Postgres)
- NextAuth (credentials) — só para ações autenticadas
- Leaflet + PWA

## Como rodar

```bash
npm install
cp .env.example .env
npm run db:setup
npm run dev   # http://localhost:43123
```

### Contas demo

| Perfil  | E-mail               | Senha    |
|---------|----------------------|----------|
| Usuário | demo@meuplano.app    | demo123  |
| Admin   | admin@meuplano.app   | admin123 |

### Fluxo sem login

1. Abra `/` → escolha operadora + plano → buscar
2. Ex.: **Dermatologista** com SulAmérica Especial 100
3. Veja proveniência (🟢 clínica/usuários, 🔵 rede, 🟡 antigo, 🔴 não aceita, ⚠️ conflito)

### Fluxo com login (contribuição)

1. Entre com `demo@meuplano.app`
2. Abra uma clínica → responda SIM/NÃO (plano, especialidade, data, comentário opcional)
3. Veja o relato em `/comunidade`

## Rotas

| Rota | Função | Auth |
|------|--------|------|
| `/` | Nova home (plano → busca) | Não |
| `/buscar` | Resultados + filtros | Não |
| `/provedores/[id]` | Abas: visão, planos, especialidades, comunidade, localização | Não (ler) |
| `/comunidade` | Feed de experiências e atualizações de rede | Não (ler) |
| `/entrar` | Login | — |
| `/favoritos`, `/perfil` | Conta | Sim |
| `/admin` | Crawlers, conflitos, denúncias, CRUD | Admin |

## Crawlers MOCK

Pasta `/crawlers` — adapters stub (Unimed, Amil, SulAmérica, Bradesco, Intermédica).  
Rode pelo admin (aba Crawlers) ou veja `crawlers/README.md`.

## Scripts

```bash
npm run dev
npm run build
npm run db:setup
npm run db:seed
```
