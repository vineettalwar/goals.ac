# Session Handoff

## Refocus on blogs + WordPress (2026-08-14)

**Status:** Product surface narrowed and all three missing personalization loops shipped on `claude/goals-ac-ai-content-1kib2e`. **Not yet run against a real WordPress site.**

**Decision record:** `docs/DECISIONS.md` 2026-08-14

### The finding that shaped this

Eight shipped waves, ~200 API routes, 40+ tables, 45+ connectors — and zero users, nothing live, one Playwright spec. The constraint is proof, not capability. Everything below narrows the product and closes the loops that actually produce rankings.

### Shipped

| # | Change | Verify |
|---|---|---|
| 1 | `ProductSurface` gates nav + format pickers to blog/WordPress | `npx vitest run lib/app-shell` |
| 2 | Cannibalization check on briefs against the CMS site graph | `npx vitest run lib/content-engine/src/strategy` |
| 3 | Internal link write-back into existing posts on publish | `pnpm --filter @workspace/goals-ac-wp run test:unit` |
| 4 | Content decay detection → `content_refresh` opportunities | `npx vitest run lib/seo-tools` |
| 5 | Brand voice learns from founder edits | `npx vitest run lib/content-engine/src/brand` |
| 6 | Founder-path e2e spec (written, **not executed**) | `pnpm run test:e2e` |

Unit tests went from 224 passing to 305, plus 15 new PHPUnit tests (the WordPress plugin's first).

### Next, in order

1. **Run the founder path against goals.ac's own WordPress blog.** This is the gate everything else waits on. Needs a live app, a database, and an AI provider key — none available in the session that wrote this. Expect breakage; that discovery is the point. Record time-to-first-published-article as the activation metric.
2. **Publish a refresh as an update to the same URL.** Half of the decay loop is missing: a `content_refresh` item carries refresh intent in its angle text but still publishes as a new post. Look up the `publish_records` row for the decaying URL and pass `update_id` to the plugin.
3. **Collapse onboarding** to voice → WordPress → first article; move `personas` and `fast-lane` behind the surface flag.
4. **Fold the 15 public feature pages** to the blog + WordPress story, keeping redirects so no URL 404s.
5. **Configure Stripe.** The billing code is complete and gated only on config: set `STRIPE_PRICE_GROWTH_MONTHLY`, and either price Scale or drop the tier.

### Watch out

- `pnpm run typecheck` is red on `main` in `api-server`, `cf-read-worker`, and `cf-write-worker` — pre-existing, unrelated. Validate with `pnpm run typecheck:libs` plus the `marketing-persona-app`, `worker`, and `cf-jobs-worker` filters.
- The coverage checker's rarity weighting is load-bearing. Removing it makes every brief on a single-topic blog collide with every post.
- The link write-back edits published posts. `class-internal-links.php` skips rather than forces, and its PHPUnit tests cover the corruption cases (nested anchors, attributes, Gutenberg delimiters). Keep them passing.

---

## Wave 6 — Honesty, proof, media (2026-07-23)

**Status:** **6.A + 6.B2 done** on working tree. **6.C** still needs prod R2/`media.goals.ac` verify.

**PRD:** `docs/prd/wave-6-honesty-proof-media.md` · Decision: `docs/DECISIONS.md` 2026-07-23

### Done

1. **6.A** Marketing honesty — `llms.txt`, compare, pricing, feature-data, nav, integrations directory, content-engine note, roadmap
2. **6.B2** Success-stories + homepage: empty catalog, demos + verify tools (no invented wins; no “never launched” on-site)

### Next

3. **6.C** Confirm `CONTENT_MEDIA_PUBLIC_BASE_URL` + R2 binding on jobs; IG smoke with `data:` featured
4. **6.B1** One real story only with publish rights

### Verify 6.A

```sh
rg -n '16\+|20\+ destinations|16 CMS|analytics included' artifacts/marketing-persona-app/src/components/marketing artifacts/marketing-persona-app/src/lib/marketing artifacts/marketing-persona-app/src/app/llms.txt
pnpm --filter @workspace/marketing-persona-app run typecheck
```

---

## World-class gaps tranche (2026-07-20) — SHIPPED (local)

**Status:** Five-item sequence implemented on working tree (not committed). Parallel agents + merge.

| # | Item | Where to verify |
|---|---|---|
| 1 | Success stories + verify CTAs (format-preview only; no fake named wins) | `/success-stories`, `/success-stories/format-preview-saas` |
| 2 | Outcomes panel on dashboard | `/dashboard` with active project — Outcomes row above autopilot |
| 3 | Fast-lane partner demo checklist | `/onboarding/fast-lane` done state (Next + Vite) |
| 4 | Public GEO lead capture | `/geo-audit` → result → WaitlistForm `geo-audit-lead` |
| 5 | Partner print outcomes | `/partner` — Print / Save as PDF + publish health columns |

**Docs:** `docs/prd/world-class-gaps-tranche.md` · `docs/DECISIONS.md` 2026-07-20

**Verify:**
```sh
npx vitest run lib/app-shell/src/dashboard/outcomes-panel.test.ts artifacts/marketing-persona-app/src/lib/marketing/content/success-stories.test.ts
pnpm --filter @workspace/marketing-persona-app run typecheck
pnpm --filter @workspace/goals-app-ui run typecheck
```

**Still deferred:** Surfer NLP, hosted blog, backlink exchange, public self-serve pricing. Named customer stories stay empty until a real launch (`PUBLISHED_STORIES`).

### Follow-up (2026-07-20 evening)

- Fast-lane POST kicks off visibility: seed prompts + queue `llmVisibilityCheck` + homepage GEO audit (`kickOffFastLaneVisibility`)
- Outcomes + fast-lane GET surface citation/GEO deltas
- Case studies: intentionally not pursued — never launched; format-preview fake stories deleted
- Vite `/partner` now shows publish health + print (was ignoring API fields)

---

## Wave 5 — Humanize durability + Studio/integration reliability (2026-07-17)

**Status:** Wave 5.A–5.C **shipped on `main`** + Bedrock BYOK model picker. **CF deployed** (2026-07-17 evening).

### Shipped in this tranche

- Humanize: structure guards (FAQ/citation/H2), reject-below-threshold + audit `reason`, voice-gated generate skip, platform-voice social presets + char limits
- Studio: Bluesky/Mastodon in Next format picker, Ready-to-publish checklist soft-block, social tighten enhance
- Integrations: Ghost/Webflow create-or-update, health-gated CMS publish, schedule honesty, Ghost/IG media acks, Mastodon admin info tile, Basic publish badges
- Bedrock: bearer API-key auth, explicit model picker (org + admin), clearer auth errors
- App Pages: publish dialog no longer imports adapter registry (avoids Node media/S3 in Vite)

### Still deferred

Surfer NLP, hosted blog, TikTok/YouTube, detector APIs, self-serve pricing, Content-media R2 invent (bucket already wired on jobs worker).

### Verify

```sh
npx vitest run lib/content-engine/src/content/humanizer-guards.test.ts lib/app-shell/src/content-piece/publish-ready-checklist.test.ts lib/ai-providers/src/bedrock-auth.test.ts
pnpm --filter @workspace/marketing-persona-app run typecheck
pnpm --filter @workspace/goals-app-ui run typecheck
```

### Deployed (this session)

| Target | Preview |
|--------|---------|
| Edge (public/read/write/gateway) | workers.dev |
| Jobs | goals-ac-jobs |
| Marketing Pages | goals-ac-marketing (built green) |
| App Pages | https://ced69338.goals-ac-app.pages.dev |

```sh
git push
```

---

## Overnight complete — Wave 4 trust surfaces (2026-07-16 → 17)

**Status:** Wave 4.0–4.16 + warning/ack follow-ups **shipped** on `main` (includes marketing static-export fixes for geo-audit `dynamicParams` + article-quality QueryClient).

**Not done (deferred / ops):** Surfer NLP, hosted blog, TikTok, invent R2 buckets, Drupal File entities, dual create merge, ponytail deletes, named GSC case studies, TYPO3 live smoke.

### Deploy (canonical)

```sh
pnpm run cf:edge:deploy && pnpm run cf:deploy:jobs && pnpm run cf:pages:marketing && pnpm run cf:pages:app
# optional: wrangler r2 bucket + CONTENT_MEDIA_PUBLIC_BASE_URL (content-media PRD)
```

### Wave 4 queue (closed)

| # | Item | Status |
|---|---|---|
| 4.0–4.6 | Before/after, human-voice, social Humanize, checklist, SERP refresh, brief insert, social history | **done** |
| 4.7–4.10 | Notion/Webflow media, actionable chips, Fix gaps+terms, plannedDate | **done** |
| 4.11–4.16 | Async platform fix, Vite plannedDate, SERP after humanize/enhance, schedule honesty, Joomla amber, social Studio link | **done** |
| 4.17 | Persist `lastPublishWarnings` + gate media acks + composer before/after | **done** (`d345e2e`) |

**Plan:** `docs/prd/content-studio-competitive-plan.md` · Decision: `docs/DECISIONS.md` Wave 4

---

## Wave 4.11+ reliability (2026-07-16)

| # | Item | Status |
|---|---|---|
| 4.11 | Async publish passes selected `platform` into job enqueue | done |
| 4.12 | Vite plannedDate on publish dialog | done |
| 4.13 | SERP refresh after humanize + enhance | done |
| 4.14 | Social schedule honesty (Ready / approval / sweep) | done |
| 4.15 | Joomla data: featured soft amber | done |
| 4.16 | Social composer links to Studio for before/after revert | done |

---

## Wave 4.8 — Coverage checklist chips actionable (2026-07-16)

**Status:** done. Missing coverage-checklist chips (secondary keywords / PAA questions / rival topics not yet mentioned in the draft) are now clickable instead of purely decorative. Covered chips stay display-only spans — no click affordance.

- Missing chips render as `<button>`s. Click behavior depends on edit mode:
  - **Editing + host insert callback wired:** inserts a stub into the draft body — `## {term}` for PAA/rival-topic chips (heading-shaped), or a stub sentence (`Add a sentence mentioning "{term}" here.`) for secondary-keyword chips
  - **Not editing (or no insert callback):** copies the raw term to the clipboard
- Brief 1.5s inline feedback (chip flips to emerald "✓ … · inserted" / "✓ … · copied") confirms the click landed; a hint line above the chips names the current click behavior
- Label stays honest: "Coverage checklist — not Surfer NLP" copy is unchanged (still a plain mention check, no density/frequency scoring)
- Insert reuses the same append-to-draft plumbing as the Wave 4.5 brief-outline insert (`onInsertOutline` threaded through `ContentPieceView` → `ContentPieceAside`) — no new host wiring needed, so Next and Vite both pick it up for free through the shared `ContentPieceView`

**Changed files:**
- `lib/app-shell/src/content-piece/content-quality-panel.tsx` — `buildCoverageInsertSnippet`, `editing`/`onInsertMissingTerm` props, missing-chip click handler + feedback state, chip markup (span → button for misses)
- `lib/app-shell/src/content-piece/content-piece-ui.tsx` — wires `editing` + `onInsertMissingTerm` (append via existing `onInsertOutline`) into `ArticleQualityPanel`

**Verify:** `pnpm run typecheck:libs`, `pnpm --filter @workspace/marketing-persona-app run typecheck`, `pnpm --filter @workspace/goals-ac run typecheck` (all clean; unrelated pre-existing `@workspace/api-server` `pool` export error is untouched by this change).

## Wave 4.9 — Fix gaps enhance consumes coverage checklist + SERP gaps (2026-07-16)

**Status:** done. "Fix gaps" (quality panel's enhance trigger) now tells the AI exactly which coverage-checklist terms are missing, on top of the existing SERP gaps.

- `content-quality-panel.tsx` computes `missingTerms` (uncovered secondary keywords / PAA questions / rival topics from the coverage checklist) and passes them to `onEnhance(missingTerms)` when "Fix gaps" is clicked
- `onEnhance` prop widened to `(missingTerms?: string[]) => void | Promise<void>` through `ContentPieceView` → `ContentPieceAside` → `ArticleQualityPanel` (toolbar's plain "Enhance quality" button still calls with no args)
- `EnhanceContentInput.missingTerms` (new, optional) flows into `describeQualityGaps(body, wordCount, missingTerms)`, which appends a "Coverage checklist" gap line for the enhance prompt to prioritize
- Hosts thread the optional `missingTerms` through to the enhance API: Next route (`content-pieces/[id]/enhance`) and cf-write-worker `handleEnhance` both read `missingTerms` from the POST body; Next client and Vite `use-content-piece-data.ts` `enhance()` send it

**Changed files:**
- `lib/content-engine/src/content/content-piece-seo.ts` — `describeQualityGaps` optional `missingTerms` param
- `lib/content-engine/src/content/content-piece-enhance.ts` — `EnhanceContentInput.missingTerms`, wired into prompt
- `lib/app-shell/src/content-piece/content-quality-panel.tsx` — computes + forwards missing terms
- `lib/app-shell/src/content-piece/content-piece-ui.tsx` — widened `onEnhance` type through the view/aside chain
- `artifacts/marketing-persona-app/src/app/api/content-pieces/[id]/enhance/route.ts` — reads `missingTerms` from body
- `artifacts/marketing-persona-app/src/components/content/content-piece-client.tsx` — sends `missingTerms`
- `artifacts/cf-write-worker/src/content-pieces-ai.ts` — reads `missingTerms` from body
- `artifacts/goals-app-ui/src/hooks/use-content-piece-data.ts` — `enhance(missingTerms?)` sends it

**Verify:** `pnpm run typecheck` (or per-package typecheck for `content-engine`, `app-shell`, `marketing-persona-app`, `goals-ac`, `cf-write-worker`).

## Wave 4.10 — Article plannedDate / schedule honesty in Studio publish flow (2026-07-16)

**Status:** done. Articles already have `plannedDate` column (Drizzle schema, used by `processScheduledPublishSweep` job). Added UI honesty for the publish flow:

- Publish dialog now shows `plannedDate` if set on the piece
- Soft guidance explains two paths:
  - **Option 1:** Mark Ready in editor + keep scheduled → daily sweep publishes on plannedDate
  - **Option 2:** Publish now → immediate (ignores scheduled date)
- No new job infrastructure; reuses existing `processScheduledPublishSweep` (runs daily, finds `status: ready` + `plannedDate <= today`)
- UI to set/clear plannedDate already exists in piece editor (date input in editor toolbar)

**Changed files:**
- `lib/app-shell/src/content-piece/publish-dialog.tsx` — added `plannedDate` prop + guidance section
- `artifacts/marketing-persona-app/src/components/content/content-piece-client.tsx` — passed `plannedDate` to dialog

**Verify:** `pnpm --filter @workspace/marketing-persona-app run typecheck` (pass). No schema migration needed.

## Wave 4.6 — Social publish_records (2026-07-16)

**Status:** done. `publishPieceToSocial` call sites (`contentPublish` job handler, Next `content-pieces/[id]/publish` route) already wrapped social publish in `withPublishRecord` from earlier work — the actual gap was UI-side:

- `ProjectPublishingTab` gated the `ProjectPublishHistoryPanel` to `categoryFilter === "all" || "cms"`, so the Social tab on Project → Integrations never rendered publish history at all. Now also renders for `categoryFilter === "social"`.
- `PublishHistoryPanel` copy said "Recent CMS publishes for this project." — now "Publishes" / "Recent CMS and social publishes for this project."

No schema or pipeline changes needed; `listPublishRecordsForProject` already returns all providers unfiltered.

**Verify:** `pnpm run typecheck:libs` (content-engine + app-shell clean).

## Overnight mode (2026-07-16 → 17) — Wave 4

**Running:** Wave 4 competitive trust surfaces (commits ~every 5 files).  
**Not running:** Cloudflare deploy (prep commits only — you deploy morning), ponytail deletes, Surfer NLP, hosted blog, R2 bucket ops, dual create merge.

### Wave 4 queue

| # | Item | Status |
|---|---|---|
| 4.0 | Product humanize before/after in Studio | **done** (snapshot + toggle + revert; Next + Vite + CF) |
| 4.1 | Human-voice actionable detail | **done** |
| 4.2 | Social composer Humanize | **done** |
| 4.3 | Light term checklist (secondary/PAA) | **done** |
| 4.4 | SERP refresh honesty | **done** |
| 4.5 | Brief outline insert when body present | **done** |
| 4.6 | Social publish_records | **done** (UI shows social history) |

### Wave 4.7+ (continuing — remaining MEDIUM gaps)

| # | Item | Status |
|---|---|---|
| 4.7 | Soft media honesty Notion/Webflow (+ IG stock path clarity) | **done** |
| 4.8 | Coverage checklist actionable (copy/insert missing) | **done** |
| 4.9 | Fix gaps consumes missing terms + SERP gaps | **done** |
| 4.10 | Article scheduled/planned publish honesty in Studio | **done** |

**Plan:** `docs/prd/content-studio-competitive-plan.md` § Wave 4 · `docs/DECISIONS.md` 2026-07-16 Wave 4

### 4.4 SERP refresh honesty

After successful Save of body, auto-refresh SERP score so "last scored" timestamp stays current.

- SERP score endpoint now returns `scoredAt: ISO timestamp`
- Quality panel shows "Scored [timestamp]" and highlights stale scores in amber when draft differs from saved
- Next.js client (`content-piece-client.tsx`) auto-refreshes SERP after save success
- Vite hook (`use-content-piece-data.ts`) auto-refreshes SERP after save success
- Manual "Refresh SERP score" button remains available
- Files: `cf-write-worker/content-pieces-ai.ts` (adds timestamp), `app-shell/content-quality-panel.tsx` (displays timestamp + staleness), `marketing-persona-app/content-piece-client.tsx`, `goals-app-ui/use-content-piece-data.ts`

### Also landed (admin)

Vite `/admin/integrations` now uses the tile + dialog UI (parity with Next). Old form + `[object Object]` fields gone. Surfaces on app.goals.ac after `cf:pages:app` / Pages rebuild.

### Morning deploy (you)

```sh
pnpm run typecheck
# then when green:
pnpm run cf:edge:deploy && pnpm run cf:deploy:jobs && pnpm run cf:pages:marketing && pnpm run cf:pages:app
```

---

## Stopped earlier — historical kickoff (superseded by Wave 4 overnight)

1. Dual Studio create (optional / yagni) — still deferred  
2. Content-media R2 ops — still morning ops  
3. Named GSC stories — still partner-gated  
4. TYPO3 live smoke — still manual  
5. Wrangler lock leftovers — review with morning CF work  

---

## Still shipping (2026-07-16 pulse)

| Done | Notes |
|---|---|
| TYPO3 BE + folder | Hardened |
| Languages | Cap → 30 |
| Success UI | Illustrative card |
| Public GEO | Anonymous (if landed) |
| Instagram copy | Fixes |
| Partner Story kit | Shared constants + template; honest (no fake names/metrics) |
| Instagram queue stock CTA | "Use stock image" button when "Needs image" badge shown; reuses `/images/regenerate` API; queue reloads on success (Next + Vite) |
| Outline actions | **Copy outline** + optional **Insert into draft** when empty; wired in shell + Next |
| TYPO3 media upload | `POST /goals-ac/v1/media` — mirrors WordPress `/media`; FAL import shared via new `FalImporter` helper |
| TYPO3 media preflight | Soft amber when raster `data:` featured + plugin lacks `media_upload`; hosts pass `pieceFeaturedImageUrl` |
| briefId persist | Legacy Express + CF write worker now link generated pieces to their brief (parity with Next); brief marked `done` once real content lands |
| Shell `?briefId=` | Vite Studio deep-link opens create dialog prefilled + generate payload includes briefId |

**In flight:** Wave 4.0+ (see Overnight mode).

### TYPO3 media upload

`POST /goals-ac/v1/media` — HMAC auth, no idempotency (matches WP). Accepts `filename`, `mime_type`, `data` (base64 raw or data URI; PNG/JPEG/WebP), optional `alt`/`title`/`caption`. Writes into default FAL storage under `fileadmin/user_upload/goals-ac/`, returns `{ id, source_url }` (site-relative URL — never fabricates a host).

- New: `cms-plugins/typo3/Classes/Helper/FalImporter.php` (extracted from `ContentPublisher` — shared by inline `textmedia` FAL import and the standalone upload), `Classes/Controller/MediaController.php`
- Registered in `ApiMiddleware.php`; `HealthController` now lists `endpoints.media` + `capabilities.media_upload: true`
- `typo3-adapter.ts` (`content-engine`) now prefers uploading the featured image via `/media` and referencing the hosted URL in the `textmedia` element, falling back to inline base64 (`prependTypo3FeaturedBase64`) when the upload fails or plugin/creds are unavailable — avoids inlining large base64 into the content publish payload for plugin installs that support `/media`
- `cms-publish.ts` (legacy content-piece publish flow) still calls `publishToTypo3` with body markdown only — never touches images, so unaffected

### TYPO3 media preflight

Soft amber warning in publish dialog when TYPO3 selected + raster `data:` featured image + plugin health lacks `media_upload` capability (older plugin without POST /media). Non-blocking — inline FAL (base64 in DB) still works.

- Health service (`integration-health-service.ts`) now persists `lastHealthMediaUploadCapable` from plugin capabilities
- New component: `lib/app-shell/src/content-piece/typo3-media-preflight.tsx` (Shopify pattern)
- Publish dialog checks: `platform === "typo3" && hasRasterDataImage(pieceFeaturedImageUrl) && !readTypo3MediaUploadCapable(connection)`
- Setup steps updated: mentions POST /media in checklist
- Files: `integration-health-service.ts`, `typo3-media-preflight.tsx`, `publish-dialog.tsx`, `connect-setup-steps.tsx`

### Outline actions

Writing-room actions on `ContentBriefPanel` when outline present:

- **Copy outline** button → clipboard as markdown H2 list (always shown)
- **Insert into draft** button → `dispatch({ type: "set_body" })` (only when body empty + host provides callback)
- Wired: `content-piece-ui.tsx` (`ContentPieceAside` → `ContentBriefPanel`) + Next `content-piece-layout-aside.tsx` (`setBodyDraft`)
- Files: `lib/app-shell/src/content-piece/content-brief-panel.tsx`, `content-piece-ui.tsx`; Next `content-piece-layout-aside.tsx`

---

## Prior pulse (2026-07-16)

| Done | Notes |
|---|---|
| Ghost featured | data-URI + HTTPS upload path |
| Notion images | HTTPS image blocks + featured image → page cover; non-https skipped with warnings |
| Instagram queue | HTTPS-only + pre-enrich; composer/piece: paste HTTPS `featuredImageUrl` or **Use stock image** |
| WP featured | data-URI featured (existing) |
| Bluesky durable JWK | `JoseKey.fromImportable` from env/DB only; no ephemeral mint — missing key throws |
| Shopify featured | Admin API + plugin: https + PNG/JPEG data URI via `stagedUploadsCreate` |
| Joomla featured | HTTPS → REST/plugin `images` (`image_intro` + `image_fulltext`); non-https skipped |
| Content-media R2 | Buckets + r2.dev public URLs provisioned; vars wired |

**In flight:** none from this list.

### Content-media R2 (2026-07-16)

Public host for raster featured data URIs → HTTPS (`docs/prd/content-media-r2.md`).

- Lib: `@workspace/media` `hostRasterFeaturedDataUri` / R2 binding + optional S3 API
- Enrich + CMS/social/Notion publish fallback
- Wrangler: `CONTENT_MEDIA_R2` on marketing OpenNext + jobs worker
- **Buckets created:** `goals-ac-content-media` → custom domain **https://media.goals.ac** (SSL active); staging uses r2.dev `https://pub-2b41b9b8da9b4805a574284ef3c146ae.r2.dev`
- `CONTENT_MEDIA_PUBLIC_BASE_URL` wired in wrangler vars (prod/jobs → media.goals.ac)

---

## Parallel unfinished-work agents (2026-07-16) — batch closed

| Workstream | Notes |
|---|---|
| ~~Unify publish-destination registries~~ | **Done.** Canonical: `lib/app-shell/src/content-piece/publish-destinations.ts` (27 IDs). Next thin re-export from `@workspace/app-shell/publish-destinations`. Integrations panel types stay separate shapes. Legacy `goals-ac` copy untouched. |
| ~~Consolidate CMS/ESP connect dialogs~~ | **Done.** `SchemaConnectDialog` + configs. 1729 → 734 LOC (−57%). Named exports preserved. |
| ~~Notion adapter image blocks~~ | **Done.** HTTPS markdown images + featured → page cover; non-https skipped with warnings. |

**Still open elsewhere:** (none from ponytail safe-delete list).

### Ponytail re-audit unfinished → finished (2026-07-16)

Re-audit: [`docs/audits/2026-07-16-ponytail-frontend-reaudit.md`](docs/audits/2026-07-16-ponytail-frontend-reaudit.md). Treated ambiguous “dead” as unfinished first.

| Item | Outcome |
|---|---|
| `useJobPoll` | Wired generate + publish polls in Pages `use-content-piece-data` |
| `BrandTailoringPanel` | Mounted on Brand tab (live form) + content piece `asideExtra` |
| `VideoDemoSection` | Mounted on marketing home after `WorkflowSection`; collage → `/content-engine` |
| Public `/roadmaps` clients | Never launched — keep redirect to `/content-engine`; deleted clients + marketing `RoadmapGenerator` |
| Deprecated Next `content-piece-layout*` cluster | Deleted (shell `ContentPieceView` SSOT) |
| `dashboard-sections.tsx` | Deleted (shell `DashboardView`) |
| Unused Next deps | Removed `@dnd-kit/*`, `@radix-ui/react-separator`, orphan `ui/separator.tsx` |

### Next studio leftovers deleted (2026-07-16)

Verified dead after hub → `StudioView`. Before delete: one unfinished bit was hub `ArticlePerformanceBadge` (only on leftover list cards + piece detail). Ported via shell `renderPieceExtras` + `publishedUrl` on `StudioPiece`.

Deleted: `brand-ai-profile-card.tsx`, `content-studio-calendar.tsx`, `content-studio-hub-filters.tsx`, `content-studio-list-items.tsx`, `visibility/keyword-rank-chart.tsx`.

Feature diff vs shell (none unfinished left in those files):

| Leftover | Shell / live | Unique unfinished? |
|---|---|---|
| Brand AI card | Shell card + host-loaded profile (plus last-scanned) | No — shell richer |
| Calendar DnD | Shell `StudioCalendarView` (mobile agenda + 3/day) | No — shell ≥ leftover |
| Hub filters | Shell filters + list/grid toggle | No — shell richer |
| List cards | Shell cards + Generate CTA | Yes → badge ported |
| Keyword rank chart | `@workspace/app-shell` chart in keyword tabs | No |

**Unused deps removed from Next:** `gsap`, `@gsap/react`, `marked` (zero imports in `marketing-persona-app`).

---

## Closure — social OAuth, destinations, WP media, create progress (2026-07-16)

Batch closure for admin-backed social OAuth, destination SSOT, WP data-URI featured, shell create progress, and DB-aware social gates. Deferred lists elsewhere in this file are unchanged.

| Area | Done |
|---|---|
| CF public-worker social OAuth | LinkedIn / X / Meta / Bluesky handlers call `resolve*OAuthCredentials` (admin DB + env fallback) — same path as Next (`auth-linkedin` / `auth-twitter` / `auth-meta` / `auth-bluesky-oauth`) |
| Publish destination IDs | UI SSOT: `lib/app-shell/src/integrations/destination-ids.ts`. Next composes full defs from app-shell (`CMS_PLATFORMS` / ESP / `getSocialDestinations`) in `publishing-destinations.ts` + local publish/format overlays |
| WP featured upload | PNG/JPEG `data:` featured URIs → decode → WebP → plugin `/media` or WP REST via `prepareWordPressImages` |
| Shell create SSE | Vite Studio parse of generate SSE → markdown headings → `CreateContentDialog` `generatingHeadings`; timed Analyzing/Drafting/Finishing until first heading |
| Social feature gates | Connect availability / cms-summary / platform settings use DB-aware `has*Credentials()` (not env-only) |
| Admin Meta / X / Bluesky | Platform admin → Integrations → Social; encrypted columns + `resolve*` helpers; migrations PG `0065`–`0067`, D1 `0002`–`0004` |

**Deferred unchanged:** hosted blog, Surfer NLP, TikTok, Shopify theme app block.

---

## Shell create repurpose flow (2026-07-16)

Compact Create vs Repurpose path in `CreateContentDialog` when `onRepurpose` is provided:

`path → format → keyword → source (pick piece / paste) → review → POST …/content-pieces/repurpose`

`StudioPage` passes studio pieces + `onLoadSourcePiece` + `repurposePiece` from `use-studio-data`.

Shell create parity with Next wizard: destination, competitor picker, stream headings, **repurpose** — done.

---

## Shell create streaming headings (2026-07-16)

Vite Studio create stream now parses SSE `text` chunks, extracts markdown headings from partial `body_markdown` (same algorithm as Next `extractSections`), and passes them into `CreateContentDialog` via `generatingHeadings`. Falls back to timed Analyzing/Drafting/Finishing labels until the first heading arrives; sync POST fallback shows “Finishing…”.

---

## Shell create competitor picker (2026-07-16)

`CreateContentDialog` competitors step now mirrors Next: load project brand URLs + analyses via host props (`projectCompetitors` / `competitorsLoading`), tap-to-focus cards, quick-add URL, optional focus.

`StudioPage` fetches `/api/website-projects/:id/competitors` when the create dialog opens and maps analyses via `flattenCompetitorAnalysisList`.

---

## Ponytail audit documented (2026-07-16)

Reports:
- [`docs/audits/2026-07-16-ponytail-frontend.md`](docs/audits/2026-07-16-ponytail-frontend.md)
- [`docs/audits/2026-07-16-ponytail-frontend-reaudit.md`](docs/audits/2026-07-16-ponytail-frontend-reaudit.md)

- Cursor rule + skills installed; complexity audit of Next + `goals-app-ui` + `app-shell`
- **Do not delete `goals-app-ui`** — it is `app.goals.ac` Pages (`docs/deploy-cloudflare.md`)
- First-pass high-confidence deletes + re-audit unfinished-finish batch (see section above)
- Dual create wizards / `PieceLink` / AI pause helpers kept as intentional or unfinished wiring

---

## WordPress featured data URI upload (2026-07-16)

**Supported** (connector, not PHP plugin): when `featuredImageUrl` is `data:image/png` or `data:image/jpeg` base64 and no stock featured image was uploaded, `prepareWordPressImages` decodes, optimizes to WebP, and uploads via plugin `/media` or WP REST.

- SVG data URIs ignored
- Plugin PHP unchanged (already accepts base64 payloads; no URL fetch of data: schemes)
- Call sites: `cms-publish.ts`, `wordpress-adapter.ts`

### Ghost / Shopify featured images (2026-07-16)

| Platform | Status |
|---|---|
| **Ghost** | Connector uploads https / PNG/JPEG data URI via Admin `images/upload`, sets `feature_image`. Adapter `featuredImage: true`. |
| **Shopify (Admin API)** | `lib/connectors` `resolveShopifyArticleImage`: staged upload; https falls back to direct URL if staged fails. |
| **Shopify (plugin)** | `cms-plugins/shopify` `resolveArticleImageFromFeaturedUrl`: https pass-through; PNG/JPEG data URI → `stagedUploadsCreate` → resource URL. SVG skipped; staged failure skips image (article still publishes). Adapter already forwards `featuredImageUrl`. |
| **Joomla** | REST `images` object + plugin `#__content.images` from HTTPS `featuredImageUrl` (`image_intro` + `image_fulltext`). Non-https skipped. Adapter `featuredImage: true`. |

SVG data URIs ignored on Ghost/Shopify; Joomla is HTTPS-only (no media upload).

### Drupal featured image — skipped (2026-07-16)

**Skip.** Not a safe one-shot map of `featuredImageUrl` → field.

| Surface | Today |
|---|---|
| JSON:API `publishToDrupal` | Title/body/tags only — no image upload or relationships |
| Plugin `GoalsAcController::publishContent` | No featured handling (no TYPO3-style ContentPublisher) |
| SiteGraph | **Read-only** probe of `field_media_image` / `field_image` / `field_featured_image` |
| Adapter | `featuredImage: false` |

**Why hard:** field names/types vary per site (`image` file vs Media entity ref); write path needs File (+ often Media) entity create from https/data URI, SSRF-safe fetch, and JSON:API file-upload config that differs by Drupal version/modules. Half-wiring a URL into attributes without entities will 4xx or corrupt nodes.

**When revisited:** plugin-first — detect image-like field on target bundle → fetch/create File → if Media ref, create Media → set field; then optionally mirror in JSON:API connector. Keep adapter capability false until that ships.

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
- Bluesky has no pasted client id — client id is the hosted metadata URL; private JWK from Admin Integrations or `BLUESKY_OAUTH_PRIVATE_KEY_JWK` (no ephemeral mint)
- Done when: paste credentials in admin → project Connect works without matching `.env` vars
- CF public-worker now uses the same `resolve*` helpers (see closure section above)

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

There is a dedicated public content-media R2 path (`CONTENT_MEDIA_R2` + `CONTENT_MEDIA_PUBLIC_BASE_URL`) — see `docs/prd/content-media-r2.md`. Until the bucket is provisioned, Sharp PNG from visual summary may remain `data:image/png;base64,…` on `featuredImageUrl`. **WordPress / Ghost / Shopify** still upload that data URI (or https) natively.

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

`ContentPublisher` prefers FAL for `textmedia` images: resolve existing `/fileadmin/…` paths, download remote http(s) or accept PNG/JPEG base64/data-URI into `fileadmin/user_upload/goals-ac/`, attach via `sys_file_reference` on `assets`. Falls back to embedding `<img>` in `bodytext` if FAL/storage/download fails (private URLs blocked).

**File:** `cms-plugins/typo3/Classes/Helper/ContentPublisher.php` (+ `GeneralUtility` stub helpers).

**Hardened (2026-07-16):** DataHandler paths init a synthetic admin `BackendUserAuthentication` (+ LanguageService when available) when `$GLOBALS['BE_USER']` is missing — middleware/API/CLI context. FAL folder resolve creates `user_upload` then `goals-ac` when missing (race-safe catch), then falls back to default/root folder.

**Leftover / verify on a real TYPO3 site:** no dedicated plugin `/media` upload route (base64/data-URI goes through content payload → FAL import); smoke-test page + textmedia publish on a live TYPO3 install.

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

**Remaining (stale section below — updated):** Shell create wizard parity with Next (destination, competitors, stream headings, repurpose) shipped 2026-07-16. Unused local Next studio leftovers remain deletable.

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
