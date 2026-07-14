# Session Handoff

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
- TYPO3 FAL sys_file references for textmedia (currently embeds img in bodytext HTML)
- Shopify theme app block (vs manual Liquid snippet)
- Publish history showing output mode used

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
