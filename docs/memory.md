# Project Memory

Living document capturing architectural decisions, historical context, and lessons learned across the goals.ac build. Updated continuously as the project evolves.

---

## Built, tested, and switched off is the dominant failure mode here (2026-09-06)

**Lesson:** A six-domain production-readiness audit found that goals.ac's biggest safety gaps are not missing code — they are finished code that no production call site activates. The pattern repeated across three independent areas:

- `assessPublishReadiness` supports `minQualityScore`, `targetKeyword`, `existingTitles`, `checkUnattributedClaims`. Every production call site passes **none** of them; only tests do. The quality floor, keyword-stuffing check, cannibalization blocker and fabricated-statistic screen are all dead in production while appearing shipped.
- `annotateBriefsWithCoverage` computes a real cannibalization verdict that nothing downstream reads.
- `claim-extractor.ts` is a well-built fabricated-stat heuristic gated behind a flag no caller sets.

**Why it happens:** the option-bag API (`assessPublishReadiness(piece, options)`) makes "not passed" indistinguishable from "deliberately off" at the call site, and there is no test asserting the *autopilot path* enables them. A capability audit that greps for a function's definition finds it present; only grepping the call sites finds it inert.

**Rule going forward:** when a safety feature lands, the acceptance criterion is a test on the **unattended path** proving the gate fires — not a unit test of the gate in isolation. Grep call sites, not definitions, when auditing whether a guard is live.

**Corollary found the same session:** "typechecks clean, never run against a live database / real WordPress / real LinkedIn app" appears in every handoff entry back to July. Type safety has been substituting for verification. `wp-staging-verification-evidence.md` is still a blank template, and `e2e/founder-path.spec.ts` stubs the WordPress plugin contract rather than hitting one.

**See:** `docs/audits/2026-09-06-production-readiness.md` (full findings, file:line evidence, and a "checked and found clean" list), `HANDOFF.md` (2026-09-06 entry).

---

## The product exists twice, and the deployed copy is the unchecked one (2026-09-06)

**Lesson:** Production is `cf-gateway` -> `cf-public/read/write-worker` + `goals-app-ui` on Cloudflare Pages. `marketing-persona-app` (80k LOC, 236 API routes) is **not deployed** — root `cf:deploy` errors with "OpenNext monolith is retired." Yet the admin dashboard, the only email-alert hook, and the entire e2e suite all live in that undeployed app, and `cf-write-worker`/`cf-read-worker` carry 622/362 type errors from a single root cause (SQLite/D1 tables passed into a Drizzle handle typed as Postgres).

Every feature is therefore written twice, and the copy serving customers is the one with no type safety and drifting route coverage. `docs/parity-matrix.md` only checks that a path exists, never that it behaves the same, and it is stale by 14 routes.

**Rule going forward:** treat "which runtime serves this?" as the first question in any goals.ac audit or feature estimate. A change is not shipped when it lands in `marketing-persona-app`; it is shipped when it lands in the workers. Cost every feature at 2x until the dialect fix retires the duplication.

**See:** `docs/audits/2026-09-06-production-readiness.md` (structural finding + correction log).

---

## Continuous packaging beats new engines (2026-07-15)

**Lesson:** After Waves 0–3.2, the highest-ROI work was continuous packaging — empty CTAs, social Reject/requireApproval, ESP checklists, analytics Sync, stock images for all formats, voice sample scoring — not new scoring or CMS engines.

- Ship polish in parallel once the packaging spine exists; demo and partner paths care about workflow coherence.
- Persisting CMS `outputMode` on `publish_records` makes history badges honest; schema alone is not enough.
- **Migration is required** before UI shows stored values: `pnpm --filter @workspace/db run migrate` and `pnpm run cf:migrate:d1:local` (or remote D1 migrate).
- Forbidden `ensure*` identifiers still surface in typecheck; rename when packaging touches those packages.

**See:** `HANDOFF.md` (Post-wave polish), `docs/DECISIONS.md` (`outputMode` on publish_records).

---

## Content Studio competitive plan — Waves 0–2 (2026-07-15)

**Lesson:** First packaging tranche (command center, dual score, Fix gaps, CMS health) shipped; the next gap is **humanize trust + Studio writing room + integration reliability** vs Surfer (live editor feel), BLG/AutoSEO (volume + quality demo), and Buffer (social polish).

**Execution order:** Wave 0 humanize hardening → Wave 1 side panel + live score → Wave 2 health/publish/social one-click. Wave 1 not started until Wave 0 passes acceptance.

**ICP (90 days):** Partner-demo path vs BLG/AutoSEO — not self-serve checkout or hosted blog.

**Deferred on purpose:** Full Surfer NLP; hosted blog until self-serve; TikTok/YouTube/inbox; backlink exchange; detector APIs.

**See:** `docs/prd/content-studio-competitive-plan.md`, `docs/DECISIONS.md` (Wave 0→1→2 decision), `HANDOFF.md` (in-progress workstreams).

---

## Competitive packaging over engines (2026-07-15)

**Lesson:** goals.ac was engine-rich and experience-thin vs Surfer/Clearscope/BLG. Closing gaps meant packaging existing pipelines (command center, seed→cluster, dual score, Fix gaps, CMS health, autopilot defaults) in `lib/content-engine` + `lib/app-shell` with Next + CF parity — not cloning Semrush or shipping a live NLP editor.

**Deferred on purpose:** Surfer-style real-time NLP scoring; hosted blog fallback for CMS-less SMB.

**See:** `docs/competitors/executive-diagnosis.md` (canonical diagnosis), `docs/DECISIONS.md` (Competitive packaging), `HANDOFF.md` (shipped list).

---

## No "ensure" — forbidden

**Policy (2026-07-14):** The word **`ensure`** must never appear anywhere in this repo — identifiers, filenames, comments, strings, docs, or error messages.

- Do **not** introduce `ensure*` functions, `ensure-*.ts` files, or prose like "ensure that…".
- Prefer concrete verbs: `init`, `getOrCreate`, `seed`, `provision`, `verify`, `require`.
- Example renames: `ensureReferenceData` → `seedReferenceDataIfEmpty`, `ensureWorkspaceForOrganization` → `getOrCreateWorkspaceForOrganization`.

**Enforced in:** `.cursor/rules/no-ensure.mdc`, `.agents/skills/goals-ac-conventions/SKILL.md`, `AGENTS.md`.

---

## No Sparkles / glitter icons — forbidden

**Policy (2026-07-15):** Lucide **`Sparkles`** and glitter/sparkle-style icons are banned in product UI.

- Do **not** put sparkle icons on Generate, Humanize, Enhance, or other action buttons.
- Prefer concrete icons (`RefreshCw`, `PenLine`, `FileText`, `TrendingUp`) or text-only labels.
- New product UI must not introduce `Sparkles`; migrate existing usages when those files are touched.

**Enforced in:** `.cursor/rules/no-sparkles.mdc`, `.agents/skills/goals-ac-conventions/SKILL.md`.

---

## Product page grid — locked

**Policy (2026-09-06):** Product app pages use shared chrome from `lib/app-shell/src/shell-constants.ts` only.

- `APP_SHELL_PAGE` (`max-w-5xl`) for standard pages; `APP_SHELL_PAGE_WIDE` (`max-w-7xl`) for dashboard / Content Studio / dense data.
- **Left-aligned** — never `mx-auto` on product page roots (centering beside the sidebar leaves a void gutter).
- Same gutters everywhere: `px-4 py-8 sm:px-6 lg:px-8` via those constants — do not hand-roll page shells.
- Marketing `(public)` pages are exempt.

Check: `node lib/app-shell/scripts/check-page-chrome.mjs`

**Enforced in:** `.cursor/rules/app-shell-grid.mdc`, `.agents/skills/goals-ac-conventions/SKILL.md`.

---

## `.marketing-out/` — build artifact, not in repo

**Policy:** `artifacts/marketing-persona-app/.marketing-out/` is the static marketing export produced by `scripts/build-marketing-static.mjs` (Next.js `distDir` for the marketing-only build). It is listed in `.gitignore` and must **never** be committed.

- Seeing it locally after a marketing build is normal.
- Deploy target copies from this dir to `artifacts/marketing-pages/dist` for Cloudflare Pages.
- Do not treat untracked `.marketing-out/` files as missing repo content — they are generated output.

---

## No GitHub Actions — forbidden

**Policy (2026-07-14):** This repo uses **zero** GitHub Actions. No `.github/workflows/` files. No exceptions unless the user explicitly asks to add one.

- Do **not** create, restore, or suggest GitHub Actions / GitHub CI for any task (bug fixes, refactors, deploy, lint, tests, React Doctor, etc.).
- Deploy via **Cloudflare Workers Builds** (dashboard Git integration), not Actions — see `docs/deploy-cloudflare.md`.
- Validate locally instead: `pnpm run typecheck`, relevant package builds, `docker compose config --quiet` when Docker config changes.

**Enforced in:** `.cursor/rules/no-github-ci.mdc`, `AGENTS.md`, `PROJECT.md`.

---

## Why JWT over Sessions (legacy Express / Vite only)

**Decision**: The legacy Express API (`artifacts/api-server`) and Vite app (`artifacts/goals-ac`) use stateless JWTs. The **canonical Next.js product** (`marketing-persona-app`) uses **NextAuth sessions**.

**Reasoning**: The API server is a stateless Express service that may run multiple instances. Sessions would require a shared session store (Redis), adding infrastructure complexity. JWTs are self-contained, simplify horizontal scaling, and work naturally with the monorepo's separate frontend + backend. The 30-day expiry trades security for UX convenience — this is a SaaS tool, not a banking app.

**Trade-off**: JWTs cannot be invalidated server-side without a blocklist. Password changes do not invalidate existing tokens. Acceptable for legacy opt-in surfaces only.

**File**: `artifacts/api-server/src/lib/auth.ts`, `artifacts/marketing-persona-app/src/auth.ts`

---

## Why Drizzle ORM over Prisma

**Decision**: Drizzle ORM with PostgreSQL.

**Reasoning**: Drizzle has a lightweight query builder that compiles directly to SQL with zero runtime magic. Prisma's generated client is a black box; Drizzle lets you see exactly what query is being sent. Drizzle's schema-as-code approach (TypeScript) integrates cleanly with Zod via `drizzle-zod`. The generated Zod insert schemas are used directly in API validation.

**Gotcha**: The migration system uses `drizzle-kit generate` to track a snapshot chain. **Never write SQL migrations by hand without also running `generate` to update the snapshot.** Several early migrations (0010–0018) were written by hand, previously breaking the snapshot chain. The chain has since been fully repaired — snapshots 0012–0015, 0017, and 0018 were backfilled and migration 0019 was generated to reconcile the gap. Running `drizzle-kit generate` now correctly reports "No schema changes" when the schema is up to date. See `CONTRIBUTING.md`.

**Files**: `lib/db/src/schema/`, `lib/db/migrations/`

---

## Why Gemini AI (not OpenAI)

**Decision**: Google Gemini 2.5 Flash as the primary AI model.

**Reasoning**: Gemini 2.5 Flash offers a generous free tier for development, native streaming, and competitive quality for long-form content generation. The platform integrates via `@google/genai` SDK. `thinkingConfig: { thinkingBudget: 0 }` disables extended thinking to reduce latency for streaming responses.

**Bring-your-own-key**: Users can supply their own Gemini API key, stored encrypted with AES-256-GCM. The platform first checks for a user key, falls back to the Replit AI Integration proxy, then falls back to the environment `GEMINI_API_KEY`.

**Encryption**: `GEMINI_KEY_ENCRYPTION_SECRET` is used to derive a 256-bit key via SHA-256. The same key encrypts CMS credentials (Notion/Webflow tokens). **If this secret changes, all stored encrypted values become unreadable.**

**Files**: `artifacts/api-server/src/services/contentStudioGenerator.ts`, `artifacts/api-server/src/lib/encryption.ts`

---

## The Glass UI Design Direction

**Decision**: Dark "glass" aesthetic with `backdrop-filter: blur()` on dark backgrounds; clean borders + shadow on light backgrounds.

**Reasoning**: The target audience (B2B SaaS founders) expect a modern, premium-feeling tool. The glass cards (`glass-card`, `glass-card-md`) achieve this on dark pages (home, roadmap detail) without looking gimmicky on light pages (forms, dashboards).

**Rule**: Glass cards have zero light-mode blur — they render as standard white cards with `border` and `shadow-xl`. This avoids the "frosted glass on a white page" look that doesn't work visually.

**Files**: `artifacts/goals-ac/src/index.css`

---

## Content Studio Architecture

**How it works:**
1. User picks a content format and enters a target keyword + optional angle hint
2. Frontend calls `POST /api/website-projects/:id/content-pieces/generate/stream`
3. API builds a `BrandContext` from the project's brand profile + content style settings
4. A 16-character cache key is derived: SHA-256 of `format + keyword + brand fields + style fields`
5. DB-level cache check: if a piece with the same `(websiteProjectId, cacheKey)` exists, return it immediately via `event: cached` — no AI call, no new row
6. AI-level cache check: if the AI output is cached in Redis/in-memory LRU (24h TTL), stream it and insert a new row with the cache key
7. Otherwise: call Gemini with the full prompt, stream chunks as SSE `event: chunk`, save to DB, set AI cache
8. Frontend streams chunks into a live section detector (detects H2/H3 headings to show progress)

**Repurpose flow**: Separate endpoint `POST /api/content-pieces/:id/repurpose/stream` — takes existing content, calls Gemini to convert it to a new format, streams SSE events with phase-by-phase progress (analyzing → generating → saving).

**Files**: 
- `artifacts/api-server/src/services/contentStudioGenerator.ts` — AI generation, cache
- `artifacts/api-server/src/routes/contentPieces.ts` — all content piece routes
- `artifacts/goals-ac/src/pages/content-studio.tsx` — frontend

---

## Brand Profile Scraping

**How it works:**
1. User enters their website URL when creating a project
2. Hitting "Auto-fill from website" calls `POST /api/website-projects/:id/brand-profile/scrape`
3. The API fetches the URL (with SSRF guard — `assertPublicUrl` blocks private IPs), extracts text content
4. Gemini analyzes the page and returns structured brand data: company name, industry, target audience, voice/tone, primary keywords, competitor URLs
5. The result is saved to the `brand_profiles` table and returned to the frontend

**SSRF Guard**: `assertPublicUrl` resolves the hostname and blocks RFC-1918 addresses, localhost, and link-local ranges. All external fetches go through this guard.

**Files**: `artifacts/api-server/src/routes/websiteProjects.ts` (scrape endpoint), `artifacts/api-server/src/lib/ssrf.ts`

---

## Super-Admin Role

**How it works**: The `users.role` column defaults to `'user'`. Setting it to `'super_admin'` grants access to admin routes.

**Promotion**: Promote a user via direct SQL:
```sql
UPDATE users SET role = 'super_admin' WHERE email = 'user@example.com';
```

**Guard**: Admin routes use `requireSuperAdmin` middleware which checks `req.user.role === 'super_admin'`.

**Admin panel routes**: `GET /api/admin/content-strategies`, `GET /api/admin/users` — both require super-admin.

**Files**: `artifacts/api-server/src/lib/auth.ts` (middleware), `artifacts/api-server/src/routes/auth.ts` (admin routes)

---

## Integration scopes (platform / org / project)

| Scope | Route | Nav / page title |
|---|---|---|
| Platform | `/admin/integrations` | Platform integrations |
| Org | `/integrations` (`?tab=ai\|tools`) | Nav: Integrations · Page: Org integrations |
| Project | `/projects/:id/integrations` (`?tab=…`) | Project integrations |

Helpers: `orgIntegrationsPath()`, `projectIntegrationsPath()` in `@workspace/app-shell`.

---

## CMS Publishing Architecture

All three CMS platforms are supported from the same `PublishDialog` in `content-piece.tsx`:

| Platform | Credential storage | Publish mechanism |
|---|---|---|
| WordPress | Per-publish (api-server); encrypted in `wordpress_connections` (marketing-persona-app) | REST API `POST /wp-json/wp/v2/posts` |
| Notion | Encrypted in `website_projects.cms_integrations` JSONB | Markdown → Notion blocks |
| Webflow | Encrypted in `website_projects.cms_integrations` JSONB | Markdown → HTML → CMS item |

The `cms_integrations` JSONB column stores an object like:
```json
{
  "notion": { "token": "<encrypted>", "databaseId": "...", "status": "connected" },
  "webflow": { "token": "<encrypted>", "collectionId": "...", "siteId": "...", "status": "connected" }
}
```

**Encryption**: AES-256-GCM, same key as Gemini key encryption (`GEMINI_KEY_ENCRYPTION_SECRET`).

**Files**: `artifacts/api-server/src/services/notionPublisher.ts`, `artifacts/api-server/src/services/webflowPublisher.ts`

---

## Monorepo Structure & Package References

The monorepo uses pnpm workspaces with TypeScript project references:

- `lib/db` — Drizzle schema + migrations; exports `.d.ts` declaration files from `dist/`
- `lib/api-spec` — OpenAPI YAML; source of truth for API contracts
- `lib/api-zod` — Generated Zod schemas from OpenAPI spec (via Orval)
- `lib/api-hooks` — Generated React Query hooks from OpenAPI spec (via Orval)

**Important**: After editing `lib/db/src/schema/`, run `npx tsc --build` inside `lib/db/` to regenerate the `.d.ts` files in `dist/`. Without this, the API server's TypeScript compiler won't see the new column types.

---

## Content Style Injection

The `content_style` JSONB column on `website_projects` stores a `ContentStyle` object:
```typescript
interface ContentStyle {
  tonePreset?: "professional" | "casual" | "technical" | "conversational";
  personaName?: string;
  defaultWordCount?: number;
  primaryLanguage?: string;
  forbiddenWords?: string[];
  readingLevel?: "general" | "intermediate" | "expert";
}
```

The `buildContentStyleContext(style)` function in `contentStudioGenerator.ts` turns this into a prompt fragment injected into every AI generation call. If no style is set, the function returns an empty string.

---

## Environment Variables

| Variable | Purpose | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Signs JWT tokens — keep secret, never rotate without invalidating all sessions | Yes |
| `GEMINI_KEY_ENCRYPTION_SECRET` | AES-256-GCM key derivation for user Gemini keys + CMS tokens | Yes |
| `GEMINI_API_KEY` | Platform-level Gemini key fallback | Optional |
| `GOOGLE_CLIENT_ID` | Google OAuth app client ID | Optional |
| `GOOGLE_CLIENT_SECRET` | Google OAuth app client secret | Optional |
| `RESEND_API_KEY` | Resend email API key for password resets | Optional |
| `LEADSH_WEBHOOK_URL` | Webhook URL for lead capture events | Optional |
| `REDIS_URL` | Redis connection URL for AI output caching | Optional |
| `AI_INTEGRATIONS_GEMINI_API_KEY` | Replit AI Integrations proxy key | Auto-injected on Replit |
| `AI_INTEGRATIONS_GEMINI_BASE_URL` | Replit AI Integrations proxy base URL | Auto-injected on Replit |
| `RESEND_FROM_EMAIL` | From address for transactional emails | Optional (default: noreply@goals.ac) |

---

## Billing: AI metering wired (2026-07-14)

**Status:** Starter plan enforces monthly count quotas on all AI surfaces (routes + pg-boss workers). BYOK bypasses quotas. Credit ledger reserve/settle disabled until paid tiers return.

**Flow:** `prepareAiBilling` → count quota check → AI call → `recordUsage` via `completeAiBilling`. Workers use `lib/jobs/src/worker-billing.ts`.

**Key files:**
- `lib/billing/src/session.ts` — quota + past-due subscription guard
- `lib/billing/src/quotas.ts` — expanded `ARTICLE_QUOTA_EVENT_TYPES`
- `artifacts/marketing-persona-app/src/lib/ai-billing.ts` — HTTP wrapper
- `lib/content-engine/src/goal-brief-compiler.ts` — goal → brief compilation

**Goal pipeline:** Onboarding goal step → `POST /api/goals/[id]/compile-briefs` → brief approval → content generation with `briefId`.
---

## Historical Gotchas

- **Double migration 0008**: There are two files named `0008_aspiring_firebrand.sql` and `0008_condemned_rocket_racer.sql`. This happened because an early migration was renamed. The journal references `0008_condemned_rocket_racer` — the other file is a stale artifact that should not be applied.
- **Snapshot chain**: Previously, migrations 0012–0015, 0017, and 0018 were missing snapshot files in `meta/`. These were backfilled in Task #54; the chain is now complete (0000–0019). `drizzle-kit generate` reports "No schema changes" on the current schema — future generates will produce only genuine diffs.
- **`contentStyle` TS errors**: The `@workspace/db` compiled declarations in `lib/db/dist/` can go stale. If you see "Property 'contentStyle' does not exist" errors after a schema change, run `cd lib/db && npx tsc --build` to regenerate.
- **Port collisions**: Vite will increment the port if the default is in use. The API server always binds to the `PORT` env var; Vite uses `PORT` too. Keep artifact `PORT` assignments from colliding.
