<p align="center">
  <img src="artifacts/goals-ac/public/og-image.png" alt="goals.ac" width="600" />
</p>

# goals.ac

**AI-powered programmatic SEO platform for B2B startup growth roadmaps.**

Generate tailored 12-month growth roadmaps, SEO content strategies, article drafts, GEO audits, and a full content studio — all personalized to your company's brand, industry, and stage.

---

## Features

- **Growth Roadmap Generator** — AI-generated 12-month roadmaps by industry, location, and funding stage; public SEO directory
- **Content Studio** — Generate 20+ content formats (blog posts, LinkedIn threads, whitepapers, FAQs, etc.) with streaming progress
- **Content Repurposing** — Convert any content piece into a different format with phase-by-phase AI progress
- **Brand Profile** — Auto-scrape your website to populate company info, keywords, and audience; fine-tune voice, tone, and content style
- **Content Style Settings** — Persona name, tone preset, word count, language, reading level, forbidden words — injected into every AI prompt
- **SEO Article Generator** — Long-form SEO articles tied to specific roadmap phases
- **GEO Audit** — Generative Engine Optimization audit for AI search visibility
- **Keyword Research & Rank Tracking** — Opportunity discovery and SERP position snapshots
- **CMS Publishing** — Publish to WordPress, Shopify, Joomla, Drupal, Notion, Webflow, Ghost, or custom webhooks; encrypted credential storage
- **User Accounts** — Email/password and Google OAuth; bring-your-own AI provider key (Gemini, Bedrock, Ollama)
- **DB-Level Content Caching** — Repeated generation requests return instantly for the same project + format + keyword combination
- **Admin Panel** — Super-admin role with user management and content strategy views

## Tech Stack

![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-24-green?logo=node.js)
![Next.js](https://img.shields.io/badge/Next.js-14+-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791?logo=postgresql)
![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-C5F74F)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss)
![Gemini AI](https://img.shields.io/badge/Gemini-2.5_Flash-4285F4?logo=google)

| Layer | Technology |
|---|---|
| Frontend (production) | `goals-app-ui` Vite SPA on Cloudflare Pages (`app.goals.ac`) |
| Frontend (dev / reference) | Next.js App Router (`marketing-persona-app`, `:3001`) — not CF production |
| Frontend (legacy) | Vite redirect shell (`goals-ac`) — opt-in only |
| API (production) | Cloudflare Workers: `cf-gateway` → public / read / write (+ jobs worker) |
| API (dev) | Next.js Route Handlers; Express 5 opt-in legacy |
| Database | PostgreSQL 17 (local) **or** Cloudflare D1 (production); Drizzle + Zod |
| AI | Google Gemini 2.5 Flash (streaming); tiered providers (Bedrock, Ollama, BYOK) |
| Auth | Edge Mesh: session JWT cookie; Next: Auth.js — see [docs/auth.md](docs/auth.md) |
| Jobs | CF Queues (`cf-jobs-worker`) on D1; pg-boss locally on Postgres |
| Caching | Redis (optional), KV on CF, in-memory LRU, DB-level content caching |
| CMS | WordPress, Shopify, Joomla, Drupal, Notion, Webflow, Ghost, Webhook |
| Monorepo | pnpm workspaces |

## Quick Start

For full local setup instructions (PostgreSQL, env vars, ports), see **[docs/local-dev.md](docs/local-dev.md)**.

### Docker (recommended)

```sh
git clone https://github.com/vineettalwar/goals.ac.git
cd goals.ac
docker compose up --build
```

Open **http://localhost:3001** once the app container is healthy. This starts the Next.js product app, background worker, and Postgres.

Optional: add API keys and OAuth credentials via `.env` (`cp .env.example .env`).

Legacy Vite + Express stack (debugging only):

```sh
docker compose --profile legacy up --build
```

### Manual

```sh
git clone https://github.com/vineettalwar/goals.ac.git
cd goals.ac
pnpm install
cp .env.example .env   # set AUTH_SECRET, NEXTAUTH_URL, DATABASE_URL, etc.
pnpm --filter @workspace/db run migrate
pnpm --filter @workspace/marketing-persona-app run dev   # Product app on :3001
pnpm --filter @workspace/worker run dev                  # Background jobs
```

## Documentation

| Document | Description |
|---|---|
| **[docs/CODEBASE.md](docs/CODEBASE.md)** | **Start here** — runtime map + package index |
| [docs/auth.md](docs/auth.md) | Login, Google OAuth, avatars (Edge Mesh + Next) |
| [docs/local-dev.md](docs/local-dev.md) | Full local development setup guide |
| [docs/deploy-cloudflare.md](docs/deploy-cloudflare.md) | Production Edge Mesh deploy |
| [PROJECT.md](PROJECT.md) | Living project memory (stack, status, fragile areas) |
| [HANDOFF.md](HANDOFF.md) | Latest session handoff |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Architecture decision records |
| [docs/memory.md](docs/memory.md) | Lessons and historical context |
| [docs/admin.md](docs/admin.md) | Admin panel guide |
| [AGENTS.md](AGENTS.md) | Agent/contributor reference |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Migration workflow and contribution guidelines |

## Project Structure

```
goals.ac/
├── artifacts/
│   ├── goals-app-ui/            # Production product SPA (Pages → app.goals.ac)
│   ├── marketing-pages/         # Production marketing static (Pages → goals.ac)
│   ├── cf-gateway/              # api.goals.ac router
│   ├── cf-public-worker/        # Auth / OAuth / public API shard
│   ├── cf-read-worker/          # Authenticated reads
│   ├── cf-write-worker/         # Authenticated writes
│   ├── cf-jobs-worker/          # Queues + crons (D1)
│   ├── marketing-persona-app/   # Next reference app (dev :3001, not CF prod)
│   ├── worker/                  # pg-boss (local Postgres)
│   ├── api-server/              # Legacy Express (opt-in)
│   └── goals-ac/                # Legacy Vite redirect (opt-in)
├── lib/                         # Shared packages (each has README.md)
├── cms-plugins/                 # On-site CMS plugins
├── docs/                        # CODEBASE.md, auth.md, deploy, PRDs, …
├── docker-compose.yml           # Default: Next + worker + Postgres
├── PROJECT.md / HANDOFF.md      # Agent/human project memory
└── CONTRIBUTING.md
```

## Contributing

1. Never write migration SQL by hand — always use `pnpm --filter @workspace/db run generate` after schema changes. See [CONTRIBUTING.md](CONTRIBUTING.md).
2. New API routes in the Next.js app must use `requireAuth` from `@/lib/require-auth`.
3. Run `pnpm run typecheck` before pushing.

## License

Private. All rights reserved.
