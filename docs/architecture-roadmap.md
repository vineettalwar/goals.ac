# goals.ac — Architecture Audit & Phase 1–3 Strategic Roadmap

**Status:** Working document — Lead Product Architecture
**Date:** July 2026
**Scope:** Gap analysis of the current codebase, sprint focus for the User Account/Dashboard layer, CMS-agnostic content pipeline design, BYOK security architecture, and the Claude-family agent hierarchy.

---

## 1. Where We Actually Are (Codebase Audit)

The "50% implemented API core" framing undersells and oversells at the same time. What exists today:

### What's genuinely strong

- **Shared schema layer** — `lib/db` (Drizzle + Zod) is a single source of truth consumed by every app. 20 tables covering users, projects, brand profiles, content pieces, strategies, roadmaps, GEO audits, usage events, and integration connections.
- **Contract-first API tooling** — `lib/api-spec` (OpenAPI) with Orval codegen into `lib/api-zod` and `lib/api-client-react`. This is the right foundation for a public API later.
- **Real security primitives already in place** — AES-256-GCM credential encryption, SSRF guard on all outbound fetches, rate limiting, security headers, supply-chain-hardened pnpm config.
- **Usage metering exists** — `usage_events` records tokens + estimated cost per generation with a BYOK flag; plan quotas are enforced server-side.
- **Humanization pipeline shipped** — second-pass rewrite with per-company intensity and writing-sample voice matching. This is the differentiator; it needs to become a first-class pipeline stage, not a feature flag.

### The critical structural problem: two parallel products in one repo

| | `artifacts/goals-ac` + `artifacts/api-server` | `artifacts/marketing-persona-app` |
|---|---|---|
| Stack | Vite SPA + Express 5 REST API | Next.js full-stack (App Router, NextAuth) |
| AI generators | `api-server/src/services/*` | `marketing-persona-app/src/lib/ai/*` (12 generators) |
| Publishers | Notion, Webflow, WordPress | Notion, Webflow, WordPress, **Ghost, Webhook** |
| Encryption / SSRF / rate-limit | `api-server/src/lib/*` | duplicated in `src/lib/*` |
| Auth | JWT + bcrypt, hand-rolled | NextAuth |
| Newer features | — | Humanization, autopilot cron, integrations hub, onboarding, usage dashboard |

Both write to the same database with different auth systems and duplicated business logic. Every feature now costs 2× to maintain and the two surfaces are already drifting (Ghost/Webhook publishing exists only in the Next app; the Express API has routes the Next app lacks). **This duplication is the single largest gap between "API foundation" and "production SaaS" — bigger than any missing feature.**

### Gap analysis: API-only foundation → production SaaS

| # | Gap | Evidence | Severity |
|---|-----|----------|----------|
| 1 | **Duplicated app split** (above) | Two encryption libs, two publisher sets, two auth systems | 🔴 Blocks everything |
| 2 | **No async job system** | All AI generation runs synchronously inside the HTTP request (SSE). Autopilot is a bare Next.js cron route. No retries, no scheduled publishing, no long-running orchestration | 🔴 Blocks Phase 3 |
| 3 | **Single AI provider, hardwired** | Gemini via `@google/genai` is baked into every generator. BYOK = "bring your own *Gemini* key" only. No provider abstraction, no model routing | 🔴 Blocks agent hierarchy |
| 4 | **Fragmented connector model** | WordPress already uses REST + Application Passwords in both apps, but the Express API takes credentials **per-publish and never stores them**, while the Next app stores them encrypted; Notion/Webflow live in a JSONB column on `website_projects`, Ghost/Webhook in a separate `integration_connections` table. Three storage patterns, no common interface | 🟠 Blocks Phase 2 |
| 5 | **No billing engine** | Plan quotas exist but there is no Stripe integration, no credit ledger, no subscription lifecycle. The hybrid subscription+credits model has no substrate | 🟠 Blocks revenue |
| 6 | **BYOK key handling is v1** | Single static secret (SHA-256 of one env var) encrypts *everything*: user AI keys, Notion tokens, Webflow tokens, Ghost keys. No key versioning, no rotation path, no audit log, keys decrypted in the web process. In the JWT-based `goals-ac` app: JWTs in localStorage, 30-day, non-revocable (`marketing-persona-app` uses NextAuth sessions) | 🟠 Trust/compliance risk |
| 7 | **No goal layer** | Generation is keyword/format-driven ("write a blog post about X"). There is no table, model, or flow that captures a *business goal* (traffic/leads/sales) and compiles it into briefs. The product is named goals.ac and has no goals entity | 🟠 Blocks Phase 1 vision |
| 8 | **No tests, no CI, thin observability** | `pnpm typecheck` is the only gate. Pino logging exists; no error tracking, tracing, or metrics | 🟡 Compounds with scale |
| 9 | **No CMS plugins** | Publishing is push-only via external APIs. No WordPress plugin, no TYPO3/Drupal/Joomla story, no site-side capabilities (preview, schema injection, internal-link graph) | 🟡 Phase 2 work |

---

## 2. Sprint Focus: Stabilizing the User Account / Dashboard Layer

**Recommendation: consolidate before you polish.** Any sprint spent beautifying one of the two dashboards while the other drifts is spent twice.

### The consolidation decision

Extract the business logic into workspace packages and converge on **one** user-facing app:

```text
lib/
├── db/                    (exists — keep)
├── api-spec/              (exists — keep, becomes the public API contract)
├── content-engine/        NEW — all AI generators, humanizer, brief compiler (pure, app-agnostic)
├── ai-providers/          NEW — provider abstraction: Anthropic | Gemini | OpenAI, BYOK resolution
├── connectors/            NEW — CMSAdapter interface + wordpress/notion/webflow/ghost/webhook/typo3...
├── security/              NEW — encryption + SSRF guard today; envelope encryption, key versioning next
└── jobs/                  NEW — queue contracts (pg-boss: no new infra, Postgres-backed)

artifacts/
├── app/                   ONE Next.js app = marketing + dashboard + account (marketing-persona-app becomes this)
└── api-server/            Express survives as: public/partner API (API-key auth) + job worker host
```

- **Keep the Next.js app as the SaaS shell.** It already has the newer product surface (onboarding, integrations hub, autopilot, usage dashboard, humanization settings) and NextAuth. Rename `marketing-persona-app` → the product.
- **Demote, don't delete, the Express server.** It becomes the home for (a) the future public API defined by `lib/api-spec`, and (b) the **worker process** that consumes the job queue — the piece Next.js is structurally bad at.
- **The Vite `goals-ac` app is retired** once its unique pages (public roadmap directory, content studio views) are ported. Nothing is deleted until parity is verified — consistent with the "nothing gets deleted" principle in the GoldSuite PRD.

### Sprint backlog (2–3 sprints, in order)

1. **Extract `lib/security`, `lib/ai-providers`, `lib/connectors`** from the duplicated code. This extraction is mechanical and low-risk *because it changes no ciphertext format, key derivation, or env var* — the envelope-encryption upgrade in §7 is a separate, carefully-migrated step, not part of this move. — **done**
2. **Auth hardening — scoped to the JWT-based `goals-ac`/`api-server` surface** (`marketing-persona-app` already uses NextAuth sessions): move its JWT from localStorage to httpOnly cookies, add refresh-token rotation and server-side revocation (a `sessions` table — the "cannot invalidate on password change" trade-off documented in `docs/memory.md` is not acceptable for a product that stores third-party CMS credentials). As consolidation retires the Vite app, its users migrate onto the Next app's NextAuth sessions; the Express server keeps token auth only for the future public API (API keys, not user JWTs). — **done**
3. **Account hierarchy**: formalize `workspace → project → goal → brief → content piece`. Today `users → website_projects → content` exists; add `goals` and `briefs` tables (schema in §4) and a `workspaces` table even if v1 is 1:1 with users — retrofitting teams later is far more painful. — **done**
4. **Finish the onboarding wizard** (already in progress, Task #43) but re-anchor it on goal definition: *"What are you trying to achieve?"* before *"connect your CMS."* — **not started**
5. **Billing skeleton**: Stripe subscriptions + a `credit_ledger` table (append-only: grants, consumption referencing `usage_events`, expiry). Quotas already enforce server-side; wire them to real plans. — **schema landed, service lib pending**
6. **Job queue (pg-boss)** running in the Express worker; move autopilot generation off the cron route onto it. This is the load-bearing wall for Phases 2 and 3 — pull it forward. — **done**

---

## 3. The CMS-Agnostic Content Pipeline

The rule that keeps the pipeline CMS-agnostic: **no pipeline stage may know what a "Gutenberg block" or "Notion block" is.** Platform knowledge lives exclusively behind the adapter boundary.

### Canonical content model

Every piece is stored once, in a portable canonical form:

```ts
interface CanonicalContent {
  id: string;
  // Body: Markdown as authored source of truth + parsed AST (mdast) for transforms
  markdown: string;
  // Structured envelope — everything SEO/GEO needs, platform-independent
  meta: {
    title: string;
    slug: string;
    description: string;          // meta description
    language: string;
    canonicalUrl?: string;
    headings: OutlineNode[];      // extracted H2/H3 tree
    schemaOrg: JsonLd[];          // Article, FAQPage, HowTo, BreadcrumbList...
    openGraph: OgMeta;
    internalLinks: LinkSuggestion[];
    images: ImageRef[];           // alt text mandatory, assets stored by us
    faq?: QaPair[];               // GEO: explicit Q&A pairs for answer engines
    citations?: Citation[];       // GEO: sources for AI-engine trust
  };
  provenance: {
    briefId: string;              // which brief produced it
    goalId: string;               // which business goal it serves
    modelRuns: UsageEventRef[];   // full generation audit trail
    humanization: { level: "off"|"light"|"strong"; voiceSampleId?: string };
  };
}
```

GEO optimization (Claude/Gemini/ChatGPT indexability) is a property of this canonical form — explicit Q&A blocks, citations, schema.org JSON-LD, and clean heading hierarchy — generated once, rendered everywhere. Site-level GEO artifacts (`llms.txt`, FAQ schema injection) are delivered by the Phase 2 plugins.

### Pipeline stages (pure functions over the canonical model)

```text
Goal → [strategize] → Strategy → [brief] → Brief → [research] → ResearchPack
     → [draft] → CanonicalContent → [humanize] → CanonicalContent'
     → [optimize: seo/geo lint] → CanonicalContent'' → [review gate]
     → [render(target)] → PlatformPayload → [publish(connection)] → PublishRecord
```

Each stage: takes a typed artifact, returns a typed artifact, records a `usage_event`, and is executed as a **queue job** (retryable, resumable, observable). The existing DB-level caching (16-char cache keys) slots in per-stage instead of per-request.

### The adapter boundary

```ts
interface CmsAdapter {
  readonly platform: "wordpress" | "typo3" | "drupal" | "joomla" | "notion" | "webflow" | "ghost" | "webhook";
  readonly capabilities: {
    drafts: boolean; scheduling: boolean; updates: boolean;
    categories: boolean; featuredImage: boolean; schemaInjection: boolean;
  };
  test(conn: DecryptedConnection): Promise<HealthResult>;
  render(content: CanonicalContent): PlatformPayload;      // md/AST → blocks | HTML | fields
  publish(conn, payload, opts: { status: "draft"|"live"; scheduledAt?: Date }): Promise<RemoteRef>;
  update(conn, remoteRef, payload): Promise<RemoteRef>;
}
```

- The `capabilities` descriptor drives the UI (no "schedule" button for a connector that can't schedule) — this is how one publish dialog serves eight platforms without `if (platform === ...)` sprawl.
- **Unify credential storage now**: migrate the `cms_integrations` JSONB and per-publish WordPress creds into the existing `integration_connections` table (it already has the right shape — provider, encrypted secret, health-check fields). One table, one encryption path, one health-check loop.
- **WordPress REST + Application Passwords is already the implemented contract in both apps** — no XML-RPC migration is needed. The remaining gap is credential persistence: the Express API accepts WordPress credentials per-publish and discards them; move them into `integration_connections` (encrypted) like every other connector. The Phase 2 plugin then *extends* the REST adapter rather than replacing it.
- Every publish creates a `publish_records` row (piece, connection, remote ID, remote URL, status, error) — the substrate for "published where?" labels, updates/republishing, and Phase 3 feedback loops.

---

## 4. Phase 1 — Clean User Account & Goal Definition

**Objective:** a user signs up, states a business goal, and the platform compiles it into an executable content plan. This is the product's namesake and currently doesn't exist.

### Data model

```text
workspaces ─ users (roles)
   └─ projects (domain, brand_profile, content_style)
        └─ goals:      objective enum (traffic|leads|sales|authority)
                       target_metric (e.g. +40% organic sessions), baseline, deadline,
                       icp (audience), priority, status
             └─ briefs: target_keyword_cluster, search_intent, funnel_stage,
                        working_title, outline, angle, cta, internal_link_targets,
                        success_metric, format, word_count, status
                  └─ content_pieces (exists today — gains brief_id FK)
```

### Goal → brief compilation (the core translation problem)

Business goals become technical briefs through a three-step compilation, each an agent task (models in §6):

1. **Diagnose (strategy agent):** goal + brand profile + scraped site + keyword/SERP data → *where will content actually move this metric?* Traffic goals compile toward TOFU informational clusters and pillar/cluster architecture; lead goals toward MOFU comparison/alternative/integration pages with CTA strategy; sales goals toward BOFU landing pages, case studies, and pricing-adjacent content. Output: a **strategy memo** with a themed cluster map and expected-impact ranking — this is where the existing topical-map and roadmap generators get re-anchored.
2. **Plan (planning agent):** strategy memo → 30/60/90-day calendar of **structured briefs** (the schema above — machine-executable, not prose). Each brief carries its own success metric so Phase 3 can close the loop.
3. **Confirm (human gate):** the dashboard shows the plan as *goal → clusters → briefs*; the user edits/approves. Approval is what enqueues generation jobs.

### Dashboard (Phase 1 UI scope)

- **Goal cards** with progress-vs-target (baseline → current, wired to GSC in Phase 3; manual entry until then)
- **Plan view**: cluster map + brief calendar (drag to reschedule — calendar component exists)
- **Brief editor**: approve / regenerate / edit outline before any expensive generation runs
- Existing pages (content studio, integrations, settings, usage) re-parented under this hierarchy

**Definition of done for Phase 1:** a new user can go from signup → goal → approved 30-day brief plan → first humanized article published to one connected CMS, with every AI call metered and producing the correct ledger entries per the billing rules in §9 (platform-key calls debit model credits; BYOK calls debit only reduced orchestration credits; both always record a `usage_events` row).

---

## 5. Phase 2 — Plugin Ecosystem & Deep CMS Integration

**Objective:** move from "push over public APIs" to "resident integration" — the moat vs. competitors who stop at a WordPress POST request.

### Sequencing (by market share and effort)

1. **WordPress plugin** (PHP, REST): site-key pairing to a connection; endpoints for health/capabilities, draft preview, schema.org + `llms.txt` injection, internal-link graph export (site taxonomy + existing posts → feeds the brief compiler's `internal_link_targets`), publish webhooks back to goals.ac. SEO-plugin awareness (write Yoast/RankMath meta directly).
2. **TYPO3 extension** — underserved market (DACH enterprise), low competition: same contract, TYPO3 record model.
3. **Drupal module**, then **Joomla component** — same contract.
4. **Already-API-first platforms** (Notion, Webflow, Ghost, Webhook/Zapier) stay pure adapters — no plugin needed.

### The plugin contract (identical across all four CMSs)

Every plugin implements the same small surface, so `CmsAdapter` gains one optional extension rather than four special cases:

```text
GET  /goals-ac/v1/health          → version, capabilities, CMS version
GET  /goals-ac/v1/site-graph      → posts, taxonomies, internal links
POST /goals-ac/v1/content         → create/update from PlatformPayload (idempotent, see below)
POST /goals-ac/v1/schema          → inject JSON-LD / llms.txt
Auth: per-site key issued at pairing; canonical request signing:
      HMAC(key, method + path + timestamp + nonce + body-hash)
      → plugin rejects requests outside a ±5 min freshness window and
        deduplicates nonces within it (replay protection)
```

Two protocol requirements that are cheap in v1 and painful to retrofit:

- **Replay protection.** HMAC alone authenticates a request but does not stop a captured request from being replayed. Every signed request carries a timestamp and a random nonce inside the signed canonical string; the plugin rejects stale timestamps and stores seen nonces for the freshness window. The existing webhook signer is extended to this canonical form.
- **Idempotent publishes.** `POST /content` is retried by the publish queue, and a timeout can occur *after* the CMS accepted the write — a naive retry duplicates the post. Every publish job carries an idempotency key (derived from the `publish_records` row ID); the plugin/adapter persists key → result and replays the stored result for a repeated key instead of creating again. Pure-API adapters (Notion, Webflow…) implement the same contract on our side: check `publish_records` for a completed attempt with the same key before re-sending, and reconcile by remote lookup when the first response was lost.

Plus platform infrastructure: connector registry (versioned adapters), publish queue with retries/backoff (pg-boss from the sprint work), inbound webhook receiver for publish confirmations, and a public "integrations" directory page for SEO.

**Definition of done for Phase 2:** one canonical piece publishes to WordPress (via plugin), TYPO3, Notion, and Webflow from the same dialog; the WordPress plugin is listed in the wordpress.org directory; publish success rate and per-platform health are visible in the dashboard.

---

## 6. Phase 3 — Automation & Agentic Orchestration

**Objective:** the platform runs the loop itself: *goal → plan → produce → publish → measure → replan*, with the human moving from operator to approver.

### Prerequisites carried from earlier phases
Job queue (sprint), publish records (§3), briefs with success metrics (§4), plugin telemetry (§5).

### Build order

1. **Feedback ingestion**: Google Search Console OAuth (impressions/clicks/position per published URL), plugin-reported analytics; store as time series against `publish_records`.
2. **Orchestrator**: a durable state machine per goal (queue-driven; the states are the pipeline stages in §3). Long-running, resumable, budget-aware.
3. **Approval policies per project**: `manual` (today) → `auto-draft` (agent generates + stages drafts) → `auto-publish` (within budget and quality gates). Autopilot already exists as a cron; it becomes the first orchestrator policy.
4. **Replanning agent**: monthly, reads goal progress vs. target and per-cluster performance → adjusts the brief calendar (double down / prune / refresh decaying content). Content-refresh briefs ("update this 2025 post, it's slipping") are the highest-ROI agentic action and cheap to detect from GSC deltas.
5. **Quality gates as evaluators**: SEO lint (machine checks), GEO lint (Q&A coverage, citations, schema validity), humanization score, brand-style adherence — each gate is a cheap model call or rule set; failures loop back to revision rather than reaching the user.
6. **Budgets**: credit spend is an **atomic reservation, not a check-then-spend**. Before execution, each agent run inserts a `reserve` ledger entry (estimated cost, keyed by an idempotent run ID) inside a single transaction that verifies the resulting balance — concurrent jobs cannot each pass a stale balance check. On completion the reservation is settled to actual consumption; on failure or cancellation a compensating `release` entry frees the remainder. The orchestrator halts (and notifies) when a reservation is rejected. BYOK users set monthly spend caps instead, enforced the same way.

**Definition of done for Phase 3:** a project on `auto-draft` policy produces, humanizes, and stages a month of content unattended; the dashboard shows measured goal progress; the replanner proposes next month's calendar with reasoning.

---

## 7. BYOK Security Architecture

Today: one env-var secret, SHA-256-derived key, encrypts every credential class; decryption happens in the web process; no rotation, no audit. Adequate for beta; not for a product whose pitch includes "we hold your OpenAI/Anthropic/Google keys and your CMS admin credentials."

### Target design (incremental, no rewrite)

1. **Envelope encryption with key versioning.**
   - Per-workspace **DEK** (data encryption key) encrypts that workspace's secrets (AES-256-GCM — the existing primitive is fine).
   - DEKs are wrapped by a **KEK** held in a KMS (AWS KMS / GCP KMS; on Replit, a versioned-secrets shim until migration). Ciphertext gains a `v{n}:` prefix.
   - Rotation = re-wrap DEKs (cheap, no data re-encryption); compromise blast radius = one workspace. Fixes the documented "if this secret changes, everything is unreadable" cliff.
   - **This is a live-data crypto migration, not a refactor — it ships with an explicit migration plan:** (a) **dual-read**: the decrypt path dispatches on the ciphertext prefix — legacy `iv:tag:data` records decrypt with the current global key, `v{n}:` records with the versioned DEK — so old and new ciphertext coexist indefinitely; (b) **rewrap-on-write plus a background rewrap job** that decrypts-with-legacy and re-encrypts-with-DEK row by row, verifying a test decrypt before committing each row, resumable and rate-limited; (c) **rollback**: because dual-read keeps the legacy path alive, rolling back the writer is safe at any point — no flag-day, and the legacy key is only retired after the rewrap job reports zero legacy rows; (d) **failure recovery**: rows that fail rewrap are flagged (not dropped), surfaced in the credential health UI, and the owner is prompted to re-enter that credential.
2. **Separate key classes.** AI provider keys, CMS credentials, and webhook signing secrets get distinct DEK derivation contexts (AAD = `workspace_id:credential_class:credential_id`), so a bug in one path can't decrypt another's ciphertext.
3. **Decryption only at the point of egress.** One module (`lib/security` + the connector/provider layer) is allowed to decrypt, and it runs in the **worker process**, not the web tier. The web tier handles only ciphertext + metadata (`last4`, provider, status). Decrypted keys live in function scope, are never cached, never logged (pino redaction paths enforced), never serialized into job payloads — jobs carry `credential_id`, workers resolve it.
4. **Verify-on-save + continuous health.** Every stored key is exercised immediately (1-token completion / API ping) and on a schedule; status shown in the UI. Invalid keys fail fast at save time, not mid-generation.
5. **Spend protection for BYOK.** Per-key monthly caps (user-set), anomaly alerts (10× normal burn), and hard concurrency limits — protecting the user's wallet is part of the BYOK trust story.
6. **Audit trail.** Append-only `credential_events` (created, rotated, used-by-job-N, failed, deleted) visible to the user. Deleting a key hard-deletes ciphertext and tombstones the audit row.
7. **Session hardening** (from the sprint): httpOnly cookies, refresh rotation, revocation on password change — the front door matters as much as the vault.

---

## 8. Agent Hierarchy on the Claude Model Family

Two distinct uses of the model family — keep them separate:

- **Runtime agents** — inside the product, calling models through `lib/ai-providers` with platform keys (metered) or the customer's BYOK keys.
- **Development-time agents** — Claude Code building the product itself (the "Frontend/UI Implementation" role lives here, not in production).

### Runtime hierarchy

| Tier | Model (exact ID) | $/MTok in/out | goals.ac responsibilities |
|---|---|---|---|
| **Strategy & Methodology** | Claude Fable 5 — `claude-fable-5` | $10 / $50 | Goal→strategy compilation (§4 step 1), quarterly replanning (§6), competitive positioning analysis, methodology design. Lowest volume, highest leverage — a handful of calls per workspace per month. |
| **Planning** | Claude Opus 4.8 — `claude-opus-4-8` | $5 / $25 | Content roadmaps, topical maps, brief generation, cluster architecture, GEO audit reasoning. |
| **Execution** | Claude Sonnet 5 — `claude-sonnet-5` | $3 / $15 (intro $2/$10 through 2026-08-31) | Long-form drafting, deep research passes, canonical→platform formatting edge cases, repurposing. The volume workhorse. |
| **Rapid tasks** | Claude Haiku 4.5 — `claude-haiku-4-5` | $1 / $5 | Metadata/title/alt-text generation, tonal micro-adjustments, SEO/GEO lint evaluators, classification, webhook-triggered quick edits. |

**One deliberate deviation from the proposed mapping:** run the **humanization pass on Sonnet 5, not Haiku**. Humanization is the stated competitive differentiator — voice matching and prose rhythm are exactly where the Sonnet/Haiku quality gap is widest, and the pass is a rewrite of an existing draft (bounded output, so the cost delta per article is cents). Haiku still owns *iterative* refinement: user-driven "make this punchier" micro-edits, forbidden-word sweeps, and reading-level adjustments, where latency matters more than ceiling.

Implementation notes for `lib/ai-providers`:

- Route by **tier, not model string**: pipeline stages request `"strategy" | "planning" | "execution" | "rapid"`; the provider layer maps tier → model per provider (Claude family above; Gemini 2.5 tiers for Gemini BYOK; GPT tiers for OpenAI BYOK). This is what makes BYOK provider-agnostic instead of Gemini-only.
- Claude-specific handling: adaptive thinking is the default posture (Fable 5 is always-on — omit the `thinking` param; control depth with `output_config.effort`); treat `stop_reason: "refusal"` as a **valid terminal state, not a transient error** — never blanket-retry a refusal on another model; use Anthropic's server-side fallback (the `fallbacks` parameter routing to `claude-opus-4-8`) only for the cases Anthropic documents it for, and otherwise surface the refusal to the user with the `stop_details` category; stream everything long-form (SSE already exists end-to-end); use prompt caching — brand profile + content style + methodology prompts are stable prefixes across a project's generations and cache-read pricing (~0.1×) materially changes article economics. Note Fable 5 requires 30-day data retention on the calling org — relevant to BYOK customers with ZDR orgs; the provider layer should surface that error legibly and suggest the Opus tier.
- Every call already lands in `usage_events` — extend it with `tier`, `provider`, `model` so credit pricing can differ by tier (strategy runs cost more credits than a title rewrite).

### Development-time assignments (building goals.ac)

- **Fable 5** — architecture decisions, this roadmap, methodology/prompt-system design, security review.
- **Opus 4.8** — dashboard and account-module implementation, rapid UI prototyping, complex refactors (the consolidation in §2).
- **Sonnet 5** — feature implementation at volume, test writing, connector/adapter implementations.
- **Haiku 4.5** — CI helpers, commit summaries, quick codemods.

---

## 9. Business-Model Wiring (Hybrid Subscription + Credits)

- **Subscription** gates capabilities (seats, projects, connected CMSs, autopilot policies) and includes a monthly credit grant.
- **Credits** meter consumption, priced per agent tier (a strategy compilation costs more credits than a Haiku title pass). `usage_events` → `credit_ledger` (append-only) → Stripe metered top-ups.
- **BYOK bypasses model credits but not orchestration credits** — the pipeline, storage, publishing, and agents-as-a-service are the product even when the tokens are the customer's. This keeps BYOK from cannibalizing revenue while preserving its cost-control pitch.

**Ledger rules (exact, so billing is implementable and auditable).** Every AI call records a `usage_events` row (tokens, cost estimate, tier, provider, model, BYOK flag) regardless of key source. Ledger entries derived from it:

| Usage | `credit_ledger` entries created |
|---|---|
| AI call on a **platform key** | One `model_consumption` debit (tier-priced from the usage event) **plus** one `orchestration` debit at the standard rate |
| AI call on a **BYOK key** | No `model_consumption` entry; one `orchestration` debit at the reduced BYOK rate |
| Non-AI orchestration work (publish jobs, scraping, health checks, storage) | One `orchestration` debit at the standard rate — identical for platform-key and BYOK workspaces |
| Monthly grant / top-up / expiry / reservation / release | `grant`, `topup`, `expiry`, `reserve`, `release` entries (see §6 item 6 for the reservation flow) |

Every consumption entry references its `usage_events` row (or job ID for non-AI work), so any invoice line can be traced to the exact generation that caused it.

---

## 10. Summary: Order of Operations

1. **Now (Sprints 1–3):** consolidation into `lib/*` packages, one Next.js app, auth hardening, workspace/goal/brief schema, pg-boss queue, Stripe skeleton. *(§2)*
2. **Phase 1:** goal definition dashboard + goal→brief compiler on the Claude tier hierarchy; first end-to-end goal→published-article flow. *(§4)*
3. **Phase 2:** connector unification, WordPress REST + plugin, TYPO3/Drupal/Joomla, publish records + health. *(§5)*
4. **Phase 3:** GSC feedback, orchestrator state machine, approval policies, replanning agent, quality-gate evaluators, budget enforcement. *(§6)*
5. **Continuously:** BYOK vault hardening (§7) lands incrementally from Sprint 1 (crypto extraction) through Phase 2 (KMS + worker-only decryption).
