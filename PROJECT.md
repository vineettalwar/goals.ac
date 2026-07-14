# goals.ac

## What This Is

AI-powered programmatic SEO platform for B2B startup growth. Generates roadmaps, SEO content, GEO audits, and CMS publishing — personalized to brand, industry, and stage. Canonical product UI is the Next.js app (`marketing-persona-app` on :3001).

## Tech Stack (confirmed)

- **Frontend (product):** Next.js 16 App Router, React 19, Tailwind v4, shadcn/ui, NextAuth
- **Frontend (legacy):** React 19 + Vite 7 (`artifacts/goals-ac`) — redirect shell only
- **API:** Next.js route handlers (canonical); Express 5 (`artifacts/api-server`) opt-in legacy
- **Database:** PostgreSQL 17 (Docker/local) **or** Cloudflare D1 (`DB_DIALECT=d1`); Drizzle dual schema
- **AI:** `@workspace/ai-providers` — Gemini, Bedrock, Ollama; tier routing (`strategy` / `planning` / `execution` / `rapid`)
- **Jobs:** pg-boss worker (`artifacts/worker`) — Postgres only; `JobsUnavailableError` when `DB_DIALECT=d1`
- **Monorepo:** pnpm workspaces, TypeScript project references
- **Deploy:** Docker Compose locally; Cloudflare Workers + D1 + Queues (`docs/deploy-cloudflare.md`)
- **Jobs:** `artifacts/cf-jobs-worker` on Cloudflare (D1 path); `artifacts/worker` pg-boss for local Postgres only

## Architecture Map

- `artifacts/marketing-persona-app/` — canonical product (auth, dashboard, studio, admin, APIs)
- `artifacts/marketing-persona-app/src/lib/org-access.ts` — org roles, permissions, suspend checks
- `artifacts/marketing-persona-app/src/lib/require-auth.ts` — session + org suspend + IP allowlist
- `artifacts/marketing-persona-app/src/lib/platform-settings.ts` — platform ops singleton (`platform_settings`)
- `lib/content-engine/` — content pipeline, brand scraper, CMS publish, AI guards
- `lib/ai-providers/` — provider abstraction + Bedrock BYOK
- `lib/db/` — schema, migrations (`0040+` platform/org security, brand memory, MFA); D1 mirror at `schema-sqlite/`, `migrations-d1/`
- `cms-plugins/` — WordPress/Joomla/Drupal/Shopify server-side plugins
- `lib/keyword-research-provider/` — GSC/Sheets keyword hub (separate feature track)

## Conventions In Force

- Schema changes: edit `lib/db/src/schema/`, `pnpm --filter @workspace/db run generate`, migrate, `cd lib/db && npx tsc --build`
- D1: `pnpm --filter @workspace/db run generate:d1` after schema edits; `pnpm run cf:migrate:d1:local` + `cf:seed:d1:local` for Workers preview
- **No GitHub Actions (forbidden)** — zero `.github/workflows/`; validate with `pnpm run typecheck` locally; deploy via Cloudflare Workers Builds
- **No `ensure` (forbidden)** — never in identifiers, filenames, comments, strings, or docs; prefer `init`, `getOrCreate`, `seed`, `provision`, `verify`, `require`
- **Build artifacts gitignored** — do not commit `.marketing-out/`, `.next/`, `.open-next/`, `dist/` (see `.gitignore`; regenerate via `node scripts/build-marketing-static.mjs`)
- Org permissions via `hasOrgPermission()` / `requireOrgPermission()` — never ad-hoc role string checks
- User-facing ops language: **"Platform operations"** — not internal control terminology
- Encryption: AES-256-GCM via `GEMINI_KEY_ENCRYPTION_SECRET` (BYOK keys, CMS creds, OAuth tokens)

## Key Decisions (summary — full log in docs/DECISIONS.md)

- 2026-07-13 — Platform ops toggles in DB singleton, not env vars (super-admin UI, audit trail)
- 2026-07-13 — Org roles: `owner` / `site_admin` / `editor` / `viewer` (legacy `member` → `editor`)
- 2026-07-13 — SEO publish: plugin-first field mapping + WordPress `Seo_Meta_Mapper`
- 2026-07-13 — Enterprise security phased: audit log + suspend live; MFA/SSO scaffolded

## Current Status

**Done (platform roadmap):**
- Platform operations panel (`/admin`), public maintenance flow, AI generation guard
- Org suspend + `org_audit_log`, org security settings API + UI
- Org RBAC migration + middleware viewer/editor gates
- Brand memory (`brand_profiles.brand_memory`) + Content Studio profile card
- SEO metadata bridge to CMS publish + WordPress plugin
- Pricing page TBD state; Core Web Vitals reporting + perf gates

**Done (keyword research hub):**
- GSC sync, opportunity scoring, CSV/Sheets import, `/search/keywords` UI

**Done (article performance):**
- GA4 project-scoped OAuth + daily sync (`analytics_property_connections`, `ga4_page_metrics`)
- Article performance API joining `published_url` to GA4 page paths + GSC clicks
- Integrations GA4 tile, Search → Performance dashboard, Content Studio metrics badges

**Done (credit consumption wiring):**
- `lib/billing` pricing + `prepareAiBillingSession` / multi-line `settleReservationLines`
- All AI generation routes + worker `contentGenerate` debit ledger on success
- Dual enforcement: count quotas + credit balance on growth/scale platform-key calls
- `GET /api/billing/credits` balance endpoint

**In progress / scaffolded:**
- MFA TOTP (schema + settings UI; verification not enforced yet)
- SSO/OIDC (not started)
- Redis-backed rate limits for multi-instance deploy

## Known Issues / Fragile Areas

- Migrations `0040–0043` must be applied before platform ops work (`pnpm --filter @workspace/db run migrate`)
- Middleware platform check uses HTTP self-fetch to `/api/platform/status` — fails open if DB unreachable
- IP allowlist CIDR matching is prefix-based, not full CIDR math
- In-memory rate limiters (GSC sync, etc.) — single-instance only
- `lib/content-engine` composite `tsc --build` may fail on unrelated pre-existing errors
- `GEMINI_KEY_ENCRYPTION_SECRET` rotation invalidates all stored ciphertext

## Maintenance Notes

- Local dev: `docker compose up --build` or `pnpm --filter @workspace/marketing-persona-app run dev`
- Super-admin platform toggles: `/admin` → Platform operations
- Org suspend: `/admin/organizations`
- First debug step for "maintenance loop": check `platform_settings` row `id=1`
- Skills governing stack: `nextjs-app-router-patterns`, `postgres-drizzle`, `goals-ac-conventions`, `AGENTS.md`
