# Session Handoff

## Shell create competitor picker (2026-07-16)

`CreateContentDialog` competitors step now mirrors Next: load project brand URLs + analyses via host props (`projectCompetitors` / `competitorsLoading`), tap-to-focus cards, quick-add URL, optional focus.

`StudioPage` fetches `/api/website-projects/:id/competitors` when the create dialog opens and maps analyses via `flattenCompetitorAnalysisList`.

---

## Ponytail audit documented (2026-07-16)

Report: [`docs/audits/2026-07-16-ponytail-frontend.md`](docs/audits/2026-07-16-ponytail-frontend.md)

- Cursor rule + skills installed; complexity audit of Next + `goals-app-ui` + `app-shell`
- **Do not delete `goals-app-ui`** — it is `app.goals.ac` Pages (`docs/deploy-cloudflare.md`)
- High-confidence deletes: Next studio leftovers (~480 LOC)
- Unfinished / deferred / partial features catalogued in that doc

---

## WordPress featured data URI upload (2026-07-16)

**Supported** (connector, not PHP plugin): when `featuredImageUrl` is `data:image/png` or `data:image/jpeg` base64 and no stock featured image was uploaded, `prepareWordPressImages` decodes, optimizes to WebP, and uploads via plugin `/media` or WP REST.

- SVG data URIs ignored
- Plugin PHP unchanged (already accepts base64 payloads; no URL fetch of data: schemes)
- Call sites: `cms-publish.ts`, `wordpress-adapter.ts`

### Ghost / Shopify — skipped (same day)

Checked whether publish paths can do the same for featured/OG from PNG data URIs. **No implement** — neither has an existing binary/base64 media upload in-repo; both would be net-new API surface.

| Platform | Why skipped |
|---|---|
| **Ghost** | `publishToGhost` / Lexical never set `feature_image`. No `images/upload` helper. Ghost Admin needs multipart `POST …/images/upload/` then a hosted URL on the post — new FormData/auth path, Workers risk. Adapter `featuredImage: true` is capability-only. |
| **Shopify** | Adapter `featuredImage: false`. `articleCreate` + plugin content route have no image/media upload. Real path is `stagedUploadsCreate` → binary PUT → article image — multi-step GraphQL + scopes, not a base64 one-liner. |

Stock HTTPS featured still works where the platform already accepts remote URLs. Data-URI featured remains WP-only until Ghost/Shopify media helpers exist.

---

## Shell create destination step (2026-07-16)

`CreateContentDialog` now inserts an optional **destination** step when `getConnectedDestinationsForFormat` returns options for the selected format (connected CMS/social + export-only Medium/Substack for longform).

Flow: format → keyword → [competitors?] → [destination?] → review → generate.

`StudioPage` already passed `cmsConnections={integrations}`; the prop is typed as `CmsConnectionSnapshot` and wired. Stale destination cleared when format changes.

---

## Continuous polish closure (2026-07-16)

Ship-complete demo polish across content, social, CMS, and shell — no open blockers in this batch.

| Area | Done |
|---|---|
| SEO scores | Dual score honesty labels + Refresh SERP |
| Dashboard | Autopilot settings block + articles X/30 + internal-links coverage chip |
| Social | Preview chrome for all 6 platforms + calendar accents + analytics best-time slots |
| Queue | Social push includes Meta FB/IG (IG when image present) |
| Content visuals | Visual summary SVG callout + sharp PNG featured fallback |
| Shell create | Multi-step wizard + LinkedIn archetypes/hooks + multi competitor URLs |
| Shopify | Theme-snippet soft preflight + learn post |
| CMS media | Ghost Lexical inline images + TYPO3 FAL textmedia |
| Stories / briefs | Partner success-story template + Create from brief CTA |

**Deferred (not blocking):** hosted blog, Surfer NLP, TikTok, Shopify theme app block.

Detail sections below retain file pointers and edge notes from the work that got us here.

---

## Social analytics best-time slots (2026-07-16)

`bestTimeMode: analytics` in `suggestNextSlot` no longer stubs a single UTC hour.

- Loads published posts with `social_post_metrics` (90d), buckets by **project timezone** hour + weekday
- Engagement score: likes + 2×comments + 3×shares + 2×clicks (impressions ×0.01 fallback)
- Bayesian shrink toward mean; needs **≥3** metric samples (`MIN_ENGAGEMENT_SLOT_SAMPLES`) before bias applies
- Merges top hours/days into schedule prefs (overlap with user preferred days first); else falls back to manual/suggested slots

**Sparse data:** New or lightly synced projects stay on configured preferred days/times until Analytics sync has enough posts. Hour uses `scheduledAt ?? updatedAt` (history imports often lack schedule).

**Files:** `lib/content-engine/src/social/social-metrics-service.ts`, `support/social/social-queue-service.ts`.

---

## Platform Admin social OAuth credentials (2026-07-16)

LinkedIn, X, Meta, and Bluesky app credentials can be stored in platform admin (not only env):

| Network | Columns | Resolve |
|---|---|---|
| LinkedIn | `linkedin_client_id` + `encrypted_linkedin_client_secret` | `linkedin-platform-credentials.ts` |
| X | `twitter_client_id` + `encrypted_twitter_client_secret` | `twitter-platform-credentials.ts` |
| Meta | `meta_app_id` + `encrypted_meta_app_secret` | `meta-platform-credentials.ts` |
| Bluesky | `bluesky_client_name` + `encrypted_bluesky_oauth_private_key_jwk` | `bluesky-platform-credentials.ts` |

- Migrations: PG `0065`–`0067_platform_bluesky_credentials`; D1 `0002`–`0004_platform_bluesky_credentials`
- **Migrate required:** `pnpm --filter @workspace/db run migrate` (and `pnpm run cf:migrate:d1:local` for D1)
- Env wins over encrypted DB values; admin UI: `/admin/integrations` → **Social**
- Bluesky has no pasted client id — client id is the hosted metadata URL; demos need a stable private JWK (ephemeral key at startup breaks after restart)
- Done when: paste credentials in admin → project Connect works without matching `.env` vars

**Still env/bindings-only:** CF public-worker social auth paths if used.

---

## Content polish batch (2026-07-16)

- **Visual summary** — markdown callout + SVG data-URI “At a glance” graphic (`visualSummarySvg` / `visualSummarySvgDataUri`); piece aside shows `<img>`
- **Queue social + Meta** — LinkedIn+X default; Meta → Facebook; Instagram when image present
- **Internal links chip** — `62% linked · N orphans` (fallback suggestion count) → `/internal-links`
- **Shell create** — multi-step + Competitors (SEO) + LinkedIn archetype chips + hook field
- **Success stories** — partner case study template (empty metrics + verify CTAs)
- **Create from brief** — ContentBriefPanel CTA when outline present + empty body

### Visual-summary PNG → featured (decision 2026-07-16; WP upload added later)

There is no R2/S3/public asset host for content media. Existing R2 (`goals-ac-next-cache`) is Next ISR/cache only. Stock regen keeps Unsplash/Pexels HTTPS CDN URLs.

Sharp PNG from visual summary is `data:image/png;base64,…` on `featuredImageUrl`. **WordPress publish** decodes/uploads that data URI (see section above). **Ghost / Shopify** still skip — no media upload helpers; use stock HTTPS or leave featured empty.

---

## Demo landmine + autopilot surface (2026-07-15)

- Shopify theme-snippet soft preflight on publish + publishing settings
- Dual score honesty labels + Refresh SERP
- Autopilot settings compact block on dashboard
- Shell multi-step create — done (`CreateContentDialog` wizard: format → details → destination → review)
- TYPO3 FAL + Shopify Liquid snippets shipped earlier

---

## Shopify theme snippet preflight (2026-07-15)

Soft (non-blocking) amber preflight when Shopify `outputMode` is `article_metafields` or `page_sections` (or modes from health `theme_snippet_required_for`):

- **Publish dialog** — `ContentPiecePublishDialog` + optional ack checkbox
- **Publishing settings** — Shopify output-format card via `ConnectedOutputModeControl`
- Learn: `/learn/shopify-theme-sections`; health persists `lastHealthThemeSnippetRequiredFor`

---

## TYPO3 FAL textmedia (2026-07-15)

`ContentPublisher` now prefers FAL for `textmedia` images: resolve existing `/fileadmin/…` paths, otherwise download remote http(s) into `fileadmin/user_upload/goals-ac/` and attach via `sys_file_reference` on `assets`. Falls back to embedding `<img>` in `bodytext` if FAL/storage/download fails (private URLs blocked).

**File:** `cms-plugins/typo3/Classes/Helper/ContentPublisher.php` (+ `GeneralUtility` stub helpers).

**Leftover / verify on a real TYPO3 site:** DataHandler BE-user context for FAL writes; no plugin `/media` base64 upload route (URL fetch only); folder create quirks if `user_upload` missing.

Still open optional: Shopify theme app block.

---

## Demo polish batch (2026-07-15)

Just shipped:

- Dashboard articles X/30 chip on AutopilotActivityPanel
- Social platform preview chrome + over-limit gates + thumbnails
- Goals panel real GSC keyword movement (not connection placeholder)
- Ghost Lexical inline images split into paragraph/image cards
- Status select while editing on shell ContentPieceView
- Learn post humanizer → /article-quality

Still open: Shopify theme block (agents in flight), hosted blog deferred.

---

## Buffer-polish — social preview frames (2026-07-15)

Compose + Queue use shared `SocialPostPreview` (CSS-only LinkedIn / X / Instagram chrome — no logos). Char count goes red over platform limit; Queue Submit / Approve / Schedule disabled when over limit (or Instagram missing image). Featured/parent image shows as thumbnail when available.

**Files:** `lib/app-shell/src/social/social-post-preview.tsx`, `social-composer-panel.tsx`, `social-queue-panel.tsx`, `types.ts` (`resolveSocialPlatformId`, `isSocialOverCharLimit`, …).

---

## Shell convergence + migrate 0064 (2026-07-15)

Next Studio surfaces thin-wrap shell views:
- `ContentStudioClient` → `StudioView`
- `ContentPieceClient` → `ContentPieceView`
- Slots: `headerExtra` / `asideExtra`; Generate empty draft CTA wired through shell
- Brand AI profile card parity on shell (`BrandAiProfileCard` + `discoveryMeta`)
- `FORMAT_CONFIGS` anti-slop softened; seo-v8 prompt updates

**Migrate:** Postgres `0064_publish_records_output_mode` applied locally. D1 skipped (`.dev.vars` missing).

**Remaining (stale section below — updated):** Shell create destination + project competitor picker shipped 2026-07-16. Still open vs Next richness: repurpose flow, streaming generate headings. Unused local Next studio leftovers remain deletable.

---

## Shell create wizard multi-step (2026-07-15)

`CreateContentDialog` (app-shell) is now a compact wizard — not a single form:

1. **format** — pick format
2. **details** — keyword (required) + optional title / angle / planned date
3. **destination** — optional; only when format has connected/export destinations
4. **review** — summary → Generate

Same `CreateContentDraftInput` (+ optional `intendedPublishPlatform`). Vite Studio passes `cmsConnections` and generates via existing stream/POST path. Next `CreateContentModal` untouched.


---

## Brand AI profile card shell parity (2026-07-15)

Shell `BrandAiProfileCard` now matches Next’s richer fields: discovery summary (“Scanned via …”), last scanned date, voice traits (already present), +N more scan sources. `BrandProfileSummary.discoveryMeta` expanded to sitemap/GSC/CMS/homepage shape. Next Studio hub loads brand profile via `loadContentStudioData` (not `useBrandProfile`) and passes it into shell `StudioView`.

Local leftover: `artifacts/marketing-persona-app/.../brand-ai-profile-card.tsx` (self-fetching) remains unused by Studio hub.

---

## Post-wave polish (2026-07-15)

Continuous parallel ship after Waves 0–3.2. Packaging and UX polish — no new engines.

- **Studio empty CTAs** — clearer empty-state actions in Content Studio
- **`publish_records.outputMode`** — nullable column + badges; apply migrations:
  ```sh
  pnpm --filter @workspace/db run migrate
  pnpm run cf:migrate:d1:local   # or migrate:d1 for remote
  ```
- **Social Reject + requireApproval banner** — queue reject flow + approval gate messaging
- **Human voice brand sample scoring** — voice score against brand samples
- **Social analytics Sync CTA** — explicit sync action on analytics panel
- **ESP connect checklists** — setup checklists on ESP connect surfaces
- **Marketing typecheck `ensure*` renames** — forbidden-identifier cleanup for typecheck
- **Stock images all social formats** — stock image support across social format sizes

---

## Persist `outputMode` on publish_records (2026-07-15)

**Status:** Schema + call sites wired. **Migration must be applied** before badges show persisted values.

### Column
- PG + sqlite schema: nullable `output_mode` text on `publish_records`
- PG migration: `lib/db/migrations/0064_publish_records_output_mode.sql` (hand-written; `drizzle-kit generate` failed ESM/`require` in this env)
- D1 migration: `lib/db/migrations-d1/0001_publish_records_output_mode.sql` (via `generate:d1` after convert)

### Apply
```sh
pnpm --filter @workspace/db run migrate
pnpm run cf:migrate:d1:local   # or migrate:d1 for remote
```

### Call sites
- `startPublishRecord` / `withPublishRecord` accept + persist `outputMode`
- `renderAndPublish` + `publishPieceToDestination` return resolved `outputMode`
- Next/Express v1 publish, content-pieces publish, `contentPublish` job return it into `withPublishRecord`
- `listPublishRecordsForProject` selects `outputMode` (was hard-coded `null`)
- `PublishHistoryPanel` already badges when `record.outputMode` is set

---

## Competitive plan messaging — Waves 0–3.2 (2026-07-15)

**Status:** Partner-facing docs + compare copy aligned to shipped Waves 0–3.2. Hosted blog (3.3) still deferred.

### Updated
- `docs/competitors/goals-ac-capability-audit.md` — humanizer/quality, Studio writing room, publish history, Queue social, integration health marked live
- `docs/prd/content-studio-competitive-plan.md` — status Waves 0–3.2 shipped; only 3.3 deferred
- Compare page — short “demo today” block: `/article-quality`, live draft score, 16 CMS + social health, Queue social

### Deferred
- Hosted blog (`blog.customer.goals.ac`) until self-serve GTM

---

## Competitive plan Wave 3.1 — Autopilot activity panel (2026-07-15)

**Status:** Shipped — partner-demo activity card on `/dashboard`.

### Mounted where
- `DashboardView` → `AutopilotActivityPanel` (sibling under command center) via Next `dashboard-page-client` / `loadDashboardData`
- Vite `DashboardPage` inherits the same shell path

### Data sources
- Extended `loadCommandCenterSummary` → `recentPieces` (last 5) + `recentPublishes` (via `listPublishRecordsForProject`, limit 5)
- GEO / LLM snapshot reused from existing command-center fields
- Counts still derived from dashboard `pieces` list

### Files
- `lib/content-engine/src/analytics/command-center-service.ts`
- `lib/app-shell/src/dashboard/autopilot-activity-panel.tsx` + types / `DashboardView`

---

## Competitive plan Waves 0–3.2 — SHIPPED (2026-07-15)

**PRD:** [docs/prd/content-studio-competitive-plan.md](docs/prd/content-studio-competitive-plan.md)  
**Decision:** [docs/DECISIONS.md](docs/DECISIONS.md) — Execute Wave 0→1→2; partner-demo vs BLG/AutoSEO is primary ICP for 90 days.

**Status:** Waves 0–3.2 shipped · Hosted blog (3.3) deferred · CF edge parity for new routes · messaging refresh applied.

### Shipped this session (parallel agents)

| Item | Status |
|------|--------|
| 0.1–0.4 Humanize reliability + voice score | Done |
| 0.5 Audit strip + `/article-quality` before/after demo | Done |
| 1.1 Sticky brief/SERP context panel | Done — `ContentBriefPanel` + `briefId` |
| 1.2 Live draft score (~2s debounce) + vs-saved delta | Done — local editorial; SERP from last fetch |
| 1.5 Vite create → generate stream (angle/date fields) | Done — Next wizard unchanged (canonical) |
| 2.1 Health cron CMS 16 + social/ESP 8 | Done — `lastHealth*` on tiles |
| 2.2 Instagram image preflight | Done |
| 2.3 Connect setup checklists | Done — webhook + long-tail CMS + social (+ Next publishing cards) |
| 2.4 Publish history | Done — `GET .../publish-records` + publishing tab |
| 2.5 Article → social one-click | Done — "Queue social" → composer → `?tab=queue` (aside props spread fixed) |
| 3.1 Autopilot activity panel | Done — `/dashboard` |
| 3.2 H2 coverage % vs rival topics | Done — `serp.h2Coverage` in quality panels |
| CF parity | Done — publish-records GET, health GET routing, command-center allowlist |

### Still queued / deferred

| Item | Notes |
|------|-------|
| **3.3 Hosted blog** | Deferred until self-serve GTM |
| Full Surfer NLP · TikTok/YouTube/inbox · backlink exchange · detector APIs | Explicitly out of scope |

### Verify

```sh
pnpm --filter @workspace/app-shell exec tsc --noEmit
cd lib/content-engine && npx tsc --noEmit && npx vitest run src/articles/serp-content-score.test.ts
# Manual :3001 — Queue social, connect checklists on Integrations, /dashboard activity, H2 coverage line, /article-quality
```

---

## Competitive gap packaging — SHIPPED (2026-07-15)

**Status:** Packaging tranche complete for competitive gaps vs Surfer/Clearscope/BLG/AutoSEO. Engine packing > new engines.

**Diagnosis:** [docs/competitors/executive-diagnosis.md](docs/competitors/executive-diagnosis.md) — engine-rich, experience-thin; competitors win on packaging, not capability.

### Done (all phases + follow-ups)
- **0:** Command center, 16 CMS tiles, SERP features in rank UI, fast-lane → dashboard
- **1:** Score explain, brief, Add & generate, Seed → clusters, GSC-first CTA, content_refresh + Refresh article
- **2:** Dual SERP/editorial score, competitor topics, Fix gaps enhance (Next + CF + Vite)
- **3:** Integration health API + cron `project_cms`, connect setup steps (WP/Ghost/Shopify/Webflow/Notion/Drupal/Joomla/full-app), lastHealth on tiles
- **4:** Fast-lane autopilot + auto-queue on, internal link hub, Growth checkout when Stripe configured

### Explicitly deferred (not this ship)
- Live Surfer-style NLP editor
- Hosted `blog.customer.goals.ac` fallback
- Per-CMS deep wizards beyond connect checklists

### Verify
- Local `:3001` + CF: command-center, keyword-clusters, serp-score, integrations/health, Add & generate / Refresh article, Fix gaps
- Vite Keywords: Add & generate + Refresh article + no-Semrush banner
- **Unit (2026-07-15):** `serp-content-score` + `keywordGapAnalyzer.refresh` + gsc/keyword-ui — 12/12; seo/billing/articles suite — 27/27
- React Doctor `--scope changed`: **100 / 100** (cleanup pass completed 2026-07-15)

---

## CMS content output modes (2026-07-14)

### Done
- **Contract v0.2:** `output_mode` + structured payloads (`layout`, `content_elements`, `sections`) in `goals-ac-plugin.ts` + `cms-plugins/shared/Contract.php`
- **Registry:** `lib/content-engine/src/support/platform-output-modes.ts` — per-platform modes, defaults, entitlement gating
- **Adapters:** WordPress (fix persistence), Ghost Lexical, Drupal Layout Builder, TYPO3 content elements, Shopify metafields/page sections, Webhook format toggles, Joomla markdown/html
- **Plugins updated:** TYPO3 `ContentPublisher`, Drupal `LayoutBuilderPublish`, Shopify content route + GraphQL metafields
- **UI:** `/integrations` inline output format select on connected cards; `PATCH .../cms-integrations/[platform]/output-mode`
- **Publish path:** `render-service` resolves `outputMode` from connection → piece metadata → default
- **Docs:** `docs/DECISIONS.md`, `docs/cms-plugins/shopify-theme-sections.md`, learn post updated

### Verify
- `cd lib/content-engine && npx tsc --noEmit` — adapter files clean (pre-existing db export errors elsewhere)
- `pnpm --filter @workspace/marketing-persona-app run typecheck` — pass
- Manual: `/integrations` → change output format inline → publish preview on content piece
- Manual per platform: Ghost Lexical, TYPO3 CE, Drupal LB, Shopify metafields (needs dev stores)

### Next (optional)
- Ghost Lexical inline images inside paragraphs (standalone image lines supported)
- ~~TYPO3 FAL sys_file references for textmedia~~ → done 2026-07-15 (plugin ContentPublisher; verify on live TYPO3)
- Shopify theme app block (still deferred) — demos use manual Liquid in `cms-plugins/shopify/theme-snippets/` + docs/cms-plugins/shopify-theme-sections.md; ConnectSetupSteps + health `theme_snippet_required_for` call that out
- ~~Publish history showing output mode used~~ → done 2026-07-15 (see top of HANDOFF; run migrate)

### Done (2026-07-14 follow-up)
- Plugin health test returns `recommendedOutputMode` + `availableOutputModes`
- Auto-apply recommended output format on CMS connect (when user did not pick a non-default mode)
- Ghost Lexical image cards for standalone `![alt](url)` markdown lines
- Content piece preview shows JSON when no HTML preview available

### Done (2026-07-14 finish-dev)
- DeepL migration `0062_org_deepl_credentials` registered in Drizzle journal (migrate applies 0056–0062)
- Public API v1 publish writes `publish_records` via `withPublishRecord` (Next + Express)
- MFA setup panel in Settings → Security; session verify dialog when org requires 2FA
- `MfaComplianceGate` blocks app until setup complete when org mandates MFA

---


### Done
- **Sprint B:** Admin org detail — correct plan badge, suspend/unsuspend; pending invites table with revoke (`DELETE /api/admin/invites/[id]`); MFA/session controls remain hidden (IP allowlist + cross-project editors only)
- **Sprint C:** Goals panel cluster map (briefs grouped by keyword cluster) + GSC progress placeholder card
- **Sprint A:** Token passthrough on compile-briefs, topical-map, content-strategy item generate (where `generationUsage` available)
- **Sprint D:** Legacy company autopilot moved to pg-boss (`legacyCompanyAutopilot` queue); cron only enqueues; api-server no longer builds `worker.mjs` (`start:worker` delegates to `@workspace/worker`); goals-ac `predev` deprecation warning
- **Sprint E:** `publish_records` schema + migration `0055`; Anthropic provider (`lib/ai-providers/src/anthropic.ts`); credit top-up checkout API + Stripe webhook grant; TYPO3 `ContentController` stub; `credit-topup-packs` + anthropic unit tests
- **Pre-existing:** `lib/api-zod` duplicate export typecheck fixed (export api only)

### Verify
- `pnpm run typecheck:libs` — pass
- `pnpm run test:unit` — 83 tests pass
- `pnpm --filter @workspace/db run migrate` — applies `0055_publish_records`
- Admin: `/admin/organizations/[id]`, `/admin/users/invite` (pending + revoke)
- Goals: `/strategy/goals` — cluster map + GSC cards
- Cron: `GET /api/cron/generate-articles` enqueues sweeps only

### Done (optional follow-ups, 2026-07-14)
- **publish_records:** `withPublishRecord` helper wired into sync publish API + `contentPublish` worker job
- **Billing UI:** Settings → Billing shows credit balance, monthly grant, and Stripe top-up pack buttons
- **TYPO3:** `ApiMiddleware` + `Configuration/RequestMiddlewares.php`; HMAC controllers for health/site-graph/content/schema; `ContentPublisher` maps pages + `tt_content` records; nonce/idempotency tables
- **MFA:** TOTP primitives + API routes + Settings setup panel + session verify gate (`MfaComplianceGate`)

### Next (optional)
- Publish history UI from `publish_records`
- TYPO3 docker dev environment

### Next (optional, prior)
- Wire `publish_records` rows from publish pipeline
- Settings UI for credit top-up packs
- Full TYPO3 record mapping + routes registration
- Org-level MFA enforcement when auth supports TOTP gate

---

## Gap audit remediation (2026-07-14)

### Done
- **Billing matrix:** Wired `prepareAiBilling` on images/regenerate, social/composer; worker billing via `lib/jobs/src/worker-billing.ts` for brand voice + LLM visibility jobs; removed false billing on voice/analyze; expanded `ARTICLE_QUOTA_EVENT_TYPES`; added `quotaKind: "article"` on chat, SEO tools, personas, topical-map; past-due subscription block; solo users without org no longer hard-blocked
- **Tests:** `lib/billing/src/pricing.test.ts`, `quotas.test.ts` (80 unit tests pass)
- **Admin/trust:** `canManageAiSettings` includes org owners; admin plan PATCH blocks when Stripe customer/subscription on file (unless `force`); billing tab shows platform-key usage quota
- **Phase 1 goals:** `lib/content-engine/src/goal-brief-compiler.ts`, `POST /api/goals/[id]/compile-briefs`, brief approval gate on content stream, goals panel compile/approve UI, onboarding goal-first step
- **Consolidation:** Cron enqueues `contentGenerateSweep`; `artifacts/goals-ac/DEPRECATED.md`; api-server worker marked deprecated; fixed tsconfig cycle (content-engine ↔ jobs)
- **Docs:** Updated `docs/architecture-roadmap.md` §1/§2/§9, `docs/memory.md`

### Verify
- `pnpm run test:unit` — 80 tests pass
- `pnpm --filter @workspace/marketing-persona-app run typecheck` — pass
- Root `pnpm run typecheck` still fails on pre-existing `lib/api-zod` duplicate export errors (unchanged)

---

## Credit consumption wiring (2026-07-14)

### Done
- PRD: `docs/prd/credit-consumption-wiring.md`; decision in `docs/DECISIONS.md`
- Billing primitives: `lib/billing/src/pricing.ts`, `consumption.ts`, `session.ts`, `quotas.ts`, multi-line `settleReservationLines`
- App helper: `artifacts/marketing-persona-app/src/lib/ai-billing.ts` (`prepareAiBilling` / `completeAiBilling` / `cancelAiBilling`)
- Wired ~27 Next.js AI routes + cron autopilot + worker `contentGenerate`
- Dual enforce: growth/scale platform-key = count quota **and** credit reserve; starter = count quota only; BYOK paid = orchestration credits
- `GET /api/billing/credits`; client `handleAiBillingError` for `insufficient_credits`

### Verify
- `pnpm --filter @workspace/marketing-persona-app run typecheck` — passes
- `cd lib/billing && npx tsc --build` — passes

### Next (optional)
- Retire count quotas after credit enforcement proves stable
- Settings UI credit balance display
- Credit expiry + Stripe metered top-ups

---

## Sitemap brand voice discovery (2026-07-13)

### Done
- Shared sitemap crawler: `lib/seo-tools/src/sitemap-crawl.ts` (robots.txt `Sitemap:` lines, sitemapindex, SSRF)
- Multi-source URL discovery: `brand-scan-discovery.ts` (sitemap + GSC + CMS + homepage; max 8 fetches)
- Orchestrator: `support/brand-scrape-orchestrator.ts` — used by Next.js create/rescrape + legacy Express API
- GSC sync hook: auto brand refresh when `brandMemory.lastScannedAt` older than 24h
- APIs: `POST /api/website-projects/[id]/crawl` (sitemap-only refresh)
- UI: discovery summary on Brand tab + Content Studio `BrandAiProfileCard`

### Audit fixes (same session)
- `crawlStatus: done` when no sitemap (was incorrectly `failed`)
- Sitemap crawl errors no longer abort brand scrape (falls back to homepage discovery)
- SSRF guard (`assertPublicUrl`) on all supplemental page fetches in `brand-scraper.ts`
- Path boost applied once per URL; CMS excerpts sorted by score
- Express `websiteProjects` route wired to same orchestrator as Next.js

### Verify
- `pnpm run test:unit` — 71 tests pass
- Create project with sitemap → `pageCount` > 0, `scrapeData.discoveryMeta.sitemap: true`
- Re-scan → deep voice fields refresh via `brandProfileUpdatesFromExtract`

---

## Semrush integration + Content Suggestions hub (2026-07-13)

### Done
- `@workspace/keyword-research-provider` — Semrush gap (`domain_domains`) + v4 keyword metrics, timeouts, sanitized errors
- Org BYOK: `organizations.encrypted_semrush_api_key`, `semrush_database` (migration `0044_org_semrush_credentials`)
- APIs: `GET/PATCH/DELETE /api/auth/semrush-credentials`, `POST .../test` (rate-limited)
- Discovery: `discoverSemrushOpportunities` → `keyword_opportunities` (`source: semrush`), AI title/angle enrichment
- Keyword analyzer enriches with real Semrush volume/KD when org key is set
- UI: unified **Article ideas** hub (`ArticleIdeasHub`) on Search → Keywords; `/search/suggestions` uses `ContentSuggestionsPanel`
- Rate limits: Semrush discovery 5/hr/project; credential test 10/min/user — **Redis-backed when `REDIS_URL` set**, in-memory fallback otherwise (`@workspace/content-engine/core/rate-limit`)
- **Semrush gap cache:** 24h TTL per project/domain/competitors fingerprint (`semrush-gap-cache.ts`); bypass with `{ refresh: true }` or shift+click **Semrush gaps** in UI
- **API key redaction:** `redactSemrushSecrets()` strips query-string keys and full legacy API URLs from all error paths
- Unit tests: `helpers.test.ts`, `semrushGapAnalyzer.test.ts`, `semrush-gap-cache.test.ts`

### Verified this session (2026-07-13)
- `pnpm --filter @workspace/db run migrate` — applied; `encrypted_semrush_api_key` + `semrush_database` columns present on `organizations`
- `pnpm run typecheck` — pass
- `pnpm run test:unit` — 46 tests pass
- `pnpm --filter @workspace/marketing-persona-app run build` — pass
- Semrush provider live error path (invalid key): returns `WRONG KEY - ID PAIR` without leaking key in message
- Browser (demo@gold.edu): Settings → AI Providers → **Semrush (BYOK)** panel renders; project 4 brand tab saves competitor URLs (`jasper.ai`, `surferseo.com`)
- Search → Keywords → Article ideas: **Semrush gaps** button present; correctly **disabled** when org has no key (`semrush/status` → `configured: false`)

### How to verify (live gap scan — needs your Semrush key)
1. Ensure `GEMINI_KEY_ENCRYPTION_SECRET` is set for the Next dev server (docker-compose uses `local-compose-encryption-secret-not-shared-1234`; add to `artifacts/marketing-persona-app/.env.local` if running `pnpm dev` outside Docker)
2. Settings → AI Providers → **Add Semrush API key** → Test → Save (site admin)
3. Project → **Brand** tab → add competitor URLs (one per line) → Save
4. Search → Keywords → Article ideas → **Semrush gaps** → expect toast with inserted count; filter **Semrush** → Queue one idea
5. `pnpm run typecheck` and `pnpm run test:unit`

Quick CLI smoke test (optional):
```sh
SEMRUSH_API_KEY=your_key pnpm exec tsx -e "
import { getKeywordResearchProvider } from './lib/keyword-research-provider/src/index.ts';
(async () => {
  const p = getKeywordResearchProvider();
  const gaps = await p.getDomainKeywordGaps({
    domain: 'sometech.work',
    competitors: ['jasper.ai'],
    database: 'us',
    apiKey: process.env.SEMRUSH_API_KEY!,
    limit: 5,
  });
  console.log('gaps:', gaps.length, gaps[0]?.keyword);
})();
"
```

### APIs (Next.js)
| Route | Auth / limits |
|-------|----------------|
| `GET/PATCH/DELETE /api/auth/semrush-credentials` | auth; PATCH/DELETE site admin |
| `POST /api/auth/semrush-credentials/test` | auth; 10/min/user |
| `GET .../semrush/status` | project member |
| `POST .../keyword-opportunities` `{ source: "semrush", refresh?: true }` | project member; 5/hr/project |

### Env
- `GEMINI_KEY_ENCRYPTION_SECRET` — encrypts org Semrush API key (same as Gemini/Bedrock BYOK)
- `REDIS_URL` — optional; enables distributed rate limits + shared Semrush gap cache across instances

### Open / fragile
- **Live Semrush gap scan not run this session** — no org API key in local DB; button/UI path confirmed only
- Semrush API units are billed to the org's key; no platform fallback in v1
- Legacy Semrush API passes `key` in query string (Semrush requirement); keys are never echoed in user-facing errors or redacted URL fragments
- Weekly `keywordOpportunitySweep` runs Semrush only when org credentials exist (via `discoverOpportunities` all-sources path)
- Running `pnpm run build` while `pnpm dev` is active can corrupt `.next/dev` manifests (ENOENT on keywords page) — restart dev server if that happens

### Next
- Run live **Semrush gaps** scan once org key is saved (user-owned API key)
- Optional: link Semrush metrics into topical map / 30-day strategy generator prompts

---

## Keyword Research Hub (prior session)

### Done
- GSC Search Analytics sync → `gsc_search_queries` table (migration `0039_keyword_research_hub`)
- GSC opportunity scoring + AI title/angle enrichment → `keyword_opportunities` (`source: gsc_query`)
- Site-admin CSV import, manual entry, Google Sheets OAuth + sync
- UI: `/search/keywords` tabs (Article ideas, Import, Rank tracking, AI analyzer)
- Worker crons: GSC sync daily 07:00 UTC; Sheets sync weekly Mon 08:00 UTC

### Env
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — GSC + Sheets OAuth
