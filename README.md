# Meu Plano

PWA mobile-first para encontrar médicos, clínicas, laboratórios e hospitais que **realmente aceitam o seu plano de saúde**.

> **Encontre quem realmente atende o seu plano, sem precisar ligar para ninguém.**

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Prisma + SQLite (fácil de migrar para Postgres/Supabase trocando o `provider` no schema)
- NextAuth (credentials) para sessão demo
- Leaflet (mapa sem chave paga)
- PWA: manifest + service worker + ícones

## Como rodar localmente

```bash
npm install
cp .env.example .env
npm run db:setup       # cria tabelas + seed demo
npm run dev            # http://localhost:43123
```

### Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | sim | SQLite local: `file:./dev.db` (relativo a `prisma/`) |
| `AUTH_SECRET` | sim | String longa e aleatória (ex.: `openssl rand -base64 32`) |
| `AUTH_URL` | sim | URL pública do app (local: `http://localhost:43123`) |
| `NEXTAUTH_URL` | sim | Mesma URL pública (compat NextAuth) |
| `AUTH_TRUST_HOST` | recomendado | `true` (necessário atrás de proxy/Vercel) |

Veja `.env.example` para valores de desenvolvimento.

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

## Deploy na Vercel

1. Abra [vercel.com/new](https://vercel.com/new) e **Import** o repositório GitHub `meu-plano`.
2. Framework Preset: **Next.js** (detectado automaticamente).
3. Configure as **Environment Variables** (Production + Preview):

| Variável | Valor sugerido (MVP) |
|----------|----------------------|
| `DATABASE_URL` | `file:./dev.db` |
| `AUTH_SECRET` | gerado com `openssl rand -base64 32` |
| `AUTH_URL` | URL do deploy (ex.: `https://meu-plano.vercel.app`) — atualize após o primeiro deploy se necessário |
| `NEXTAUTH_URL` | mesma URL do deploy |
| `AUTH_TRUST_HOST` | `true` |

4. **Build Command** (já no `package.json`): `prisma generate && prisma db push && tsx prisma/seed.ts && next build`  
   Isso gera o client Prisma, cria/seeda o SQLite no artefato de build e compila o Next.js.
5. Deploy. Depois do primeiro deploy, confira se `AUTH_URL` / `NEXTAUTH_URL` batem com a URL real do projeto.

### Limitação: SQLite na Vercel

O filesystem do runtime serverless é **efêmero** (e em grande parte somente leitura). O MVP usa SQLite gerado no **build** para demo:

- Dados do seed (prestadores, contas demo) ficam disponíveis após o deploy.
- Escritas em runtime (favoritos, confirmações novas) **podem falhar ou ser perdidas** entre instâncias/redeploys.
- Para produção real, migre o Prisma para **Postgres** (Supabase, Neon, Vercel Postgres) e atualize `provider` + `DATABASE_URL`.

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
npm run build      # generate + db push + seed + next build (amigável à Vercel)
npm run start      # servidor de produção
npm run db:setup   # push + seed (sem build)
npm run db:seed    # só seed
```
