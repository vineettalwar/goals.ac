# Session Handoff

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
- Rate limits: Semrush discovery 5/hr/project; credential test 10/min/user — **Redis-backed when `REDIS_URL` set**, in-memory fallback otherwise (`@workspace/content-engine/rate-limit`)
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
