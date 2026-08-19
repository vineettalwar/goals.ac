# Vite → Next Parity Tracker

This doc is the single source of truth for mapping legacy Vite flows to their Next equivalents for the “Typeform-level UX” pilot.

## Required record fields

For every `flowId`, fill:

- `flowId`: stable id (`studio-create-flow`, `admin-org-plan-change`, etc.)
- `legacyRouteOrEntry`: Vite route/component entry path
- `userJob`: user intent this flow solves
- `persona`: owner/editor/admin/partner/internal
- `criticality`: P0/P1/P2
- `nextEquivalent`: exact Next route/component/API path or `missing`
- `backendDependencies`: API routes/jobs/DB fields/connectors touched
- `stateDependencies`: local storage/cookies/query params/session assumptions
- `featureFlags`: flags/toggles required
- `behaviorParity`: `exact` / `acceptable-delta` / `missing`
- `deltaNotes`: concise behavioral differences
- `decision`: `port` / `retire` / `merge`
- `decisionOwner`: accountable owner
- `verification`: test cases + manual checks
- `status`: `not-started` / `in-progress` / `verified`
- `signoff`: date + approver

## Seed catalog (initial)

Fill in legacy/Next mapping as discovered during audit.

### Auth and shell

| flowId | persona | criticality | status |
|---|---|---|---|
| auth-signup | TBD | P0 | not-started |
| auth-login | TBD | P0 | not-started |
| auth-session-refresh | TBD | P0 | not-started |
| auth-new-user-redirect | TBD | P0 | not-started |
| app-layout-org-guard | TBD | P0 | not-started |
| app-layout-project-guard | TBD | P0 | not-started |
| public-to-app-intent-redirect | TBD | P0 | not-started |

### Onboarding

| flowId | persona | criticality | status |
|---|---|---|---|
| onboarding-goal-step | TBD | P0 | not-started |
| onboarding-company-step | TBD | P0 | not-started |
| onboarding-competitor-step | TBD | P0 | not-started |
| onboarding-language-step | TBD | P0 | not-started |
| onboarding-persona-generation | TBD | P0 | not-started |
| onboarding-persona-selection | TBD | P0 | not-started |
| onboarding-fast-lane-autostart | TBD | P1 | not-started |
| onboarding-wordpress-connect | TBD | P0 | not-started |
| onboarding-brand-voice-step | TBD | P0 | not-started |
| onboarding-completion-redirect | TBD | P0 | not-started |

### Project and dashboard

| flowId | persona | criticality | status |
|---|---|---|---|
| project-list-and-quota-label | TBD | P0 | not-started |
| project-create-and-brand-scrape | TBD | P0 | not-started |
| project-switcher-active-context | TBD | P0 | not-started |
| dashboard-command-center | TBD | P0 | not-started |
| dashboard-outcomes-panel | TBD | P1 | not-started |
| dashboard-autopilot-settings-compact | TBD | P1 | not-started |
| dashboard-autopilot-activity | TBD | P1 | not-started |

### Content Studio create and generation

| flowId | persona | criticality | status |
|---|---|---|---|
| studio-create-flow-path-selection | TBD | P0 | not-started |
| studio-create-flow-format-selection | TBD | P0 | not-started |
| studio-create-flow-keyword-angle | TBD | P0 | not-started |
| studio-create-flow-competitor-selection | TBD | P1 | not-started |
| studio-create-flow-destination-selection | TBD | P1 | not-started |
| studio-create-flow-review-submit | owner/editor | P0 | in-progress |
| studio-generate-stream | owner/editor | P0 | in-progress |
| studio-generate-cache-hit | TBD | P1 | not-started |
| studio-generate-billing-denied | TBD | P0 | not-started |
| studio-daily-five-batch-submit | owner/editor | P0 | in-progress |

#### studio-daily-five-batch-submit

- `flowId`: `studio-daily-five-batch-submit`
- `legacyRouteOrEntry`: `missing` — no Vite equivalent existed; this is a net-new Next flow
- `userJob`: capture 5 researched topics and generate WP drafts in one operator session
- `persona`: owner/editor
- `criticality`: P0
- `nextEquivalent`:
  - UI: `artifacts/marketing-persona-app/src/app/(app)/projects/[id]/daily-five/page.tsx`
  - Client: `artifacts/marketing-persona-app/src/components/content-studio/daily-five-client.tsx`
  - Batch API: `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/content-pieces/daily-five/route.ts`
- `backendDependencies`:
  - generation stream: `/api/website-projects/[id]/content-pieces/generate/stream`
  - content-pieces CRUD: `/api/website-projects/[id]/content-pieces`
  - validation: `lib/content/daily-five-validation.ts` (source URL parsing, item validity)
  - billing: `prepareAiBilling` / `completeAiBilling` / `cancelAiBilling`
  - publish: `/api/content-pieces/[id]/publish` (wordpress draft mode)
  - DB: `contentPiecesTable`, `websiteProjectsTable`
- `stateDependencies`: session cookie (NextAuth); no localStorage or query-param state
- `featureFlags`: none
- `behaviorParity`: `acceptable-delta` — net-new UI; backend generation/publish pipeline shared with studio-generate-stream
- `deltaNotes`: Daily Five is a purpose-built batch UI. Legacy Vite had no equivalent batch flow; operators used repeated single-create.
- `decision`: `port` (new feature using ported backend primitives)
- `decisionOwner`: vineet
- `verification`:
  - [ ] `scripts/pilot-e2e-smoke-run.mjs` — end-to-end batch submit + publish
  - [x] `artifacts/marketing-persona-app/src/lib/content/daily-five-validation.test.ts` — unit: URL parsing, item validity
  - [ ] Manual: submit 5 items → verify 5 content_pieces rows created → verify WP draft publish succeeds
- `status`: `in-progress`
- `signoff`: `TBD`

---

#### studio-generate-stream

- `flowId`: `studio-generate-stream`
- `legacyRouteOrEntry`: `missing` — legacy Vite called Express `/api/content-pieces/generate` (non-streaming)
- `userJob`: stream-generate a content piece from keyword + format + brand context
- `persona`: owner/editor
- `criticality`: P0
- `nextEquivalent`:
  - API: `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/content-pieces/generate/stream/route.ts`
  - Wizard UI: `artifacts/marketing-persona-app/src/components/content-studio/create-content-modal.tsx`
  - Late steps: `artifacts/marketing-persona-app/src/components/content-studio/create-content-create-late-steps.tsx`
- `backendDependencies`:
  - `@workspace/content-engine/content/content-studio-generator` (generateContentPieceStream, cacheGet/cacheSet)
  - `lib/content/content-pieces-helpers.ts` (loadProjectBrand, loadProjectVoiceGate, buildCacheKey, insertGeneratedContentPiece)
  - billing: `prepareAiBilling` / `completeAiBilling` / `cancelAiBilling`
  - DB: `contentPiecesTable`
- `stateDependencies`: session cookie; wizard local state via `use-create-content-modal.ts`
- `featureFlags`: none
- `behaviorParity`: `acceptable-delta` — streaming (SSE) vs legacy non-streaming JSON; same output shape
- `deltaNotes`: Next version streams tokens via ReadableStream; legacy returned full body. Cache key algorithm identical.
- `decision`: `port`
- `decisionOwner`: vineet
- `verification`:
  - [ ] `scripts/pilot-e2e-smoke-run.mjs` — covers generate flow
  - [ ] Manual: create content piece via wizard → verify stream completes → DB row persisted with correct format
- `status`: `in-progress`
- `signoff`: `TBD`

---

#### piece-humanize-trigger

- `flowId`: `piece-humanize-trigger`
- `legacyRouteOrEntry`: `missing` — legacy Vite called Express `POST /api/content-pieces/:id/humanize`
- `userJob`: rewrite AI-generated piece to match brand voice / reduce AI detectability
- `persona`: owner/editor
- `criticality`: P0
- `nextEquivalent`:
  - API: `artifacts/marketing-persona-app/src/app/api/content-pieces/[id]/humanize/route.ts`
  - Revert API: `artifacts/marketing-persona-app/src/app/api/content-pieces/[id]/humanize/revert/route.ts`
- `backendDependencies`:
  - `@workspace/content-engine/content/humanizer` (humanizeContentPiece)
  - `@workspace/content-engine/content/humanize-eligibility` (isHumanizableFormat)
  - `resolveAiClientForUser` — AI provider resolution
  - `loadProjectBrand`, `loadUserAiSettings`, `assertPieceOwner`
  - billing: `prepareAiBilling` / `completeAiBilling` / `cancelAiBilling`
  - DB: `contentPiecesTable` (updates `body`, stores `preHumanizeBody`)
- `stateDependencies`: session cookie only
- `featureFlags`: none
- `behaviorParity`: `missing` — cannot confirm legacy Vite UI behavior without source; backend logic is identical (shared `humanizeContentPiece`)
- `deltaNotes`: API contract matches legacy Express route 1:1. Revert endpoint is net-new.
- `decision`: `port`
- `decisionOwner`: vineet
- `verification`:
  - [ ] Manual: humanize a generated piece → verify `preHumanizeBody` stored → revert restores original
  - [ ] `scripts/pilot-e2e-smoke-run.mjs` — if humanize step included in smoke
  - [ ] Confirm billing deducted on success, cancelled on failure
- `status`: `in-progress`
- `signoff`: `TBD`

---

#### publish-dialog-wordpress-draft

- `flowId`: `publish-dialog-wordpress-draft`
- `legacyRouteOrEntry`: `missing` — legacy Vite called Express `POST /api/content-pieces/:id/publish`
- `userJob`: push approved content piece to WordPress as a draft post
- `persona`: owner/editor
- `criticality`: P0
- `nextEquivalent`:
  - API: `artifacts/marketing-persona-app/src/app/api/content-pieces/[id]/publish/route.ts`
  - Per-destination: `artifacts/marketing-persona-app/src/app/api/content-pieces/[id]/publish/[destinationId]/route.ts`
- `backendDependencies`:
  - `@workspace/content-engine/support/publishing/cms-publish` (publishPieceToWordPress)
  - `@workspace/content-engine/support/publishing/publish-destination` (publishPieceToDestination)
  - `@workspace/content-engine/support/publishing/publish-records` (withPublishRecord)
  - `@workspace/content-engine/support/publishing/resolve-publish-entitlements`
  - `@workspace/content-engine/support/publishing/cms-integrations` (decryptCmsCredentials)
  - `@workspace/content-engine/articles/article-image-enricher` (featuredImageFromMetadata)
  - `@workspace/content-engine/support/brand/brand-voice-generation` (ingestPublishedContentPiece)
  - `@workspace/security/encryption` (decryptSecret)
  - `@workspace/jobs` (enqueue post-publish jobs)
  - WordPress plugin: `cms-plugins/wordpress/includes/class-publish-handler.php`
  - DB: `contentPiecesTable`, `websiteProjectsTable`, `wordpressConnectionsTable`, `companiesTable`
  - Reliability monitoring: `src/lib/admin/publish-reliability.ts`
- `stateDependencies`: session cookie; WP connection credentials (encrypted in DB)
- `featureFlags`: none
- `behaviorParity`: `missing` — cannot verify legacy Vite publish dialog UI; backend publish logic is the same shared function
- `deltaNotes`: Next route supports both generic publish (by platform) and per-destinationId publish. Adds publish-record history and reliability alerting (net-new).
- `decision`: `port`
- `decisionOwner`: vineet
- `verification`:
  - [ ] `scripts/wordpress-plugin-smoke.mjs` — WP plugin health + publish round-trip
  - [ ] `scripts/pilot-e2e-smoke-run.mjs` — end-to-end publish step
  - [x] `artifacts/marketing-persona-app/src/lib/admin/publish-reliability.test.ts` — reliability scoring unit tests
  - [ ] Manual: publish piece → confirm WP draft created → confirm publish_record row + brand voice ingest triggered
- `status`: `in-progress`
- `signoff`: `TBD`

---

#### studio-create-flow-review-submit

- `flowId`: `studio-create-flow-review-submit`
- `legacyRouteOrEntry`: `missing` — legacy Vite wizard submitted via Express; exact component unknown
- `userJob`: review keyword/format/angle selections and kick off generation
- `persona`: owner/editor
- `criticality`: P0
- `nextEquivalent`:
  - Wizard: `artifacts/marketing-persona-app/src/components/content-studio/create-content-modal.tsx`
  - Late steps: `artifacts/marketing-persona-app/src/components/content-studio/create-content-create-late-steps.tsx`
  - Hook: `artifacts/marketing-persona-app/src/components/content-studio/use-create-content-modal.ts`
  - Props: `artifacts/marketing-persona-app/src/components/content-studio/create-content-wizard-props.ts`
- `backendDependencies`:
  - same as `studio-generate-stream` (wizard submits to generate/stream endpoint)
- `stateDependencies`: wizard local state (React state via hook); session cookie
- `featureFlags`: none
- `behaviorParity`: `missing` — cannot confirm legacy wizard step parity without Vite source
- `deltaNotes`: Next wizard is multi-step modal; format/keyword/angle flow re-implemented in React with shared backend.
- `decision`: `port`
- `decisionOwner`: vineet
- `verification`:
  - [ ] Manual: walk through wizard → verify all steps render → submit triggers stream
  - [ ] `scripts/pilot-e2e-smoke-run.mjs` — covers create flow
 - `status`: `in-progress`
 - `signoff`: `TBD`

---

### Draft editing and quality

| flowId | persona | criticality | status |
|---|---|---|---|
| piece-editor-load-and-save | TBD | P0 | not-started |
| piece-humanize-trigger | owner/editor | P0 | in-progress |
| piece-enhance-trigger | TBD | P1 | not-started |
| piece-serp-score-refresh | TBD | P2 | not-started |
| piece-coverage-checklist-actions | TBD | P1 | not-started |
| piece-approval-status-transition | TBD | P1 | not-started |
| piece-planned-date-scheduling | TBD | P1 | not-started |
| piece-before-after-inspection | TBD | P1 | not-started |

### Publish and distribution

| flowId | persona | criticality | status |
|---|---|---|---|
| publish-dialog-preview-render | TBD | P1 | not-started |
| publish-dialog-wordpress-draft | owner/editor | P0 | in-progress |
| publish-dialog-wordpress-live | TBD | P2 | not-started |
| publish-dialog-wordpress-editor-mode-switch | TBD | P2 | not-started |
| publish-dialog-wordpress-output-mode-downgrade | TBD | P2 | not-started |
| publish-record-history-panel | TBD | P1 | not-started |
| publish-health-gate-block | TBD | P0 | not-started |
| social-queue-from-article | TBD | P2 | not-started |

### Integrations (initial subset)

| flowId | persona | criticality | status |
|---|---|---|---|
| integration-wordpress-plugin-connect | TBD | P0 | not-started |
| integration-wordpress-rest-connect | TBD | P0 | not-started |
| integration-wordpress-test-route | TBD | P1 | not-started |
| integration-wordpress-health-polling | TBD | P0 | not-started |
| integration-wordpress-capabilities-detect | TBD | P1 | not-started |
| integration-wordpress-editor-mode-detection | TBD | P1 | not-started |
| integration-ga4-connect-and-sync | TBD | P2 | not-started |
| integration-gsc-connect-and-sync | TBD | P2 | not-started |
| integration-semrush-byok | TBD | P2 | not-started |
| integration-social-accounts-connect | TBD | P2 | not-started |

## Parity inventory summary

| flowId | decision | status | evidence |
|---|---|---|---|
| studio-daily-five-batch-submit | port | in-progress | daily-five-validation.test.ts (unit), pilot-e2e-smoke-run.mjs (pending) |
| studio-generate-stream | port | in-progress | pilot-e2e-smoke-run.mjs (pending) |
| studio-create-flow-review-submit | port | in-progress | pilot-e2e-smoke-run.mjs (pending) |
| piece-humanize-trigger | port | in-progress | pilot-e2e-smoke-run.mjs (pending) |
| publish-dialog-wordpress-draft | port | in-progress | publish-reliability.test.ts (unit), wordpress-plugin-smoke.mjs (pending), pilot-e2e-smoke-run.mjs (pending) |

## Parity closure evidence

All flows above share these verification assets:

| Asset | Path | Covers |
|---|---|---|
| Pilot E2E smoke | `scripts/pilot-e2e-smoke-run.mjs` | create → generate → humanize → publish round-trip (pending run) |
| WP plugin smoke | `scripts/wordpress-plugin-smoke.mjs` | plugin health, draft publish, taxonomy sync (pending run) |
| Daily Five validation tests | `src/lib/content/daily-five-validation.test.ts` | URL parsing, item validity rules |
| Publish reliability tests | `src/lib/admin/publish-reliability.test.ts` | reliability scoring, alert thresholds |

Flows marked `behaviorParity: missing` lack legacy Vite UI confirmation but share identical backend functions with the Express routes they replace. Backend parity is confirmed by shared library usage (`@workspace/content-engine`).

## Next steps

1. Remaining P0 flows (auth, onboarding, integrations) need legacy Vite source access to fill records.
2. Fill `legacyRouteOrEntry` for flows that had Vite counterparts once source is available.
3. Decide `port` vs `retire` for uncovered flows as you audit.

