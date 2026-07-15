## 2026-07-16 — Ponytail audit is advisory; do not delete goals-app-ui

**Decision:** Treat the 2026-07-16 ponytail frontend audit as a complexity backlog, not a delete mandate. Keep `artifacts/goals-app-ui` — it is the Cloudflare Pages product host for `app.goals.ac`. Prefer high-confidence leftover deletion (Next studio forks) and implement-first parity gaps over package removal.

**Alternatives considered:**
- Delete `goals-app-ui` because Next + app-shell exist — rejected; Pages deploy pipeline and production hostname depend on it
- Auto-apply every ponytail “shrink” finding (CMS dialog mega-merge) — deferred until a focused PRD + visual parity

**Reason:** Explore agents mis-ranked a shipping host as dead code; deploy docs contradict that.

**Implications:** Canonical report at `docs/audits/2026-07-16-ponytail-frontend.md`; unfinished features live in that doc § Features not fully implemented.

## 2026-07-15 — Persist `outputMode` on publish_records

**Decision:** Store the resolved CMS `outputMode` (nullable text) on each `publish_records` row when a publish starts, so publish history can badge the format that was actually sent.

**Alternatives considered:**
- Derive mode only from live connection settings at read time — rejected; connection settings change; history would lie
- Keep mode only in job/response payloads — rejected; UI list endpoints need a durable column

**Reason:** Platform output modes already exist on connections; history and partner demos need the mode frozen per publish attempt.

**Implications:** PG migration `0064_publish_records_output_mode.sql` + D1 `0001_publish_records_output_mode.sql` must be applied before badges show persisted values; write paths (`startPublishRecord` / `withPublishRecord` and callers) pass `outputMode` through.

## 2026-07-15 — Execute Wave 0→1→2 competitive plan

**Decision:** Execute the Content Studio competitive plan in order: Wave 0 (humanize reliability + demo assets) → Wave 1 (Studio side panel brief/SERP + live draft score + unified create UX) → Wave 2 (health cron expansion, connect UX, publish history, article+social one-click). Keep full Surfer live NLP deferred. Partner-demo vs BLG/AutoSEO is the primary ICP for 90 days.

**Alternatives considered:**
- Build Surfer-style real-time NLP editor first — deferred (high cost, Wave 1 side panel covers demo need)
- Skip humanize hardening and ship Studio UI only — rejected; BLG/AutoSEO wins on perceived output quality in demos
- Self-serve hosted blog now — deferred until self-serve GTM ships

**Reason:** Product remains engine-rich and experience-thin; competitors win on workflow coherence and demo-ready surfaces, not missing backends.

**Implications:** PRD at `docs/prd/content-studio-competitive-plan.md`; Wave 1 not started until Wave 0 acceptance; detector APIs and backlink exchange out of scope.

## 2026-07-15 — Competitive packaging over new engines

**Decision:** Close Surfer/Clearscope/BLG-style gaps by packaging existing engines: command center, seed→cluster, dual editorial+SERP score, Fix-gaps enhance, CMS health sweep — shared in `lib/content-engine` + `lib/app-shell`, mirrored on Next and CF workers. No new Semrush clone or live NLP editor in this tranche.

**Alternatives considered:**
- Build a Surfer-style real-time NLP editor first — deferred (high cost, lower packaging ROI)
- Parallel keyword/UX stack outside content-engine — rejected; keep one pipeline

**Reason:** Product was engine-rich and experience-thin; competitors win on workflow coherence. Full diagnosis: `docs/competitors/executive-diagnosis.md`.

**Implications:** Autopilot defaults favor auto-queue after fast-lane; enhance prompts ingest SERP gaps; connection health cron covers project CMS JSON creds as `project_cms`.

## 2026-07-15 — Marketing static CSS stays render-blocking

**Decision:** Do not convert marketing static-export stylesheets to async `preload` + `onload`. Keep `<link rel="stylesheet">` blocking first paint. Critical CSS must not apply bare `.absolute` without offsets.

**Alternatives considered:**
- Expand critical CSS to every above-the-fold Tailwind utility — rejected; brittle and drifts from hero markup
- Hide `body` until CSS loads — rejected; worse empty flash than brief blocking

**Reason:** Async CSS + incomplete critical CSS caused FOUC/CLS on https://goals.ac — hero copy flashed top-left because `position:absolute` applied without `top`/`bottom`/`left`/`right`.

**Implications:** `scripts/build-marketing-static.mjs` no longer rewrites stylesheet links; `MARKETING_CRITICAL_CSS` uses `.absolute.inset-0` only and hides `.hero-anim` until full CSS.

## 2026-07-15 — Three integration hubs by scope

**Decision:** Split integrations into three pages by ownership scope:
- **Organization** — `/integrations/ai` and `/integrations/tools` (AI BYOK, Semrush, DeepL, stock BYOK); bare `/integrations` redirects to `/integrations/ai`
- **Project** — `/projects/:id/integrations/cms|social|esp|search`; bare `/projects/:id/integrations` redirects to `.../cms`
- **Platform** — `/admin/integrations` (Stripe, Resend, Unsplash/Pexels platform keys)

Tabs use **path segments**, not `?tab=` / `?project=` query params. Legacy `/integrations?project=:id` and `/integrations?tab=cms|social|esp|search` redirect to the project path. `/settings?tab=ai` redirects to `/integrations/ai`. OAuth callbacks may still append status query params (e.g. `?linkedin=connected`) on the matching tab path.

**Alternatives considered:**
- Single `/integrations` hub with six tabs (org + project mixed) — rejected; scopes were hard to discover and project gates polluted org flows
- Org under `/settings/integrations` — rejected; user chose top-level `/integrations` for org credentials
- Query-param tabs (`?tab=ai`) — rejected; path segments match project content-studio / social patterns and keep shareable URLs clean

**Reason:** Platform vs org vs project credentials already live in different stores; matching UI routes makes ownership and RBAC obvious.

**Implications:** OAuth success URLs return to `/projects/:id/integrations/social` or `/search` with status query params; nav footer "Organization integrations" → `/integrations`; helpers `orgIntegrationsPath()` / `projectIntegrationsPath()` build path-segment URLs.

## 2026-07-15 — Org BYOK lives under Integrations (AI + Tools)

**Decision:** ~~Move organization AI providers and non-AI org keys onto the same `/integrations` hub as project tabs.~~ Superseded by **Three integration hubs by scope** above — org credentials remain on `/integrations/ai` and `/integrations/tools`; project destinations live under `/projects/:id/integrations/:tab`.

**Alternatives considered:** See superseded note above.

**Reason:** Historical step toward separating Settings from credentials management.

**Implications:** Deep links use `/integrations/ai` and `/integrations/tools` (path segments).

## 2026-07-14 — Per-platform CMS content output modes (contract v0.2)

**Decision:** Generalize WordPress `editorMode` into a platform-aware `outputMode` registry with native-editor modes for Ghost (Lexical), Drupal (Layout Builder), TYPO3 (content elements), and Shopify (metafields / page sections). Bump shared plugin contract to v0.2 with structured publish payloads.

**Alternatives considered:**
- HTML-only for all non-WordPress CMS — rejected; misses native editor fidelity
- Single global `contentFormat` enum — rejected; each CMS ecosystem has different wire formats

**Reason:** Users choose output format once per connection; adapters render canonical Markdown to the format their CMS editor accepts.

**Implications:** `platform-output-modes.ts` is source of truth; integrations UI shows inline output format control; plugins accept `output_mode` + structured fields.

## 2026-07-14 — CmsAdapter render layer for publish

**Decision:** Introduce `CanonicalContent` + per-platform `CmsAdapter.render()` / `publish()` in `lib/content-engine`, with WordPress `editorMode` per connection (classic / gutenberg / elementor / divi).

**Alternatives considered:**
- Keep ad-hoc `marked()` in each connector — rejected; no preview, no plan gating, no page-builder awareness
- Full mdast pipeline before ship — rejected; too much scope for v1

**Reason:** One canonical Markdown source, platform-specific wire format at adapter boundary; public API and render preview reuse the same contract.

**Implications:** Adapted platforms (WordPress, Notion, Webflow, Ghost, Webhook, Contentful, Sanity, Strapi) route through `renderAndPublish`; others unchanged. Webhook v2 adds optional `canonical` object for BYOK+. Public API on Express uses `api_keys` table.


**Decision:** Store Semrush API credentials per organization (encrypted), not as a platform env var.

**Alternatives considered:**
- Platform-level `SEMRUSH_API_KEY` — simpler ops, but bills goals.ac for all customer usage
- Per-user keys — inconsistent with existing org-level Gemini/Bedrock BYOK pattern

**Reason:** Enterprise customers bring their own Semrush subscription; org-level BYOK matches existing AI credential model and keeps API unit costs on the customer.

**Implications:** Gap discovery and keyword metrics require site admin to configure Settings; no silent fallback to AI-estimated volume when Semrush is absent.

## 2026-07-13 — GA4 integration project-scoped for article performance

**Decision:** Add Google Analytics 4 as a per-project integration (separate from GSC), with page-level sync joined to `content_pieces.published_url` for article performance reporting.

**Alternatives considered:**
- Extend `search_property_connections` with GA4 provider — rejected; GA4 uses property IDs and different Admin API, cleaner in dedicated `analytics_property_connections` table
- Platform-level GA credential — rejected; customers have their own GA4 properties per site

**Reason:** Article performance requires on-site engagement (sessions, bounce, engagement rate) that GSC cannot provide. Project-scoped OAuth matches CMS/GSC integration model. Joining GA4 page paths to published URLs enables per-article ROI when blended with GSC clicks.

**Implications:** Integrations hub shows GA4 tile per project; Search → Performance tab shows unified GSC + GA4 table; daily pg-boss sync at 08:00 UTC; requires `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` with `analytics.readonly` scope.

## 2026-07-13 — Multi-source brand scan discovery

**Decision:** Build brand voice/identity from a merged URL discovery layer (sitemap, homepage links, GSC top pages, CMS site-graph excerpts) rather than homepage-only heuristics.

**Alternatives considered:**
- Homepage link heuristics only — simpler but misses about/pricing pages not linked from nav
- Sitemap-only — fails on sites without sitemaps; no traffic signal from GSC

**Reason:** Roadmap Phase 5 specifies URL + sitemap; GSC and CMS plugin data are already in the product and improve voice fidelity without extra user steps.

**Implications:** `runBrandScrapeWithDiscovery` is the canonical scrape entry point; supplemental fetches capped at 8 pages with SSRF guards; missing sitemap sets `crawlStatus: done` (not failed); GSC sync may trigger auto brand refresh once per 24h.


**Decision:** Cache Semrush `domain_domains` gap rows for 24h per project/domain/competitor fingerprint; rate-limit via Redis when `REDIS_URL` is set.

**Alternatives considered:**
- DB table for gap snapshots — durable but adds migration/schema for ephemeral vendor data
- Always call Semrush on every discovery click — burns API units on repeat scans

**Reason:** Repeat scans within a day rarely change; Redis/in-memory cache (same adapter as content cache) avoids duplicate billing. Rate limits use Redis fixed-window counters when available so multi-instance deploys share one bucket; in-memory sliding window remains the single-instance fallback.

**Implications:** POST `keyword-opportunities` accepts `{ refresh: true }` to bypass cache; UI shift+click on Semrush gaps forces refresh. Legacy Semrush API still sends `key` in query string (vendor requirement); all error paths and URL echoes run through `redactSemrushSecrets`.

## 2026-07-13 — Stock images: platform API keys + project provider setting

**Decision:** Stock images use **copyright-free** APIs only (Unsplash, Pexels) with **platform-wide** env keys (`UNSPLASH_ACCESS_KEY`, `PEXELS_API_KEY`). Projects choose search preference via `contentStyle.imageSettings.stockProvider` (auto / unsplash / pexels). Optional org/project BYOK overrides for Unsplash/Pexels only (higher rate limits or compliance).

**Alternatives considered:**
- Org BYOK for all stock APIs including free Unsplash/Pexels — rejected; free APIs should work out of the box with one platform registration
- Hotlink stock URLs at publish — rejected; images must be downloaded, compressed to WebP, and sideloaded to customer WordPress media library (or Goals.ac plugin media endpoint) at publish time
- Paid stock APIs (Getty, Shutterstock) — out of scope; product focuses on copyright-free sources only

**Reason:** Unsplash and Pexels are free for platform integration with clear licensing; keyword-driven `pickBestStockPhoto()` at generation; at publish, `downloadAndOptimizeImage()` (sharp → WebP, max 1920px) uploads to the customer's server and rewrites markdown URLs to hosted media. LinkedIn/Instagram social publish re-optimizes the featured image for platform upload.

**Implications:** Requires at least one free stock API key in env for default auto images, or org/project BYOK for Unsplash/Pexels. Optional keys stored in `organizations.encrypted_stock_credentials` (org) and `contentStyle.imageSettings.encryptedStockCredentials` (project). Resolver: project → org → platform env. Settings and Brand tab expose optional Unsplash/Pexels overrides only.

## 2026-07-13 — Hybrid brand voice RAG + editable skill

**Decision:** Store ingested brand content as chunked pgvector embeddings (`brand_voice_chunks`) with a user-editable `brand_voice_skill` markdown document, retrieved at generation time alongside structured `brand_profiles` constraints.

**Alternatives considered:**
- Static prompt injection only — simpler but no topic-aware retrieval
- External vector DB (Pinecone) — extra vendor; Postgres 17 + pgvector sufficient at current scale

**Reason:** Users ingest websites, uploads, CMS posts, published pieces, and social content; RAG retrieves topic-relevant passages per keyword/format while the skill doc gives non-technical users a reviewable voice guide.

**Implications:** Docker Postgres image is `pgvector/pgvector:pg17`; embedding via Gemini `text-embedding-004`; `brandVoiceIndex` / `brandVoiceSkillRegen` / weekly `brandVoiceResync` pg-boss jobs; generation routes through `loadBrandVoiceGenerationContext`.

## 2026-07-13 — Social Hub: dual OAuth ingest + metrics on social_post_metrics

**Decision:** OAuth historical post sync writes to both brand-voice RAG (`brand_voice_sources` with `social_*` types) and platform voice training (`platform_voices` with `importMeta.source: oauth`). Engagement metrics live in `social_post_metrics` keyed by `(content_piece_id, platform)`, seeded with `remote_post_id` at publish time.

**Alternatives considered:**
- Dedicated `imported_social_posts` table — rejected; voice training + queue on `content_pieces` is sufficient for v1
- Store `remote_post_id` on `content_pieces` — rejected to keep publish metadata in metrics table only

**Reason:** Users need voice fidelity from real posts and performance feedback for scheduling; reusing GA4/GSC sync patterns (service + cron + hub tab) keeps the stack consistent.

**Implications:** Social Hub adds Calendar, Compose, Analytics tabs; weekly `social-history-sync` and daily `social-metrics-sync` crons; Meta OAuth scopes extended for read (`pages_read_engagement`, `instagram_basic`); `bestTimeMode: analytics` reads synced engagement windows.

## 2026-07-14 — Dual enforcement: count quotas + credit ledger

**Decision:** Wire `reserveCredits` / `settleReservation` into all AI generation routes with **dual enforcement** on growth/scale platform-key calls: existing monthly count quotas **and** credit balance checks both must pass.

**Alternatives considered:**
- Credits-only — simpler long-term but removes overlap safety during rollout
- MVP on 4 metered routes only — faster but leaves most AI surfaces unbilled
- Two sequential `settleReservation` calls — risks double-settle; rejected for single transactional multi-line settle

**Reason:** Renewal grants already land in `credit_ledger`; consumption must debit for billing accuracy. Dual enforce preserves familiar quota UX while credits become the durable meter. Starter keeps count quotas only (no monthly credit grants); BYOK on paid plans debits orchestration credits only.

**Implications:** Shared `prepareAiBilling` helper in marketing-persona-app; tier pricing constants in `lib/billing/src/pricing.ts`; worker `contentGenerate` uses same flow; cached AI short-circuits skip billing.

## 2026-07-14 — Dual-track GTM: Growth tier self-serve

**Decision:** Re-enable **Growth** as a self-serve paid plan ($49/mo, 30 articles/mo) alongside free Starter, while keeping Scale as sales-assisted. Add fast-lane onboarding (URL → 3 articles + 30-day plan) for SMB autopilot parity vs AutoSEO.

**Alternatives considered:**
- Consulting-only GTM — rejected for SMB acquisition vs autopilot competitors
- Copy backlink exchange — rejected (spam-policy risk); white-hat internal links instead

**Reason:** Platform engine already supports daily autopilot and 30-item calendars; gaps were packaging, onboarding friction, and billing — not core generation.

**Implications:** `OFFERED_PLAN_IDS` includes `growth`; Stripe checkout + webhook resolve plan from price ID; `/content-autopilot` URL funnel; compare/pricing pages updated for dual track.

## 2026-07-14 — Single Starter plan with BYOK

**Decision:** Ship one product plan — **Starter** — with platform-key monthly quotas and **BYOK** (bring your own API key) for unlimited generations. No Growth/Scale paid tiers or Stripe checkout in v1.

**Alternatives considered:**
- Keep Growth/Scale with credit ledger — deferred until paid billing is ready
- Platform-key unlimited on Starter — rejected; quotas bound platform AI cost

**Reason:** Simplifies onboarding and admin while the product matures; BYOK is the primary path for power users and aligns with existing org-level credential storage.

**Implications:** `OFFERED_PLAN_IDS` is `["starter"]` only; quotas are stored in `plan_quota_config` and editable at Admin → Plans; code defaults apply when no row exists; BYOK skips all quota checks.

## 2026-07-16 — Content-media R2 public host (supersedes prior “no platform bucket”)

**Decision:** Host raster featured images (visual-summary PNG data URIs and publish-time fallbacks) on a dedicated public R2 bucket `goals-ac-content-media`, separate from Next ISR cache (`goals-ac-next-cache`).

**Binding / env:** `CONTENT_MEDIA_R2` Worker binding; `CONTENT_MEDIA_PUBLIC_BASE_URL` (custom domain preferred); optional Node S3 path via `R2_ACCOUNT_ID` + access keys + `CONTENT_MEDIA_R2_BUCKET`.

**Flow:** Enrich uploads data: → HTTPS when configured; publish (CMS/social/Notion) retries host if piece still has data:. WP/Ghost/Shopify CMS-native data-URI upload paths remain.

**Supersedes:** 2026-07-16 “Do not upload that PNG to a platform bucket” (no bucket existed then).

**Ops:** Create bucket, enable public access, set public base URL — `docs/prd/content-media-r2.md`.

## 2026-07-16 — Visual summary featured: PNG via sharp, never SVG data URI

**Decision:** Keep at-a-glance graphics as SVG in `visualSummarySvg` / `visualSummarySvgDataUri` (aside + body markdown). Do **not** assign SVG data URIs to `featuredImageUrl` / `ogImageUrl`. On Node (native sharp in `@workspace/media`), `enrichContentPieceImages` may rasterize the SVG to a PNG data URI when no stock featured exists. Stock remote URLs remain preferred for CMS publish. Cloudflare Workers keep the sharp stub (no rasterize).

**~~Do not upload that PNG to a platform bucket.~~** Superseded by **Content-media R2 public host** above. When that host is not configured, PNG remains a data URI and CMS data-URI upload paths (WP/Ghost/Shopify) still apply.

**Alternatives considered:**
- Pure-JS SVG→PNG (no native deps) — rejected; sharp already in `@workspace/media`
- Leave SVG as featured fallback — rejected; many CMS featured-image APIs reject SVG
- Upload PNG to R2/S3 at enrich time — **accepted later** once `goals-ac-content-media` was scoped

**Reason:** CMS compatibility without dropping the in-app visual summary.

**Implications:** Generation applies infographic before image enrich; with content-media R2 configured, featured becomes HTTPS for Instagram/Notion/social gates.

## 2026-07-14 — Platform integration hardening (security, performance, accessibility)

**Decision:** Harden all publishing integrations with signed OAuth state, SSRF validation at credential save, RBAC on integration management, bounded CMS site-graph exports, async-default publish, and shared accessibility fixes on the integration UI.

**Alternatives considered:**
- Per-integration one-off fixes — rejected; duplicated effort across 27 destinations
- Rate limiting / WAF at edge — deferred; out of scope for app-layer pass

**Reason:** OAuth CSRF and webhook SSRF were the highest-risk gaps; unbounded site-graph and sync publish caused timeouts on large sites; `ConnectionField` label gaps affected every CMS/ESP form.

**Implications:** `oauth-state.ts` signs callbacks with `AUTH_SECRET`; `requireIntegrationsManage` gates PATCH/DELETE/test; inline WP creds removed from publish API; WP/Joomla/TYPO3 site-graph capped at 500; brand scan caches site-graph 1h; publish UI defaults `async: true`; integration tiles expose status to screen readers.
