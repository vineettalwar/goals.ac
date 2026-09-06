# goals.ac

## What This Is

AI-powered programmatic SEO platform for B2B startup growth. Generates roadmaps, SEO content, GEO audits, and CMS publishing — personalized to brand, industry, and stage.

**Two runtimes — know which one you are changing.** `marketing-persona-app` (Next.js, :3001) is canonical for **development** and is where features are written first. It is **not deployed**: root `cf:deploy` errors with "OpenNext monolith is retired". **Production** is `cf-gateway` -> `cf-public-worker` / `cf-read-worker` / `cf-write-worker`, with `goals-app-ui` and `marketing-pages` on Cloudflare Pages. A change is shipped when it reaches the workers, not when it lands in the Next app.

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

- `artifacts/marketing-persona-app/` — reference product implementation (auth, dashboard, studio, admin, APIs); canonical for development, not deployed
- `artifacts/goals-app-ui/` — **live** product SPA on Cloudflare Pages (`app.goals.ac`, `pnpm run cf:pages:app`); shares `lib/app-shell` with the Next app. Repeatedly mistaken for dead code — it is not.
- `artifacts/cf-gateway/` + `cf-public-worker` / `cf-read-worker` / `cf-write-worker` — the production API surface
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

## Product Surface (2026-08-14)

`ProductSurface` = `blog_wordpress` (default) | `full`. The default shows one product: blog articles published to WordPress.

- Navigation filter: `lib/app-shell/src/nav-config.ts` (`buildNavModel({ surface })`) hides Social Hub, GEO Audit, Research
- Format pickers: `studioFormatOptionsForSurface` (app-shell) and `formatOptionsForSurface` / `formatCategoriesForSurface` (Next app) offer the eight SEO-longform article formats
- **Hidden is not removed.** Routes stay mounted, hidden formats stay valid in the schema and generatable through the API, and the studio filter still lists every format so existing pieces stay reachable. Pass `surface="full"` to restore.

## Personalization Loops

| Loop | Where |
|---|---|
| Grounded in founder's material | `brand_voice_chunks` pgvector RAG → every generator |
| Site-aware | `strategy/content-coverage.ts` (cannibalization at brief time), `strategy/internal-link-planner.ts` + `cms-plugins/wordpress/includes/class-internal-links.php` (link write-back on publish) |
| Learns from performance | `seo-tools/contentDecayDetector.ts` → `strategy/content-decay-service.ts` → `keyword_opportunities` source `content_refresh` |
| Learns from edits | `brand/edit-learning.ts` → `brand_voice_sources` type `user_edit` → existing index + skill-regen jobs |

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
- OpenSEO hybrid integration: Features 1–2 shipped in lib + Next (migrate `0076`–`0077`); Feature 3 MCP is next — see `docs/prd/openseo-integration-index.md`

## Known Issues / Fragile Areas

> **Go-live blockers: see `docs/audits/2026-09-06-production-readiness.md`.** A six-domain audit found 2 critical security defects (an unauthenticated enumerable job-status endpoint, a cross-tenant IDOR from `&&` used where Drizzle `and()` was meant), 10 go-live blockers (the WordPress plugin cannot be installed; the only working WP path has no publish idempotency; "Auto-publish as draft" posts live to LinkedIn; the publish quality gate is passed no options by any production call site; no error tracking anywhere; no EUR plan and no VAT), and confirmed that nothing has ever been run against a real WordPress site, LinkedIn app, or payment. That file carries file:line evidence and a "checked and found clean" list — read it before auditing this codebase again.


- **`pnpm run typecheck` is red on `main`**, in packages unrelated to recent work: `artifacts/api-server` (2 errors, `pool` no longer exported from `@workspace/db`), `artifacts/cf-read-worker` (362), `artifacts/cf-write-worker` (622, D1 dialect mismatch). Libs, `marketing-persona-app`, `worker`, and `cf-jobs-worker` are clean — validate against those.
- `lib/ai-providers/src/bedrock-auth.test.ts` fails wherever `AWS_*` env vars are present; `lib/content-engine/src/support/ai/platform-bedrock.test.ts` contains no test suite.
- `cms-plugins/wordpress` phpcs cannot run: WPCS needs `phpcsstandards/phpcsextra`, which is not in `composer.json`. PHPUnit works (`pnpm --filter @workspace/goals-ac-wp run test:unit`).

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
