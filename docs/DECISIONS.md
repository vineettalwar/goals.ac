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

## 2026-07-14 — Platform integration hardening (security, performance, accessibility)

**Decision:** Harden all publishing integrations with signed OAuth state, SSRF validation at credential save, RBAC on integration management, bounded CMS site-graph exports, async-default publish, and shared accessibility fixes on the integration UI.

**Alternatives considered:**
- Per-integration one-off fixes — rejected; duplicated effort across 27 destinations
- Rate limiting / WAF at edge — deferred; out of scope for app-layer pass

**Reason:** OAuth CSRF and webhook SSRF were the highest-risk gaps; unbounded site-graph and sync publish caused timeouts on large sites; `ConnectionField` label gaps affected every CMS/ESP form.

**Implications:** `oauth-state.ts` signs callbacks with `AUTH_SECRET`; `requireIntegrationsManage` gates PATCH/DELETE/test; inline WP creds removed from publish API; WP/Joomla/TYPO3 site-graph capped at 500; brand scan caches site-graph 1h; publish UI defaults `async: true`; integration tiles expose status to screen readers.
