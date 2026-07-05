# Competitive Edge PRD — goals.ac vs BabyLoveGrowth.ai

**Version:** 1.0
**Date:** July 2026
**Status:** Approved for execution (Phases E1–E3 in progress)
**Companion doc:** [goldsuite-ac-prd.md](goldsuite-ac-prd.md) (product vision & feature inventory)

---

## 1. Executive Summary

goals.ac competes in the "SEO content on autopilot" category. The reference
competitor is **BabyLoveGrowth.ai** — a $99/month platform serving 1,000+
businesses that auto-generates and auto-publishes daily SEO articles, builds
backlinks through an exchange network, and tracks AI search visibility.

Their most-cited weakness in independent reviews: **content quality requires
heavy editing**, which silently multiplies the true cost per article. Their
model is also a **black box** — one price, no cost transparency, no control
over the pipeline, credit-card-gated trial.

Our edge thesis: win on **article quality (humanization)**, **radical cost
transparency (BYOK)**, and **user control (conversational agent)** — while
reaching **integration parity** and shipping the **production hardening**
(quotas, usage metering, legal pages, rate limiting) required to charge money.

---

## 2. Competitor Teardown — BabyLoveGrowth.ai

### 2.1 What they ship

| Area | Their offering |
|---|---|
| Content engine | 30 SEO + LLM-optimized articles/month, auto-published daily; keyword research, outlines, internal links, images, citations included |
| Content strategy | Auto-generated 30-day content plan (titles + target keywords) |
| Integrations | WordPress, Webflow, Shopify, Wix, Ghost, Framer plugin |
| Backlinks | Contextual backlink exchange network across their customer base |
| AI visibility | Tracks brand/URL citations inside ChatGPT, Claude, Perplexity, Gemini |
| GEO | Technical GEO audits (schema errors, meta tags) |
| Reddit agent | AI agent that finds relevant Reddit conversations for brand mentions |
| Languages | All major languages with localized keyword research |
| Pricing | $99/mo (anchored from $247/mo), custom agency plan, 3-day CC-required trial, 90-day traffic money-back guarantee |

### 2.2 Where they are weak (our openings)

| Weakness | Evidence | Our counter |
|---|---|---|
| **Generic-sounding output** | Reviews score 7.8/10 and warn "if content quality in your niche requires heavy editing, your true cost per article is higher than sticker price" | Multi-pass **humanization pipeline** + brand voice matching + editable review step |
| **Cost opacity** | Single $99/mo price; no per-article cost visibility; no BYOK | **BYOK (~$0.01–0.05/article)** + per-generation cost display + usage dashboard |
| **Black-box autopilot** | Articles appear on schedule; no topic negotiation | **Conversational content agent**: research → propose → refine → "build" |
| **Risky backlink exchange** | Link-trading networks are PBN-adjacent; Google spam-policy exposure | Don't copy it. Offer white-hat internal-link automation + citation-worthy content; revisit digital-PR later |
| **CC-gated 3-day trial** | Friction at top of funnel | Free tier (5 articles/mo) + free public tools (roadmaps, GEO audit) as lead gen |
| **No workspace beyond articles** | Articles only | Full **Content Studio** (20+ formats), growth roadmaps, repurposing |

### 2.3 Where they are ahead (parity gaps we must close)

| Their advantage | Our gap | Priority |
|---|---|---|
| Shopify, Wix, Ghost, Framer connectors | We have WordPress, Notion, Webflow only | **P0** — Ghost + generic webhook now; Shopify next |
| Daily autopilot cadence | Cron exists but no per-company schedule control | P1 |
| AI visibility tracking over time | We have point-in-time GEO audit only | P1 — recurring audit + brand citation tracking |
| Multilingual with localized keyword research | Language setting exists in content style; not localized research | P2 |
| Backlink program | None | P2 — white-hat alternative only |
| Production billing | Static pricing page, no enforcement | **P0** — quota enforcement now, Stripe next |

---

## 3. Edge Pillars

### Pillar 1 — Humanized articles (quality moat) **[P0 — this iteration]**

The single highest-leverage differentiator, because it attacks the
competitor's #1 verified weakness.

Requirements:

1. **Humanization pass** — a second AI pass over every generated article that
   rewrites for human rhythm: varied sentence length, contractions, concrete
   phrasing, first/second person where appropriate, zero AI-tell phrases —
   while **preserving** headings, keywords, citations, FAQ, and JSON-LD.
2. **Intensity setting** per company: `off | light | strong` (default `light`).
3. **Voice matching** — optional writing sample stored on the company profile;
   the humanizer mimics its cadence and diction.
4. **Provenance** — articles record whether they were humanized; UI shows a
   "Humanized" badge.
5. Applies to both manual generation and the autopilot cron.

Future (not this iteration): user feedback loop ("make it more casual"),
plagiarism/fact-check pass, per-article re-humanize button.

### Pillar 2 — Radical cost transparency + BYOK **[P0 — this iteration]**

Positioning: *"Their $99/mo is our free tier plus ~$1/mo of Gemini credits."*

Requirements:

1. **BYOK actually wired** in marketing-persona-app (key exists in settings;
   generation client must use it — currently platform key only).
2. **`usage_events` metering** — every AI generation records tokens in/out,
   estimated cost, BYOK flag, feature type.
3. **Quota enforcement** — plan column (`starter | growth | scale`) with
   monthly article limits enforced at generation time (BYOK bypasses quota).
4. **Usage dashboard** — this month's generations, quota remaining, estimated
   BYOK spend.
5. Per-generation cost line: `~1,650 words · ~$0.03 (your key) · 12s`.

Future: Stripe checkout + webhooks, plan upgrade prompts at quota exhaustion.

### Pillar 3 — Integrations breadth **[P0 — this iteration]**

Close the connector gap and surface everything in one place.

1. **Ghost publisher** — Admin API (JWT signed with admin API key), publish as
   draft or live.
2. **Generic webhook publisher** — POST article JSON to any URL with HMAC-SHA256
   signature header; unlocks Zapier/Make/n8n and custom stacks — a connector
   the competitor doesn't offer.
3. **`/integrations` hub** (authed) — one page listing WordPress, Notion,
   Webflow, Ghost, Webhook with connect / test / status.
4. Credentials AES-256-GCM encrypted at rest (existing pattern), SSRF-guarded.

Next wave: Shopify blog API, Wix, Framer, sync-back webhooks from WordPress.

### Pillar 4 — GEO / AI-visibility leadership **[P1 — next iteration]**

We already have a GEO audit tool; the competitor turned visibility tracking
into a headline feature. Plan: scheduled re-audits, brand-citation checks
across AI engines, trend charts, and "GEO score over time" on the dashboard.

### Pillar 5 — Agent-driven control **[P1 — next iteration]**

Conversational content agent (see companion PRD §8): preferences → topic
research → proposals with intent/difficulty → refinement chat → "build".
Autopilot when you want it, a steering wheel when you don't.

---

## 4. Production Readiness **[P0 — this iteration]**

Required before charging money or running paid acquisition:

| Item | Requirement |
|---|---|
| Quota enforcement | Plan limits enforced server-side; friendly 402-style error with upgrade prompt |
| Usage metering | `usage_events` written on every generation (both apps eventually; marketing-persona-app now) |
| Legal pages | `/privacy` and `/terms` real routes with substantive content; linked from footer |
| Rate limiting | Per-user limiter on expensive AI routes; per-IP on auth routes |
| Security headers | HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy via Next config |
| BYOK | User keys used by the AI client; encrypted at rest (existing AES-256-GCM) |
| Typecheck green | `pnpm run typecheck` passes across the monorepo |

Deferred to next iteration: Stripe billing, error monitoring (Sentry),
uptime/status page, E2E test suite, backup/restore runbook.

---

## 5. Pricing Strategy (informed by competitor)

| Tier | Price | Platform AI quota | BYOK | Notes |
|---|---|---|---|---|
| Starter | Free | 5 articles/mo | ✅ unlimited | No credit card; beats their CC-gated trial |
| Growth | $49/mo | 50 articles/mo | ✅ | Half their price, more articles than their 30/mo |
| Scale | $149/mo | Unlimited | ✅ | Multi-site, agency use |

Marketing angle: publish a transparent cost-comparison page
("BabyLoveGrowth alternative") — their $99/mo vs our free tier + BYOK.

---

## 6. Execution Plan — This Iteration

Three sequential workstreams (each is an independent commit):

| Phase | Workstream | Key deliverables |
|---|---|---|
| **E1** | Humanization pipeline | `humanizer.ts`, company humanization settings (level + writing sample), wired into manual + cron generation, settings UI, Humanized badge |
| **E2** | Integrations expansion | `ghost.ts` + `webhook.ts` publishers, `integration_connections` table, `/integrations` hub, connect/test/publish API routes |
| **E3** | Prod hardening | `usage_events` + plan quotas, BYOK wiring in gemini client, usage dashboard, `/privacy` + `/terms`, rate limiting, security headers |

All DB changes follow the drizzle-kit generate workflow (CONTRIBUTING.md).
All new API routes use existing auth middleware. Nothing existing is deleted.

## 7. Success Metrics

| Metric | Target |
|---|---|
| Humanization adoption | > 70% of articles generated with humanization on |
| Post-generation edit rate | < 30% of humanized articles edited before publish (proxy for quality vs competitor's "heavy editing" complaint) |
| BYOK adoption | > 30% of active users |
| Publish-through rate | > 25% of generated articles published to a connected CMS |
| Integration connections per active company | ≥ 1.2 |
| Quota-hit → upgrade CTR | > 15% |

## 8. Out of Scope (explicitly)

- Backlink exchange network (spam-policy risk; will not copy)
- Reddit engagement agent (P2 backlog)
- Stripe billing (next iteration; enforcement layer ships now so billing drops in cleanly)
- Multilingual localized keyword research (P2)
