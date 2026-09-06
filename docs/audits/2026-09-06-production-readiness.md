# Production readiness audit — 2026-09-06

Go-live audit against a specific commercial target: paying customers at **€500/month** for AI content generation on autopilot landing in **WordPress and LinkedIn**.

**Method:** six parallel domain audits (WordPress path, LinkedIn + autopilot loop, content quality, security/multi-tenancy, UX/marketing site, billing/ops) plus a structural pass. Every finding marked **CONFIRMED** was re-verified at the source by a second reader before being recorded here. Findings marked **UNVERIFIED** need a live run to settle.

**Baseline measured this session (not taken from docs):**

| Check | Result |
|---|---|
| `pnpm run test:unit` | 838 / 839 pass; the 1 failure is the known `bedrock-auth.test.ts` env-var test |
| `pnpm run typecheck` (root) | fails on `artifacts/api-server` (2 errors, `pool` not exported) — legacy, not deployed |
| `cf-write-worker` typecheck | **622 errors** |
| `cf-read-worker` typecheck | **362 errors** |
| `cf-public-worker` / `cf-jobs-worker` / `cf-gateway` / `marketing-persona-app` / `worker` | 0 errors |

**Remediation update (same day, later session):** Gate 0 code blockers closed — see `HANDOFF.md`. Later same day: HIGH-1 SEO REST meta + excerpt; HIGH-8 publish dead-letter (5); HIGH-10 ownership on scrape/GSC/GA4; HIGH-16 site-graph caps; MED-1 placeholder scanner. BLOCK-5 live WP evidence still human.

---

## Verdict

The libraries are good. The slop detector, humanizer, citation verifier, credit ledger, SSRF guard, encryption layer, vertical review gate, and the onboarding funnel are all genuinely well built — several are better than typical for this stage. **The gap is not capability.**

Three things stand between this repo and a paying customer:

1. **The strongest safety features are wired but switched off.** The publish quality gate, the fabricated-statistic screen, and the cannibalization blocker all exist, are unit-tested, and are passed no options by any production call site.
2. **The production runtime is a hand-ported copy with no type safety**, and the WordPress plugin — the flagship integration — cannot be installed by anyone.
3. **Nothing has ever been run against a real WordPress site, a real LinkedIn app, or a real payment.** Every handoff entry since July repeats that sentence. It is the single most important fact about this codebase's readiness.

---

## Correction log (do not follow blindly)

Claims in this repo's own docs that this audit found misleading. Recorded so the next agent does not re-derive them.

| Claim | Resolution |
|---|---|
| `PROJECT.md`: "Canonical product UI is the Next.js app (`marketing-persona-app`)" | **Misleading for production.** Root `cf:deploy` errors with "OpenNext monolith is retired". Production is `cf-gateway` → `cf-public/read/write-worker` + `goals-app-ui` on Pages. `marketing-persona-app` is canonical for *development*, not for *serving customers*. |
| `PROJECT.md`: cf-worker typecheck errors are "unrelated to recent work" | True but understated. The 984 errors share one root cause (SQLite/D1 tables passed to a Drizzle handle typed as Postgres) and disable type safety across the entire production data plane. |
| `docs/parity-matrix.md`: 222 local vs 223 worker routes, 1 missing | **Stale** (generated 2026-08-19). There are now 236 Next.js API routes. It also only checks that a path *exists*, never that it behaves the same. |
| Handoff entries: "publish readiness gate" shipped | The gate exists and is well tested, but its four strongest options are never passed by any production call site. See BLOCK-2. |
| `docs/playbooks/wp-staging-verification-evidence.md` | Blank template. Its own text: "no staging run has been executed yet." |
| `docs/design.md` | Describes `artifacts/goals-ac/src/index.css` — the **deprecated** Vite shell, a dark-glass theme. The real current design system is `artifacts/marketing-persona-app/DESIGN.md` (paper/forest-green). Stale documentation for a dead app. |
| `artifacts/goals-app-ui` looks unused | **It is not dead** — it deploys `app.goals.ac` via `cf:pages:app`. The 2026-07-16 ponytail audit already corrected this once. Do not re-propose deleting it. It is missing from `PROJECT.md`'s architecture map, which is why this keeps recurring. |

---

## CRITICAL — security

### SEC-1 — Unauthenticated, enumerable job-status endpoint leaks cross-tenant data — CONFIRMED

- `lib/jobs/src/cf-queues.ts:37` — `const jobId = \`cf:${queue}:${Date.now()}\`` — no randomness, just queue name plus a millisecond timestamp.
- `artifacts/cf-read-worker/src/index.ts:58-65` — the `GET /api/jobs/:jobId` handler runs **before** `requireAuth()` at line 67. Fully unauthenticated.
- `artifacts/cf-write-worker/src/index.ts:89-96` — `trackJob` stores `{jobId, queue, status, userId, projectId, contentPieceId, platform, publishedUrl}` in KV for 24h under that predictable key.

Queue names are a small fixed enum visible in the source. An anonymous attacker enumerates `cf:content-publish:<ms-timestamp>` across a plausible window and reads other tenants' `userId`, `projectId`, `contentPieceId`, publish platform, and published URL. No authentication required.

**Fix:** `crypto.randomUUID()` for the job id, and move the route below `requireAuth()` with an ownership check on the stored `userId`.

### SEC-2 — Cross-tenant IDOR: any user can modify or delete any org's persona — CONFIRMED

`artifacts/marketing-persona-app/src/app/api/personas/[id]/route.ts:33,41,58,63`

```ts
.where(eq(marketingPersonasTable.id, personaId) && eq(companiesTable.userId, userId!))
```

JavaScript `&&` between two truthy objects yields the **right** operand. Drizzle's `eq()` returns an object, so the id filter is discarded and the query runs as `.where(eq(companiesTable.userId, userId!))` alone — it proves only that the caller owns *some* persona. The mutation immediately after filters by `eq(marketingPersonasTable.id, personaId)` with **no ownership binding at all**.

Any logged-in user who owns at least one persona can `PATCH` or `DELETE` another tenant's persona by id.

**Fix:** use Drizzle's `and(...)` at all four call sites, and scope the write by the verified row returned from the ownership check rather than the raw request param.

Same `&&`-instead-of-`and()` bug, bounded to the caller's own data (data-integrity, not cross-tenant):
- `api/companies/route.ts:74` — a `PATCH` with a client-supplied `body.id` updates **every** company owned by that user.
- `api/personas/generate/route.ts:32` — generation runs against an arbitrary company of the caller's, not the one requested.

---

## Blockers — must fix before charging anyone

### BLOCK-1 — The WordPress plugin cannot be installed by anyone — CONFIRMED

Three independent failures, any one of which is fatal:

1. **The install link is wrong.** `components/onboarding/connect-wordpress-forms.tsx:92` — "Install goals.ac plugin" links to `https://wordpress.org/plugins/`, the generic directory search page. The plugin is not on wordpress.org. `wordpress-step.tsx:43` makes `"plugin"` the **default selected tab**, so this is what most customers see first.
2. **It fatals on activation even if obtained.** `includes/class-wp-nonce-store.php:17` and `class-wp-key-store.php:17` declare `implements \GoalsAC\Shared\NonceStore` / `KeyStore`. Those interfaces resolve only through Composer (`composer.json` requires `goals-ac/shared-contract` via a `path` repository pointing at `../shared`, a sibling folder in this monorepo). `goals-ac.php:51-55` loads `vendor/autoload.php` only `if (file_exists(...))`. There is **no `vendor/`** in the repo and **no packaging script anywhere** — verified: the only `composer install` in the tree is inside `cms-plugins/wordpress/package.json:11`'s test script, and there is no `.distignore`. PHP raises "Interface not found" at class declaration — a fatal error. readme.txt's own instructions ("Upload the folder, Activate") describe exactly the scenario that fatals.
3. **No update channel.** Not on WP.org, no self-updater, no version check against a goals.ac endpoint. Whatever a customer installs is frozen forever.

This kills the flagship path — the one that unlocks idempotent publish, working SEO meta, category creation, internal-link write-back, and llms.txt.

### BLOCK-2 — The only working WordPress path has no publish idempotency — CONFIRMED

Application Password is the only method that works today (see BLOCK-1). It has no idempotency concept whatsoever.

- `lib/connectors/src/wordpress.ts:65-111` — `publishToWordPress` always issues `POST /wp-json/wp/v2/posts` to create. No update id, no lookup-before-create. It uses raw `fetch()` with **no timeout**.
- `lib/jobs/src/handlers/contentPublish.ts:318-331` — on any error the piece reverts to `status: "ready"`; `processScheduledPublishSweep` (`:334-378`) re-selects `ready` pieces every 15 minutes and re-enqueues.

**Scenario:** 3am autopilot publishes. WordPress creates the post; the response is lost to a timeout. The job throws, the piece reverts to `ready`, the next sweep republishes it — **a duplicate post on the customer's live blog**, with no reconciliation path.

The plugin path *does* implement this correctly (`X-Idempotency-Key: piece-<id>` against a 24h store, `goals-ac-plugin.ts:302-332`, `class-publish-handler.php:42-47`) — but it is unreachable.

### BLOCK-3 — "Auto-publish as draft" posts live to LinkedIn — CONFIRMED

- `lib/app-shell/src/autopilot/types.ts:38` — the dropdown reads **"Auto-publish as draft"**.
- `autopilot-scheduler.ts:86` — `shouldAutoPublish()` returns `true` for both `draft` and `live`.
- `autopilot-scheduler.ts:90` — `wordpressPublishStatus()` honours the distinction, but **only for WordPress**.
- `social-publish.ts:86` — `publishPieceToSocial()` accepts **no status parameter at all**.
- `lib/connectors/src/linkedin.ts:137` — `lifecycleState: "PUBLISHED"`, hardcoded.

A customer who picks "draft" specifically to review before anything goes public gets unreviewed AI content on their real LinkedIn profile. This breaks a promise the UI makes in writing.

**Fix:** hold social pieces at `pending_review` under `draft` mode. Renaming the option is not sufficient — the customer's intent is review, not a label.

### BLOCK-4 — The publish quality gate is built, tested, and inert — CONFIRMED

`assessPublishReadiness` (`lib/content-engine/src/content/publish-readiness.ts`) supports `minQualityScore`, `targetKeyword`, `existingTitles`, and `checkUnattributedClaims`. Grepped every call site: the three production ones pass **none** of them.

- `lib/jobs/src/handlers/contentPublish.ts:106` — autopilot
- `api/content-pieces/[id]/publish/route.ts:91`
- `api/v1/content-pieces/[id]/publish/route.ts:49`

Only `publish-readiness.test.ts` and the fixture eval pass them. Dead in production as a result: the quality-score floor, keyword stuffing/underuse, duplicate-title and cannibalization blocking (`seo-guardrails.ts:169`), and the fabricated-statistic screen (`claim-extractor.ts`, the whole file).

`ai_tells` is additionally hardcoded `severity: "warning"` (`publish-readiness.ts:414`), and on autopilot warnings go to a log no human reads (`contentPublish.ts:114`).

**In fairness:** `contentPublish.ts:118` documents `minQualityScore` as a deliberate deferral until real data existed to choose a threshold, and `recordReadinessAssessment` is already collecting that distribution. That is defensible engineering. It is not shippable at €500/month.

**Fix:** pass `targetKeyword` (already in scope two lines later), `existingTitles`, and `checkUnattributedClaims: true` on the autopilot path; promote `ai_tells` to a blocker above a threshold for unattended publishing only. Leave `minQualityScore` data-driven.

### BLOCK-5 — Nothing has been verified against a real WordPress site — CONFIRMED

`docs/playbooks/wp-staging-verification-evidence.md` is a blank template stating no staging run has been executed. `e2e/founder-path.spec.ts` **stubs** the WordPress plugin contract rather than hitting a real instance, and never asserts an article was published. For a product whose entire value is "content appears in my WordPress," this outranks every code defect.

### BLOCK-6 — No sellable plan, and no VAT — CONFIRMED

`lib/billing/src/plans.ts`: `OFFERED_PLAN_IDS = ["starter", "growth"]`. Starter is free; Growth is **$49/mo USD**. Scale is `"Custom"`, absent from `PLAN_DISPLAY_PRICES`, and not offerable. No €500 plan, no EUR pricing anywhere.

No `automatic_tax`, `tax_id_collection`, or reverse-charge handling in any Stripe Checkout call (`lib/billing/src/stripe.ts:44-63, 137-151`). The customers are European B2B; the first invoice is a compliance problem, not a UX gap.

**Not a rewrite.** The ledger is solid: `ledger.ts:29-74` reserves under a per-workspace Postgres advisory lock and treats a duplicate `runId` as idempotent replay; webhook signature verification and grant idempotency (`credits.ts:33-47`) are real. This is a packaging gap.

### BLOCK-7 — Nothing pages a human — CONFIRMED

Zero hits for Sentry or any error tracker across the repo. Integration health alerts (`integration-health-alerts.ts:81-138`) write a DB row rendered as an in-app banner; no email, Slack, or push exists anywhere for a failed publish or a broken connection. The one email path (`api/admin/publish-reliability/alert`) is a **manually POSTed** admin action wired to no cron — and it lives in `marketing-persona-app`, which is not the deployed production surface.

`connectionHealthCheck.ts:96-119` — the legacy `wordpressConnectionsTable` path updates `isVerified` but never calls `applyIntegrationHealthTransition`, so it does not even produce the DB row.

For a product sold as "you don't touch it," the customer has no reason to log in and see the banner. Autopilot can be dark for weeks.

### BLOCK-8 — Production data plane has no type safety, and there is no CI — CONFIRMED

`cf-write-worker` (622 errors) and `cf-read-worker` (362) fail typecheck. One root cause, not 984 bugs: SQLite/D1 tables passed into a Drizzle client typed as Postgres (`cf-write-worker/src/admin-routes.ts:91` and siblings). These two workers serve every production read and write.

`.github/workflows` is absent by policy (`PROJECT.md`), so nothing prevents a red build from shipping — and the build is already red.

### BLOCK-9 — Public signup is disabled by default — CONFIRMED

`src/lib/platform/platform-settings.ts:23` — `signupsEnabled: false`. `signup-client.tsx:74-77` renders `InviteOnlyMessage` without an invite token. No customer can self-serve unless an admin flips the flag or sends an invite.

Not a defect if invite-only is the intended GTM (it matches the consulting-led, partner-only posture in `docs/competitive-edge-prd.md`) — but it must be a stated decision, not a default nobody checked.

### BLOCK-10 — No price and no proof on the marketing site — CONFIRMED

- `pricing-page-client.tsx:25-55` — three engagement tiers ("GEO Audit Sprint", "AEO Foundation", "Full GEO Program"), **zero prices**, every CTA is "book a call" despite Stripe checkout existing at `api/billing/checkout`.
- `src/lib/marketing/content/success-stories.ts:34` — `export const PUBLISHED_STORIES: SuccessStory[] = [];` — empty by design, honest, and it means the Customer Stories page shows nothing.

A prospect deciding whether to pay €500/month sees no price and no proof: the two things that most directly justify that number. Ahead of any code defect as a go-to-market risk.

---

## High severity

### HIGH-1 — SEO meta silently never lands on the working WordPress path — CONFIRMED

`seo-field-mapper.ts:29-56` builds `meta: { _yoast_wpseo_metadesc, rank_math_description, ... }` and `cms-publish.ts:268-278` sends it in a plain `POST /wp-json/wp/v2/posts`. WordPress core only persists meta keys registered with `show_in_rest`; neither Yoast nor RankMath register their underscore-prefixed keys that way, and **WordPress silently drops unknown meta keys** — no error, no warning.

So for every Application-Password customer (the only method that works), the computed meta description, title, and focus keyword never reach the SEO plugin, and nothing surfaces the failure. The plugin path handles this correctly via server-side `update_post_meta()` (`class-publish-handler.php:229-236`) — and is unreachable.

### HIGH-2 — "Test connection" cannot detect insufficient permissions — CONFIRMED

`lib/connectors/src/wordpress.ts:113-137` calls `GET /wp-json/wp/v2/users/me` **without `?context=edit`**. WordPress only includes `capabilities` in `edit` context, so `user.capabilities?.["publish_posts"] ?? true` always falls through to `true`. A customer pasting credentials for an Author or Contributor sees "Connected ✓", then fails silently at the first autopilot publish.

### HIGH-3 — `llms.txt` is an advertised feature that can never be served — CONFIRMED

`includes/class-schema-inject.php:71` calls `register_llms_txt_endpoint()` **only from inside `handle()`** — during the one-off `POST /goals-ac/v1/schema` request. `init()` (`:23-26`) registers only `wp_head`/`wp_footer`. `add_rewrite_rule()` affects only the current PHP process and is never followed by `flush_rewrite_rules()`, so the rule is never persisted and the `template_redirect` hook that serves the file is never attached on a normal page view. `/llms.txt` 404s in every case, forever.

readme.txt advertises it explicitly, and `Contract::defaultCapabilities()` reports it as a capability. Immediately discoverable by any GEO-focused customer.

### HIGH-4 — LinkedIn API version is 2.5 years stale — UNVERIFIED, high probability

`lib/connectors/src/linkedin.ts:49,149,220` pin `"Linkedin-Version": "202401"` on image upload, post creation, and metrics. LinkedIn sunsets versions on a rolling ~12-month basis, so a January 2024 version is very likely rejected (`426 Upgrade Required`) today. No dynamic resolution, no fallback.

Cannot be confirmed without a live call against a real LinkedIn app — exactly the verification never performed. Treat as high-probability-broken.

Note: personal-profile posting with `w_member_social` does **not** require Marketing Developer Platform approval, so that part of the design is sound.

### HIGH-5 — LinkedIn tokens expire at 60 days with no working refresh — CONFIRMED

`social-tokens.ts:62-88` refreshes only when `creds.linkedin.refreshToken` exists. Requested scopes are `openid profile w_member_social email` (`cf-public-worker/src/auth-linkedin.ts:64`); LinkedIn issues refresh tokens only to apps granted Programmatic Refresh Tokens access, which these scopes do not include. The refresh branch never fires; posting dies ~60 days after connection, surfacing only as an in-app banner (BLOCK-7).

### HIGH-6 — Races can duplicate billed generations and live posts — CONFIRMED

- `contentGenerateSweep.ts:62-93` selects a due item with no claim/lock; it flips to `prepared` only **after** generation completes (`autopilot-orchestrator.ts:189-192`). Two overlapping runs generate twice and bill twice.
- `contentPublish.ts:45-56` checks `status === "published"` at entry, then does all work before flipping status at `:285-294`. Nothing marks the piece `publishing`. Both `finalizeGeneratedPieces` (`contentGenerate.ts:91-95`) and the 15-minute sweep can enqueue the same `ready` piece.

### HIGH-7 — `lastRunAt` is stamped before the work succeeds — CONFIRMED

`contentGenerateSweep.ts:131-139` writes `lastRunAt` immediately after `enqueue()` returns. If the generate job then fails, `shouldRunAutopilot()` will not retry until the next cadence window. One transient provider hiccup silently costs a customer a full day (or week) of content, with no piece row to show "failed" in the UI.

### HIGH-8 — Publish failures retry forever with no dead-letter or escalation — CONFIRMED

`contentPublish.ts:318-332` resets to `ready` and rethrows; the real retry mechanism is the 15-minute sweep. No attempt cap, no dead-letter, no alert on N consecutive failures. A permanently expired LinkedIn token retries every 15 minutes indefinitely.

### HIGH-9 — SSRF via unvalidated redirects — CONFIRMED

- `lib/content-engine/src/brand/brand-scraper.ts:61-93` — `assertPublicUrl(url)` once, then `fetch()` with Node's default `redirect: "follow"`. Redirect targets never re-validated.
- `lib/media/src/index.ts:44` — same pattern in `downloadImageBuffer`.

The correct pattern already exists in this repo: `citation-verifier.ts:151-165` uses `redirect: "manual"` and re-runs `assertPublicUrl` per hop. A customer's competitor URL, or any crawled page, can 302 to `169.254.169.254` and have the response ingested into brand text fed to the LLM, or downloaded as image bytes.

There is also a DNS-rebinding TOCTOU gap in `lib/security/src/ssrf-guard.ts:62-80` (validation and `fetch` resolve DNS separately) — lower priority, since the domain would be the customer's own declared site.

### HIGH-10 — Missing ownership checks on three CF write-worker routes — CONFIRMED

`artifacts/cf-write-worker/src/index.ts:337-350` (`/scrape`), `:352-359` (`/gsc/sync`), `:361-368` (`/analytics-properties/ga4/sync`) take `projectId` from the URL and enqueue a job with no ownership check — while `/crawl` immediately above at `:306-317` correctly calls `getAccessibleProject`. Any authenticated user can trigger jobs against another org's project.

### HIGH-11 — The `viewer` role can write through most API routes — CONFIRMED

`middleware.ts:41-53` gates viewer writes by a hardcoded `WRITE_API_PREFIXES` allowlist that omits `/api/goals`, `/api/briefs`, `/api/companies`, `/api/personas`, `/api/tracked-keywords`, `/api/competitor-analysis`, `/api/keyword-analysis`, `/api/roadmaps`. Those handlers call only `requireAuth()` with no `requireOrgPermission`. A read-only member can create, edit, and delete across all of them.

### HIGH-12 — Duplicate and cannibalizing articles are not blocked — CONFIRMED

`annotateBriefsWithCoverage` (`content-coverage.ts:118-138`) computes a real covered/overlap verdict, but its own doc comment says flagged briefs are kept and nothing downstream reads the verdict. `content-strategy-generator.ts:126-142` generates the 30-day plan as three independent parallel LLM calls (days 1-10, 11-20, 21-30) with no cross-batch dedup. The blocker that would catch it needs `existingTitles` — never passed (BLOCK-4).

### HIGH-13 — A LinkedIn hook template instructs the model to invent a statistic — CONFIRMED

`lib/content-engine/src/content/linkedin-archetypes.ts:71-76` ships a `surprising-stat` archetype whose template is `"83% of [audience] fail because of [reason]."`, injected verbatim into the prompt (`content-studio-generator.ts:484-491`). LinkedIn posts are not `isSeoLongformFormat`, so no citation or claim machinery applies to them at all. The most reproducible path to public embarrassment under the customer's own name.

### HIGH-14 — Billing does not reconcile against real token cost — CONFIRMED

`pricing.ts:1-13` charges flat per-tier credits (strategy 15 / planning 8 / execution 5 / rapid 1) regardless of tokens; `consumption.ts:58-63` settles at the same estimate used to reserve. `recordUsageEvent` captures real usage but nothing reconciles it. COGS can diverge from revenue silently, with no per-customer real-cost view.

### HIGH-15 — Money paths are the least tested — CONFIRMED

114 test files, ~839 tests, but `stripe.ts`, `stripe-org-sync.ts`, `ledger.ts`, `session.ts`, `consumption.ts` have **zero** test files. The e2e suite is 2 specs / 160 lines against `next dev` on the non-production app, covering no checkout, no webhook, and no real publish.

### HIGH-16 — Site graph is an unbounded synchronous query — CONFIRMED

`class-site-graph.php:73-100` pages `get_posts()` with no cap; `get_internal_links()` (`:139-169`) regexes every post's full content for every post — all in one REST request with no pagination and no time budget. It runs before every autopilot publish for internal-link planning (`contentPublish.ts:95-104`). Target customers are established WordPress sites; a few thousand posts will exceed shared-hosting limits and 500, failing the readiness gate for every publish on that site. Currently masked by BLOCK-1; resurfaces the moment the plugin works.

### HIGH-17 — Dark mode is half-built and visibly broken — CONFIRMED

`globals.css:7` declares `@custom-variant dark (&:is(.dark *));` and a full `:root` token block, but there is **no `.dark { ... }` token override block** — verified, exactly one `--background:` definition in the file. Meanwhile `src/context/theme.tsx` ships a real user-facing toggle wired into `sidebar-nav.tsx:128`. A customer toggles dark mode and almost nothing changes; only ~70 scattered ad-hoc `dark:` utilities fire. `lib/app-shell/src/product-theme.css` has the same gap, so it propagates to the second front-end.

A visibly broken control is worse than no control at this price point.

### HIGH-18 — No Impressum, no cookie consent — CONFIRMED

`privacy` and `terms` pages exist. No imprint/Impressum page and no cookie-consent mechanism were found. For European B2B customers an Impressum is legally required in Germany and Austria. Currently mitigated by there being no first-party tracking script on the marketing pages — but that mitigation disappears the moment one is added. Verify with counsel before EU go-live.

---

## Medium / lower

- **MED-1** No placeholder scanner. Nothing checks output for `[Company Name]`, `[CEO/Founder Name]`, `TODO`, `Lorem` before publish — and the press-release outline itself contains those bracket patterns (`content-studio-generator.ts:376,378`).
- **MED-2** Model preamble inside JSON string values is not stripped. `extractJsonBlock` (`core/utils.ts:48-71`) removes fences and text *outside* the object; an "As an AI…" landing *inside* `body_markdown` survives.
- **MED-3** Citation "verification" checks reachability only (`citation-verifier.ts:127-194`). A fabricated stat linked to a real homepage passes; a fabricated stat with no link produces zero candidates and reports clean.
- **MED-4** Category auto-creation is asymmetric with tags (`class-publish-handler.php:246-301`): an unknown tag is auto-created, an unknown category is **silently dropped** — while the health check advertises `"categories": true`.
- **MED-5** `wp_insert_post`/`wp_update_post` called without `wp_slash()` (`class-publish-handler.php:137,178`, `class-internal-links.php:76-82`). WordPress `wp_unslash()`es post fields on insert, so literal backslashes in AI content (Windows paths, regex, LaTeX, escaped JSON in code blocks) lose one backslash per publish and again per internal-link write-back. `elementor_data` *is* correctly slashed at `:218` — the pattern is known, just not applied to the main content field.
- **MED-6** AIOSEO mapping targets an obsolete storage model (`class-seo-meta-mapper.php:103-116` writes post meta; AIOSEO v4+ uses the `wp_aioseo_posts` table). Also `mapSeoToPluginMeta()` sends Yoast + RankMath + AIOSEO + SEOPress keys regardless of what is installed, so every post accumulates meta for plugins the site does not use.
- **MED-7** `PATCH /api/website-projects/[id]/cms-integrations` (`route.ts:164-233`) saves credentials without testing them. `api/wordpress/test/route.ts:41-77` does test, but saves regardless of the result — `isVerified` is a flag, not a gate.
- **MED-8** `api/wordpress/test` returns the raw DB row including the `encryptedAppPassword` ciphertext to the browser (`route.ts:70-76`), inconsistent with `maskCmsCredentials` used everywhere else.
- **MED-9** Media upload has no size cap (`class-media-handler.php:23-63`) — no check against `wp_max_upload_size()` before `file_put_contents()`.
- **MED-10** Every published post is authored by WordPress user ID 1 (`class-publish-handler.php:114,120`) — HMAC auth never calls `wp_set_current_user()`, so `get_current_user_id()` is always 0 and the fallback fires.
- **MED-11** IP allowlist CIDR matching is a string-prefix test (`org-security.ts:5-16`), so `192.168.1.0/24` also admits `192.168.10.x` and `192.168.100.x`.
- **MED-12** Maintenance mode fails open on any error (`middleware.ts:72-83` returns `platformEnabled: true`) — defensible as a UX choice, but it defeats an emergency lockout during exactly the DB trouble it might be protecting against. Should be a documented tradeoff, not a silent default.
- **MED-13** Public API rate limiting is an in-process `Map` (`api-key-auth.ts:96-108`); effective limit is `rateLimitPerHour × instances`, reset on every redeploy.
- **MED-14** Failed payment has no dunning; the customer's first signal is being unable to generate.
- **MED-15** Humanizer only runs when the org has a writing sample (`content-studio-generator.ts:678-686`); an org that never uploaded one gets no humanization pass at all.
- **MED-16** `cf-jobs-worker` health endpoint returns `{status:"ok"}` unconditionally (`index.ts:129-133`) — reports healthy with D1 and Queues down.
- **MED-17** Three icon-only buttons have no accessible name, one of them a destructive delete: `keyword-tracking-tabs.tsx:105`, `roadmap-chat.tsx:97,152`.
- **MED-18** Only 2 `error.tsx` boundaries app-wide; empty states are ad hoc (essentially one designed `SetupEmptyState`), so a brand-new customer's zero-data dashboard is unverified.
- **MED-19** JSON-LD structured data appears in exactly 1 file — thin for a product whose pitch is being cited by AI search engines.
- **LOW-1** Silent 3000-char truncation on LinkedIn (`linkedin.ts:118`) — correct limit, no warning recorded.
- **LOW-2** No company-page posting (personal profile URN only, `linkedin.ts:197-206`); no video/document/carousel posts.
- **LOW-3** `scripts/cron-autopilot.example.sh` suggests every-6-hours, but `shouldRunAutopilot` requires an exact hour match, so the documented external cron would miss most projects. The real crons (`30 * * * *`) are hourly and correct.
- **LOW-4** Weekly keyword sweep failures are logged only (`keywordOpportunitySweep.ts:60-68`); the content calendar runs dry silently.
- **LOW-5** `uninstall.php:10-18` leaves orphaned `goals_ac_idempotency_*` options behind.
- **LOW-6** The settings page persists a regenerated site key as a side effect of rendering (`goals-ac.php:185-199`) — a DB write on a GET-style admin view.
- **LOW-7** Plugin i18n uses `__()` consistently and declares a `Domain Path`, but no `languages/` directory or `.pot` file exists.
- **LOW-8** `GEMINI_KEY_ENCRYPTION_SECRET` has no minimum-length validation (`encryption.ts:6-12`); a weak operator-chosen secret weakens every stored credential. IV and auth-tag handling themselves are correct.
- **LOW-9** "GEO/AEO" appears unglossed on the pricing page (`pricing-page-client.tsx:67`).

---

## What was checked and found clean

Recorded so no one re-audits these.

- `requireAuth` / `org-access.ts`: session → org-suspension → IP allowlist → MFA is well structured and consistently the entry gate.
- `assertPieceOwner` / `requireProjectAccess` / `listAccessibleProjectIds`: correctly role-scoped; every content-piece sub-route sampled (enhance, humanize, revert, images ×3, publish, regenerate, render-preview, repurpose + stream, submit-review, versions, base CRUD) funnels through `assertPieceOwner`.
- Public API `/api/v1`: correctly calls `assertProjectInOrg` and cross-checks `piece.websiteProjectId === body.projectId`. `gac_` keys are 192-bit random, SHA-256 at rest, checked against `revokedAt`, scopes enforced per route.
- Encryption: AES-256-GCM, fresh random 12-byte IV per call, auth tag verified on decrypt, throws on tamper. Used consistently across BYOK keys, app passwords, all OAuth tokens, and MFA secrets. Missing secret throws rather than falling back to plaintext.
- Admin surface: `/admin` and `/api/admin` gated by `isSuperAdmin` before any handler; the CF read-worker layers its own `isPlatformAdmin` checks rather than trusting the caller.
- Org invites: tokens hashed, and firm-invite acceptance uses a conditional `UPDATE … WHERE acceptedAt IS NULL` closing a real double-accept race.
- Secrets hygiene: scanned `.env.example` and grepped for `sk-`, `AIza`, `AKIA`, `xox`, `ghp_`, PEM headers, hardcoded credential assignments — only placeholders, no committed secrets.
- Vertical review gate: `assertVerticalReviewCleared` in `publish-destination.ts:167-179` throws before **any** publish call, autopilot included. Genuinely a single choke point. Onboarding forces vertical selection, so a law/dental customer is not left ungated.
- Humanizer structural guards (`passesHumanizeStructureGuards`, `passesHumanizeQualityGate`): rejects rewrites that drop headings, FAQ items, or citations, drift outside the word-count band, or fail to improve the slop score. Enforced, not advisory.
- Credit ledger: advisory-lock reservation, idempotent replay on duplicate `runId`, idempotent settlement. Stripe webhook signature verification and grant idempotency are real.
- Onboarding funnel: 13 steps, floor of 5 required questions; `resolveNextStep`/`computeVisibleStepIds` prevent "question N of M" from lying; terminal step polls ~60s with a real retry and a genuine fallback, no fake success. GSC and LinkedIn use real OAuth with verified-connection checks. Strong work.
- Copy quality: AI-tell scan across all `.tsx` returns effectively zero genuine hits; no TODO/lorem/placeholder shipped; no `alert()` or stray `console.log` in UI. 34 `loading.tsx` skeletons.
- Accessibility basics: zero `div`-as-button, zero `outline-none` without a focus replacement.
- Retry loops in `content-engine` are all bounded (2-3 attempts) — no unbounded AI-spend vector found there.
- `robots.ts`, `sitemap.ts`, `metadataBase`, and `openGraph` all present.

---

## Structural finding: the product exists twice

Production is `cf-gateway` (hand-maintained route allowlists) → `cf-public-worker` / `cf-read-worker` / `cf-write-worker`, plus `goals-app-ui` and `marketing-pages` on Cloudflare Pages. `marketing-persona-app` (80k LOC, 236 API routes, 96 pages) is not deployed.

Every feature is therefore written twice, and the copy serving customers is the one with 984 type errors and drifting route coverage. Known drift: `cf-public-worker` has no `content-pieces/{id}/publish` route at all, while Next and `api-server` both do (recorded in the 2026-09-05 handoff entry). The admin dashboard, the only email-alert hook, and the entire e2e suite all live in the **undeployed** app.

Non-production surface measured this session:

| Package | LOC | Status |
|---|---|---|
| `artifacts/goals-ac` | 22,610 | Deprecated redirect shell; legacy pages retained "for reference" |
| `artifacts/api-server` | 8,903 | Opt-in legacy, typecheck red, not a deploy target |
| `artifacts/mockup-sandbox` | 6,430 | Sandbox |

~38k LOC of non-production surface, plus the duplication tax on every feature. `artifacts/goals-app-ui` (15,975 LOC) is **not** in this list — it is live.

---

## Business context

From this repo's own teardowns (`docs/competitors/`): BabyLoveGrowth $99–$299/mo, AutoSEO $49–$199/mo. **€500/month is a 2–5x premium over the category leaders.** It cannot be sold as feature parity. The defensible framing is done-for-you with a human accountable for quality — consistent with `docs/playbooks/pilot-scorecard-and-runbook.md` (operator-cost and editor-acceptance targets) and the consulting-led, partner-only GTM in `docs/competitive-edge-prd.md`.

That reframes readiness. At €500 with a human in the loop:
- BLOCK-3 (unreviewed live posting) and BLOCK-5 (never verified live) matter more than any feature gap.
- Operator tooling matters more than self-serve polish, which softens BLOCK-9 and part of BLOCK-10.
- BLOCK-1/2 (WordPress) remain absolute: the product is defined by content landing in WordPress.

---

## Recommended sequencing

Ordered by risk retired per unit of effort, not by severity alone.

**Gate 0 — stop the bleeding (days, not weeks).** SEC-1, SEC-2, BLOCK-3. All three are small, surgical diffs against defects that are actively dangerous: a public data leak, a cross-tenant IDOR, and unreviewed content posted live under a customer's name. Nothing else should start first.

**Gate 1 — make one WordPress customer work end to end.** BLOCK-1 (build and host a real plugin zip with bundled `vendor/`, fix the install link), BLOCK-2 (idempotency + timeout on the app-password path), HIGH-1, HIGH-2, HIGH-3, then execute BLOCK-5 — fill in `wp-staging-verification-evidence.md` with a real run against a real site. This gate is done when an article generated by autopilot appears correctly on a real WordPress install with working SEO meta, twice in a row, without a duplicate.

**Gate 2 — make it safe to leave running.** BLOCK-4 (turn on the gate options that already exist), BLOCK-7 (error tracking + one real notification channel), HIGH-6, HIGH-7, HIGH-8, HIGH-13, MED-1.

**Gate 3 — make it sellable.** BLOCK-6 (plan + EUR + VAT), BLOCK-10 (a price and one case study), HIGH-18, and an explicit decision on BLOCK-9.

**Gate 4 — pay down the structural debt.** BLOCK-8 (one central Drizzle dialect fix retires ~984 errors), the parity story, and the ~38k LOC of dead surface. Large, and it should not block the first customers — but every week it waits, the duplication tax is paid again.

HIGH-4 (LinkedIn version) sits outside the gates: it is a one-line change that cannot be validated without a live LinkedIn app. Bundle it into the first live LinkedIn test.

---

## What this audit did not cover

- No live run of anything. No real WordPress, no real LinkedIn app, no real Stripe payment, no deployed environment. Everything here is source-level.
- Mobile layout was not exhaustively spot-checked; the table-heavy `search/` and `keyword-tracking/` surfaces deserve a dedicated pass.
- pg-boss retry/backoff configuration was not traced in depth, so the exact retry multiplier compounding with the 15-minute sweep in BLOCK-2 is unquantified. The duplicate-post risk is proven at the sweep level regardless.
- Plugin packaging may happen in infrastructure outside this repo. That would resolve half of BLOCK-1; the dead wordpress.org link is broken regardless.
- `docs/parity-matrix.md` was not regenerated. It is stale by 14 routes.
