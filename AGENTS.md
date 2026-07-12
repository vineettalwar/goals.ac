# goals.ac — Agent Reference

**AI-powered programmatic SEO platform** for B2B startup growth roadmaps. Generates tailored 12-month roadmaps, SEO content, GEO audits, and repurposable content — personalized to brand/industry/stage.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend (main app) | React 19, Vite 7, Tailwind CSS v4, shadcn/ui (Radix primitives) |
| Frontend (marketing) | Next.js 14+ (App Router), NextAuth |
| Backend API | Express 5, TypeScript 5.9, esbuild |
| Database | PostgreSQL 17, Drizzle ORM, Zod |
| AI | Google Gemini 2.5 Flash (`@google/genai`), tiered provider abstraction |
| CMS Connectors | WordPress, Shopify (GraphQL), Joomla (REST), Drupal (JSON:API), Notion, Webflow, Ghost, Webhook |
| Auth | JWT (Express app), NextAuth (Next.js app), bcrypt, Google OAuth 2.0 |
| Caching | Redis (AI output, 24h TTL), in-memory LRU, DB-level content caching (SHA-256 key) |
| Async Jobs | pg-boss (Postgres-backed queue) |
| Logging | Pino |
| Animation | GSAP, Framer Motion |
| Charts | Recharts |
| Monorepo | pnpm workspaces, TypeScript project references |

## Project Structure

```
goals.ac/
├── artifacts/
│   ├── api-server/              # Express REST API (port 8080)
│   │   ├── src/routes/          # Auth, goals, roadmaps, SEO articles, content pieces, chat, etc.
│   │   ├── src/services/        # AI generators (seoContent, contentStudio, roadmap, etc.)
│   │   ├── src/lib/             # Auth middleware, sessions, encryption, cache, logger
│   │   └── src/jobs/            # pg-boss job handlers
│   ├── goals-ac/                # React + Vite SPA (main user-facing app)
│   │   └── src/pages/           # content-studio, dashboard, roadmap pages, etc.
│   └── marketing-persona-app/   # Next.js app (onboarding, integrations, autopilot, usage)
├── lib/
│   ├── db/                      # Drizzle schema (20 tables), migrations, seeding
│   ├── api-spec/                # OpenAPI spec — source of truth for API contracts
│   ├── api-zod/                 # Generated Zod schemas (from OpenAPI via Orval)
│   ├── api-client-react/        # Generated React Query hooks (from OpenAPI via Orval)
│   ├── ai-providers/            # Provider abstraction (Gemini, Bedrock, Ollama), tier routing
│   ├── connectors/              # CMS adapters: WordPress, Shopify, Joomla, Drupal, Notion, Webflow, Ghost, Webhook
│   ├── security/                # AES-256-GCM encryption, SSRF guard
│   ├── jobs/                    # pg-boss queue contracts
│   ├── billing/                 # Credit ledger reserve/settle/release
│   ├── seo-tools/               # GEO auditor, competitor analyzer, keyword analyzer
│   ├── serp-provider/           # DataForSEO rank tracking abstraction
│   └── integrations-gemini-ai/  # Legacy Gemini integration
├── cms-plugins/                 # CMS-specific plugins (server-side, run on user sites)
│   ├── shared/                  # Shared PHP library (HMAC auth, idempotency, contract types)
│   ├── wordpress/               # WordPress plugin (PHP, wp-env dev)
│   ├── joomla/                  # Joomla Web Services plugin (PHP, Docker dev)
│   ├── drupal/                  # Drupal custom module (PHP, Docker dev)
│   └── shopify/                 # Shopify App (Node.js/TypeScript, runs on our infra)
├── scripts/                     # Build/post-merge utilities
├── docs/                        # All documentation
├── docker-compose.yml           # Full stack: frontend + API + Postgres
└── .env.example                 # Environment variables
```

## Key Architecture Decisions

**Drizzle over Prisma** — zero-runtime query builder, SQL transparency, clean Zod integration via `drizzle-zod`. Migration chain uses `drizzle-kit generate`. NEVER write hand-written SQL migrations without also running `generate`.

**JWT over sessions** (Express app) — stateless, 30-day expiry, stored in localStorage. Trade-off: no server-side revocation. The Next.js app uses NextAuth sessions instead.

**Gemini AI as primary** — generous free tier, native streaming. Users can BYOK (encrypted with AES-256-GCM). Fallback chain: user key → Replit AI proxy → `GEMINI_API_KEY` env var.

**Glass UI design** — dark mode uses `backdrop-filter: blur()` glass cards; light mode falls back to standard white cards with `border shadow-xl`. No blur in light mode.

**Content caching** — 16-char SHA-256 cache key derived from `format + keyword + brand fields + style fields`. Two tiers: DB-level (same key + project returns cached row immediately via `event: cached`), AI-level (Redis/in-memory LRU, 24h TTL).

**Monorepo package references** — `lib/db` exports `.d.ts` declarations. After schema changes: `cd lib/db && npx tsc --build` to regenerate. Otherwise consumers see stale types.

## Database

PostgreSQL with Drizzle ORM. 20+ tables covering: users, workspaces, projects (website_projects), brand_profiles, goals, briefs, content_pieces, roadmaps, geo_audits, competitor_analyses, keyword_analyses, tracked_keywords, keyword_rank_snapshots, content_strategies, usage_events, credit_ledger, sessions, integration_connections, and more.

Migrations: `pnpm --filter @workspace/db run generate` → `pnpm --filter @workspace/db run migrate`. Seed: `pnpm --filter @workspace/db run seed`.

## AI Provider Tier System

The `ai-providers` lib routes requests by tier, not model string:

| Tier | Usage |
|---|---|
| `strategy` | Goal compilation, replanning, competitive analysis |
| `planning` | Content roadmaps, brief generation, GEO audit reasoning |
| `execution` | Long-form drafting, repurposing, formatting |
| `rapid` | Metadata, micro-edits, evaluators, classification |

Supports Google Gemini, AWS Bedrock, and Ollama. Provider-agnostic — BYOK customers bring any supported provider.

## Encryption

AES-256-GCM, key derived via SHA-256 from `GEMINI_KEY_ENCRYPTION_SECRET` env var. Encrypts: user Gemini keys, CMS credentials (Notion/Webflow/WordPress/Ghost tokens). **If this env var changes, all stored ciphertext becomes unreadable.**

## CMS Connectors

**Two tiers:**

1. **TypeScript connectors** (`lib/connectors/`) — API clients the SaaS uses to push content. Each exports `publishTo*()` + `test*Connection()`. Deep imports: `@workspace/connectors/wordpress`, `@workspace/connectors/shopify`, etc.
2. **CMS plugins** (`cms-plugins/`) — Server-side modules that install on user sites and receive content. All implement the same contract:
   - `GET /goals-ac/v1/health` — no auth, returns version + capabilities
   - `GET /goals-ac/v1/site-graph` — HMAC auth, exports site content
   - `POST /goals-ac/v1/content` — HMAC auth + idempotency, creates/updates posts
   - `POST /goals-ac/v1/schema` — HMAC auth, stores JSON-LD + llms.txt

**Supported platforms:** WordPress (REST), Shopify (GraphQL Admin API), Joomla (REST), Drupal (JSON:API), Notion (markdown → blocks), Webflow (markdown → HTML), Ghost, Webhook.

**Shared PHP library** (`cms-plugins/shared/`) — HMAC auth, replay protection, idempotency. Used by WordPress, Joomla, Drupal plugins via Composer path repository.

**Local dev:**
- WordPress: `cd cms-plugins/wordpress && pnpm start` (wp-env, port 8889)
- Joomla: `cd cms-plugins/joomla && docker compose up` (port 8890)
- Drupal: `cd cms-plugins/drupal && docker compose up` (port 8891)
- Shopify: `cd cms-plugins/shopify && pnpm dev` (requires Shopify Partner account + dev store)

## Content Pipeline

Goal → Strategy → Brief → Draft → Humanize → Optimize → Render(platform) → Publish

Each stage is a pure function, can be executed as a pg-boss job. The canonical content model is Markdown + structured meta (headings, schema.org JSON-LD, OpenGraph, internal links, FAQ, citations).

## Running Locally

```sh
# Docker (recommended)
docker compose up --build
# Frontend: http://localhost:5173, API: http://localhost:8080/api

# Manual
pnpm install
cp .env.example .env  # fill in values
pnpm --filter @workspace/db run migrate
PORT=8080 pnpm --filter @workspace/api-server run dev   # API
PORT=5173 pnpm --filter @workspace/goals-ac run dev     # UI
```

## Development Workflow

1. Schema changes: edit `lib/db/src/schema/`, run `pnpm --filter @workspace/db run generate`, review SQL, run `pnpm --filter @workspace/db run migrate`, then `cd lib/db && npx tsc --build` to refresh types
2. API spec changes: edit `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen`
3. Always run `pnpm run typecheck` before pushing

## Env Variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection |
| `JWT_SECRET` | Yes | JWT signing |
| `GEMINI_KEY_ENCRYPTION_SECRET` | Yes | Key derivation for user/CMS encryption |
| `GEMINI_API_KEY` | No | Platform-level Gemini fallback |
| `GOOGLE_CLIENT_ID/SECRET` | No | Google OAuth |
| `RESEND_API_KEY` | No | Email (password resets) |
| `REDIS_URL` | No | AI output caching |
