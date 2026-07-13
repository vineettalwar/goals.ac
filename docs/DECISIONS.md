# Architecture decisions (append-only)

## 2026-07-13 — Semrush org BYOK for keyword research

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

**Decision:** Platform-level `UNSPLASH_ACCESS_KEY` and `PEXELS_API_KEY`; projects choose provider via `contentStyle.imageSettings.stockProvider`.

**Alternatives considered:**
- Org BYOK for stock APIs — deferred; matches Semrush pattern but adds settings UI before first customer need
- Hotlink stock URLs at publish — rejected; images must live on customer WordPress media library or LinkedIn upload

**Reason:** Keyword-driven `pickBestStockPhoto()` at generation; WebP sideload to WordPress (`featured_media` / plugin media endpoint) or LinkedIn Images API at publish. Pipeline stays CMS-agnostic; WordPress adapter owns upload.

**Implications:** Requires at least one stock API key in env. Gutenberg native blocks remain Phase 2; v1 uses sideloaded semantic HTML.

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

