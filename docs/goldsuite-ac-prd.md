# GoldSuite AC — Product Requirements Document

**Version:** 1.0  
**Date:** July 2026  
**Domain:** gold.edu (planned) / goals.ac (current codebase)  
**Status:** Draft — based on codebase audit + product vision

---

## 1. Executive Summary

**GoldSuite AC** (Automated Content Agent) is a B2B SaaS platform that helps marketing teams and founders produce well-researched, humanized, SEO-optimized articles at scale — without hiring a full content agency. Users connect their websites (starting with WordPress), define their audience and preferences through an AI agent, receive topic ideas and refinement pointers, and on command ("build") generate publication-ready articles that can auto-publish to their CMS.

The platform offers two AI cost models:
- **Platform subscription** — GoldSuite provides AI generation via its own API keys (included in plan quota).
- **Bring Your Own Key (BYOK)** — Users supply their own Gemini API key to reduce subscription cost and control spend directly.

**Core principle:** Nothing gets deleted. Existing features from goals.ac (roadmaps, content studio, GEO audit, competitor analysis, Notion/Webflow publishing) are preserved and gated behind authentication. Public marketing pages showcase capabilities; the full product unlocks after login.

---

## 2. Problem Statement

| Pain | Current reality |
|------|-----------------|
| Content velocity | B2B teams need 4–12 articles/month; most publish 1–2 |
| Research quality | AI tools produce generic filler; SEO requires citations, structure, intent |
| CMS friction | Copy-paste from AI tools to WordPress is manual and error-prone |
| Cost opacity | Users don't know whether to pay for a SaaS subscription or their own API keys |
| Strategy gap | Topic selection is guesswork without audience research and competitor context |

---

## 3. Target Users

| Persona | Role | Primary need |
|---------|------|--------------|
| **Sarah** | Head of Content Marketing | Consistent SEO pipeline, WordPress auto-publish |
| **Alex** | Solo founder / indie hacker | Affordable content without agency fees |
| **Maya** | Agency account manager | Multi-client content at scale with BYOK to pass costs through |

---

## 4. Product Vision & User Journey

### 4.1 Ideal Flow (Target State)

```
Sign up → Agent onboarding → Preferences & goals → Topic research →
Topic ideas + refinement pointers → User says "build" →
Humanized articles generated → Review → Publish to WordPress/CMS
```

### 4.2 Detailed Steps

| Step | What happens | User action |
|------|--------------|-------------|
| 1. **Account** | Email/password or Google OAuth; all work scoped to user account | Sign up / log in |
| 2. **Agent starts** | AI agent asks: industry, audience, goals, tone, competitors, publishing cadence | Answer preference questions |
| 3. **Research** | Agent researches topic landscape, competitor content, keyword opportunities | Review research summary |
| 4. **Topic ideas** | 5–10 topic proposals with search intent, difficulty, and angle | Select, refine, or reject |
| 5. **Refinement** | Agent gives pointers: angle tweaks, keyword focus, outline suggestions | Iterate until satisfied |
| 6. **Build** | User says "build" (or clicks Build) → articles generated | Trigger generation |
| 7. **Review** | Humanized article with citations, FAQ, JSON-LD, proper spacing/margins | Edit or approve |
| 8. **Publish** | Push to WordPress (draft or live) or other CMS | One-click publish |

---

## 5. What's Already Implemented

### 5.1 Codebase Overview

The monorepo contains **two parallel frontends** sharing one PostgreSQL database:

| App | Stack | Port | Role |
|-----|-------|------|------|
| `artifacts/goals-ac` | React + Vite | 5173 | Mature platform: roadmaps, content studio, projects |
| `artifacts/marketing-persona-app` | Next.js 15 | 3001 | **GoldSuite AC core**: autopilot articles, personas, WordPress |
| `artifacts/api-server` | Express 5 | 8080 | REST API for goals-ac |

**Recommendation:** Consolidate toward `marketing-persona-app` as the GoldSuite AC shell, importing/linking goals-ac features behind auth rather than maintaining two separate UIs long-term.

### 5.2 Implemented Features Matrix

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| **User accounts** | ✅ Done | `users` table; auth in both apps | JWT (goals-ac), NextAuth (marketing-persona-app) |
| **Email/password auth** | ✅ Done | `api/auth/signup`, `auth.ts` | bcrypt hashing |
| **Google OAuth** | ✅ Done | Both apps (optional env) | |
| **Password reset** | ✅ Done | api-server + Resend | |
| **Super-admin** | ✅ Done | `role = super_admin'` | `/admin` panel |
| **Company onboarding** | ✅ Done | `onboarding/page.tsx` | Company name, URL, industry, audience |
| **Marketing personas** | ✅ Done | `onboarding/personas`, AI generation | Pain points, goals, content prefs |
| **WordPress connection** | ✅ Done | `onboarding/wordpress`, `wordpress_connections` | REST API, app passwords, encrypted storage |
| **WordPress test** | ✅ Done | `api/wordpress/test` | Permission check via `/users/me` |
| **WordPress publish** | ✅ Done | `lib/publishers/wordpress.ts` | Markdown→HTML, Yoast meta, categories |
| **Article generation** | ✅ Done | `lib/ai/article-generator.ts` | 1400–1800 words, citations, FAQ, JSON-LD |
| **Autopilot dashboard** | ✅ Done | `(app)/autopilot/page.tsx` | Article list, WP status, manual generate |
| **Cron auto-generate** | ✅ Done | `api/cron/generate-articles` | For all onboarded companies |
| **BYOK (Gemini key)** | ⚠️ Partial | Settings UI in both apps | **goals-ac/api-server**: fully wired; **marketing-persona-app**: UI exists but AI client doesn't use user key yet |
| **Cost display** | ❌ Missing | — | No per-generation cost or usage dashboard |
| **Agent preference flow** | ⚠️ Partial | Onboarding wizard | No conversational agent; form-based only |
| **Topic research + ideas** | ❌ Missing | — | No dedicated topic ideation agent step |
| **"Build" command** | ⚠️ Partial | `GenerateArticleButton` | Manual button, not conversational "build" |
| **Stripe billing** | ❌ Missing | Pricing pages are static | No payment processing |
| **Plan enforcement** | ❌ Missing | — | Quotas not enforced in DB |
| **Features page** | ❌ Missing | — | Features live on homepage sections only |
| **Privacy / Terms** | ❌ Missing | Footer links only | No actual routes |
| **Growth roadmaps** | ✅ Done | goals-ac + public directory | `/roadmaps` |
| **Content Studio (20 formats)** | ✅ Done | goals-ac | Blog, LinkedIn, whitepapers, etc. |
| **SEO articles** | ✅ Done | Both stacks | Roadmap-linked long-form |
| **GEO audit** | ✅ Done | Both apps | Public + authenticated |
| **Notion publishing** | ✅ Done | goals-ac only | Encrypted per-project |
| **Webflow publishing** | ✅ Done | goals-ac only | Encrypted per-project |
| **Competitor analysis** | ✅ Done | goals-ac | |
| **Brand profile scraping** | ✅ Done | goals-ac | SSRF-protected |
| **Content style settings** | ✅ Done | goals-ac | Tone, persona, forbidden words |
| **Roadmap AI chat** | ✅ Done | `api/chat/route.ts` | Growth advisor on roadmap pages |

### 5.3 WordPress Integration — Detailed Audit

**marketing-persona-app (primary for GoldSuite AC):**

| Capability | Implemented |
|------------|-------------|
| Encrypted credential storage (`wordpress_connections`) | ✅ |
| Application password auth | ✅ |
| Connection test on save | ✅ |
| Onboarding step (skippable) | ✅ |
| Settings page for reconfiguration | ✅ |
| Manual publish per article | ✅ |
| Auto-publish on cron when `defaultStatus = publish` | ✅ |
| Markdown → HTML via `marked` | ✅ |
| Yoast SEO meta (`_yoast_wpseo_metadesc`) | ✅ |
| Category assignment | ✅ |
| SSRF protection | ✅ |

**goals-ac + api-server (secondary):**

| Capability | Implemented |
|------------|-------------|
| Per-publish credentials (not persisted) | ✅ |
| `PublishDialog` UI | ✅ |
| REST API (`wp-json/wp/v2/posts`) | ✅ |

**WordPress gaps (to build):**

- OAuth / plugin-based connection (currently app passwords only)
- Multi-site management (one connection per company today)
- Scheduled publish by date (column exists; cron ignores schedule)
- Sync from WordPress back (webhooks)
- Persistent WP credentials in goals-ac stack
- Ghost, Medium, Substack connectors

### 5.4 Article Quality — What's Built

The `article-generator.ts` prompt already enforces:

- 1400–1800 word count
- H2/H3 structure, short paragraphs, bullet lists
- Inline citations with authoritative sources
- 4–6 FAQ items (People Also Ask targeting)
- JSON-LD schema (Article + FAQPage)
- Persona alignment
- Internal link suggestions
- Anti-AI-filler instructions ("no 'In today's fast-paced world'")
- Search intent classification

**Gaps for "humanized" polish:**

- No post-generation humanization pass (second AI edit for voice)
- No typography/spacing preview tuned to WordPress theme
- No plagiarism or fact-check step
- No user feedback loop ("make it more casual")

---

## 6. Feature Gating Strategy

### 6.1 Public (No Login)

| Page / Feature | Purpose |
|----------------|---------|
| Homepage | Hero, feature highlights, CTA to signup |
| `/about` | Company story, mission |
| `/features` | **To build** — dedicated feature breakdown |
| `/pricing` | Tier comparison, BYOK explanation |
| `/roadmaps` | Public SEO directory (lead gen) |
| `/geo-audit` | Free GEO audit tool (lead gen) |
| `/login`, `/signup` | Auth entry points |

### 6.2 Authenticated (Behind Login)

| Feature | Current gate | Notes |
|---------|--------------|-------|
| Onboarding wizard | Redirect if no company | Steps 1–3 |
| Autopilot dashboard | `(app)` layout | Core GoldSuite AC |
| Article editor / publish | Auth required | |
| Persona management | Auth required | |
| WordPress settings | Auth required | |
| BYOK settings | Auth required | |
| **Roadmaps (personal)** | goals-ac JWT | Keep, link from dashboard |
| **Content Studio** | goals-ac JWT | Keep, add nav link |
| **GEO audit (saved)** | Auth required | |
| **Competitor analysis** | Auth required | |
| **Notion / Webflow** | goals-ac project settings | |
| **Admin panel** | `super_admin` role | |

### 6.3 Nothing Deleted — Migration Plan

| Existing feature | Action |
|------------------|--------|
| Growth roadmaps | Keep public directory; personal roadmaps behind login |
| Content Studio (20 formats) | Add "Content Studio" nav item in authenticated shell |
| Notion / Webflow publishing | Keep in project settings; surface in "Integrations" hub |
| GEO audit | Keep public free tier; saved audits behind login |
| Competitor analysis | Behind login; link from onboarding research step |
| Admin panel | Unchanged; super-admin only |
| Lead capture | Keep on public roadmap pages |

---

## 7. Subscription & Pricing Model

### 7.1 Proposed Tiers

| Tier | Price | Platform AI quota | BYOK | WordPress | Other |
|------|-------|-------------------|------|-----------|-------|
| **Starter** | Free | 5 articles/mo | ✅ | Manual publish | 1 company |
| **Growth** | $49/mo | 50 articles/mo | ✅ | Auto-publish | Unlimited personas |
| **Scale** | $149/mo | Unlimited | ✅ | Multi-site | Team seats (future) |

### 7.2 BYOK vs Platform AI

| Mode | How it works | Cost to user |
|------|--------------|--------------|
| **Platform AI** | GoldSuite's `GEMINI_API_KEY`; counted against plan quota | Included in subscription |
| **BYOK** | User's encrypted Gemini key in settings; bypasses platform quota | User pays Google directly (~$0.01–0.05/article) |

**UI requirements (to build):**

- Settings: toggle "Use my API key" with estimated cost per article
- Generation UI: show "Powered by your key" vs "Platform AI (3 of 50 remaining)"
- Usage dashboard: generations this month, estimated spend (BYOK), quota remaining (platform)

### 7.3 Cost Display (New Feature)

Per generation, show:

```
Article generated · ~1,650 words · ~$0.03 (your key) · 12s
```

Track in new `usage_events` table: `user_id`, `type`, `tokens_in`, `tokens_out`, `cost_usd`, `used_byok`, `created_at`.

---

## 8. Agent Experience — Gap Analysis & Build Plan

### 8.1 Current State

Onboarding is **form-based** (3 steps), not conversational. There is no agent that:
- Asks open-ended preference questions
- Runs topic research
- Proposes topic ideas with refinement pointers
- Waits for "build" command

### 8.2 Target Agent Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Content Agent (new)                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Preferences │→ │ Topic Research│→ │ Idea Generator │ │
│  └─────────────┘  └──────────────┘  └────────────────┘ │
│         │                                    │           │
│         ▼                                    ▼           │
│  ┌─────────────┐                    ┌────────────────┐  │
│  │ Company +   │                    │ Refinement Chat │  │
│  │ Persona DB  │                    │ (existing chat  │  │
│  └─────────────┘                    │  pattern)       │  │
│                                     └────────┬───────┘  │
│                                              │ "build"   │
│                                              ▼           │
│                                     ┌────────────────┐  │
│                                     │ Article Builder │  │
│                                     │ (existing gen)  │  │
│                                     └────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 8.3 New Tables (Proposed)

| Table | Purpose |
|-------|---------|
| `content_agent_sessions` | Agent conversation state per user/company |
| `topic_ideas` | Proposed topics with status (proposed/accepted/rejected/built) |
| `usage_events` | AI cost and quota tracking |

### 8.4 Agent UI (Proposed)

New route: `/agent` or replace onboarding step 2 with chat interface.

Phases:
1. **Discover** — "Tell me about your content goals"
2. **Research** — Agent runs competitor/keyword research (reuse competitor analysis + topical map generator)
3. **Propose** — Topic cards with intent, difficulty, angle
4. **Refine** — Chat to adjust angle, keywords, outline
5. **Build** — User confirms → triggers `generateArticle()` for each accepted topic

---

## 9. Integrations Hub (Future)

Central `/integrations` page behind login:

| Platform | Status | Priority |
|----------|--------|----------|
| WordPress | ✅ Built | P0 |
| Notion | ✅ Built (goals-ac) | P1 — port to marketing-persona-app |
| Webflow | ✅ Built (goals-ac) | P1 |
| Ghost | ❌ | P2 |
| Medium | ❌ | P3 |
| Custom webhook | ❌ | P2 |

---

## 10. Marketing Pages — Build List

| Page | Status | Content |
|------|--------|---------|
| `/` (Home) | ✅ Exists | Update copy for GoldSuite AC branding |
| `/about` | ✅ Exists | Mission, team, gold.edu story |
| `/features` | ❌ **Build** | Deep-dive: agent, research, articles, WordPress, BYOK |
| `/pricing` | ✅ Exists | Add BYOK cost comparison section |
| `/privacy` | ❌ **Build** | Standard privacy policy |
| `/terms` | ❌ **Build** | Terms of service |

---

## 11. Technical Priorities (Ordered)

### Phase A — Foundation (Now)
1. ✅ Demo test user seed script (`pnpm --filter @workspace/db run seed-test-user`)
2. Wire BYOK in marketing-persona-app AI client (match api-server priority)
3. Add `/features` marketing page
4. Add `/privacy` and `/terms` stub pages

### Phase B — Agent MVP
5. Content Agent chat UI (`/agent`)
6. Topic ideas table + API
7. Research step (competitor URLs → topic suggestions)
8. "Build" trigger from accepted topics

### Phase C — Monetization
9. `usage_events` table + cost tracking
10. Usage dashboard in settings
11. Stripe integration + plan enforcement
12. Quota exhaustion prompts

### Phase D — Consolidation
13. Unified nav: Autopilot + Content Studio + Roadmaps + Integrations
14. Port Notion/Webflow to marketing-persona-app
15. Rebrand goals.ac → GoldSuite AC / gold.edu
16. Deprecate duplicate goals-ac UI (or embed as iframe/module)

---

## 12. Demo Account (Testing)

For local/dev testing, run:

```sh
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/goalsac \
  pnpm --filter @workspace/db run seed-test-user
```

| Field | Value |
|-------|-------|
| **User ID** | (assigned on seed — check console output) |
| **Email** | `demo@gold.edu` |
| **Password** | `GoldSuite2026!` |
| **Company** | GoldSuite Demo Co (onboarding complete) |
| **Persona** | Sarah Chen — Head of Content Marketing |

Login at `marketing-persona-app` `/login` (port 3001) or `goals-ac` `/login` (port 5173).

---

## 13. Success Metrics

| Metric | Target (6 months post-launch) |
|--------|-------------------------------|
| Signup → onboarding complete | > 60% |
| Onboarding → first article generated | > 40% |
| Articles published to WordPress | > 25% of generated |
| BYOK adoption | > 30% of paid users |
| Monthly churn (paid) | < 5% |
| Avg articles/user/month (Growth) | > 8 |

---

## 14. Open Questions

1. **Branding:** gold.edu vs goals.ac vs goldsuite.ac — single canonical domain?
2. **Single app:** Merge goals-ac into marketing-persona-app or keep both?
3. **Agent model:** Gemini only or multi-provider (OpenAI, Anthropic)?
4. **Humanization pass:** Second AI edit step or human-in-the-loop only?
5. **Team seats:** Multi-user per company in v1 or v2?

---

## 15. Appendix — File Reference

| Area | Key files |
|------|-----------|
| Auth | `artifacts/marketing-persona-app/src/auth.ts` |
| Onboarding | `artifacts/marketing-persona-app/src/app/onboarding/` |
| Article gen | `artifacts/marketing-persona-app/src/lib/ai/article-generator.ts` |
| WordPress | `artifacts/marketing-persona-app/src/lib/publishers/wordpress.ts` |
| Autopilot UI | `artifacts/marketing-persona-app/src/app/(app)/autopilot/` |
| BYOK (goals-ac) | `artifacts/api-server/src/lib/geminiClient.ts` |
| DB schema | `lib/db/src/schema/` |
| Pricing | `artifacts/marketing-persona-app/src/app/(public)/pricing/page.tsx` |
| Roadmap (shipped) | `docs/roadmap.md` |
