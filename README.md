# Meu Plano

PWA mobile-first para encontrar médicos, clínicas, laboratórios e hospitais que **realmente aceitam o seu plano de saúde**.

> **Encontre quem realmente atende o seu plano, sem precisar ligar para ninguém.**

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Prisma + SQLite (fácil de migrar para Postgres/Supabase trocando o `provider` no schema)
- NextAuth (credentials) para sessão demo
- Leaflet (mapa sem chave paga)
- PWA: manifest + service worker + ícones

## Como rodar

```bash
npm install
cp .env.example .env   # se ainda não tiver .env
npm run db:setup       # cria tabelas + seed demo
npm run dev            # http://localhost:43123
```

### Contas demo

| Perfil  | E-mail               | Senha    |
|---------|----------------------|----------|
| Usuário | demo@meuplano.app    | demo123  |
| Admin   | admin@meuplano.app   | admin123 |

O usuário demo já vem com **SulAmérica Especial 100** em São Paulo.

### Busca de demonstração

1. Entre com `demo@meuplano.app`
2. Busque **Dermatologista**
3. Você deve ver, entre outros:
   - Clínica Saúde Mais (confirmado)
   - Centro Médico Paulista (confirmado)
   - Clínica Nova Vida (precisa confirmar)

## Rotas principais

| Rota | Descrição |
|------|-----------|
| `/entrar` | Login |
| `/onboarding` | Seleção de plano |
| `/` | Home + atalhos |
| `/buscar` | Busca inteligente + filtros + lista/mapa |
| `/provedores/[id]` | Detalhe, WhatsApp, rota, confirmação |
| `/favoritos` | Favoritos |
| `/perfil` | Plano, confirmações, instalar, sair |
| `/perfil/instalar` | Guia PWA (Android/iOS) |
| `/ajuda` | “Meu plano não resolveu” |
| `/premium` | Meu Plano+ (em breve) |
| `/admin` | CRUD protegido (admin) |

## APIs

- `GET /api/search` — busca + ranking
- `GET/POST /api/plans` — listar planos / salvar plano do usuário
- `GET/POST /api/favorites`
- `GET/POST /api/confirmations`
- `GET/POST /api/verification-requests`
- `POST /api/whatsapp-click`
- `GET /api/providers/[id]`
- `GET/POST /api/admin`

## Arquitetura (pronto para IA / Postgres)

- Parser NLP MVP em `src/lib/search-parser.ts` (interface `FutureAISearchAdapter`)
- Ranking em `src/lib/ranking.ts`
- Schema Prisma com métricas (`SearchEvent`, `WhatsAppClick`)
- Para Postgres/Supabase: altere `provider` e `DATABASE_URL` em `prisma/schema.prisma`

## PWA

- `public/manifest.webmanifest`
- `public/sw.js`
- Ícones em `public/icons/`
- Prompt “Instalar Meu Plano” no app + tela em `/perfil/instalar`

## Scripts

```bash
npm run dev        # desenvolvimento na porta 43123
npm run build      # build de produção
npm run start      # servidor de produção
npm run db:setup   # push + seed
npm run db:seed    # só seed
```
