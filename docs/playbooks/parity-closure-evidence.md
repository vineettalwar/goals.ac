# Parity closure evidence

Evidence inventory for the Vite → Next migration. Links to the canonical tracker and lists what has been verified, what is in-progress, and what evidence artifacts exist.

> **Status:** This document is a **template assembled from code inspection** — not from a live staging run. Update fields as flows are exercised and signed off.

## Canonical tracker

[docs/migration/vite-next-parity.md](../migration/vite-next-parity.md) — full flow catalog with per-flow status, decision, and signoff fields.

## Summary snapshot

| Criticality | Total flows | Verified | In-progress | Not started |
|---|---|---|---|---|
| P0 | ~25 | 0 | 5 (`studio-daily-five-batch-submit`, `studio-generate-stream`, `studio-create-flow-review-submit`, `piece-humanize-trigger`, `publish-dialog-wordpress-draft`) | ~20 |
| P1 | ~14 | 0 | 0 | ~14 |
| P2 | ~8 | 0 | 0 | ~8 |

### In-progress flows

| flowId | Next equivalent | Notes |
|---|---|---|
| `studio-daily-five-batch-submit` | `/projects/[id]/daily-five` + `/api/website-projects/[id]/content-pieces/daily-five` | UI + batch API landed; unit tests passed; pilot E2E smoke pending |
| `studio-generate-stream` | `.../content-pieces/generate/stream` + content-studio wizard | Streaming wizard + backend wiring landed; unit evidence only; pilot E2E smoke pending |
| `studio-create-flow-review-submit` | content-studio wizard submit modal | Wizard submit wiring landed; unit evidence only; pilot E2E smoke pending |
| `piece-humanize-trigger` | `/content-pieces/[id]/humanize` (+ revert) | Backend endpoint wiring landed; unit evidence only; pilot E2E smoke pending |
| `publish-dialog-wordpress-draft` | `/content-pieces/[id]/publish` (wordpress draft) | Publish reliability unit tests passed; WP plugin smoke + pilot E2E smoke pending |

## Evidence artifacts

### Unit / integration tests (existing)

Tests that exercise pilot-critical paths. All runnable via `pnpm vitest run <path>`.

| Test file | Covers |
|---|---|
| `lib/content-engine/src/content/news-source-guard.test.ts` | News source-URL requirement gate |
| `lib/content-engine/src/adapters/wordpress-taxonomy.test.ts` | WP category/tag term-ID resolution |
| `artifacts/marketing-persona-app/src/lib/content/daily-five-validation.test.ts` | Daily Five input validation |
| `artifacts/marketing-persona-app/src/lib/admin/publish-reliability.test.ts` | Publish reliability admin view |
| `lib/connectors/src/goals-ac-plugin.test.ts` | Plugin connector (HMAC health/publish) |
| `lib/content-engine/src/brand/project-voice-ready.test.ts` | Brand voice readiness gate |
| `lib/billing/src/quotas.test.ts` | Quota enforcement |
| `lib/billing/src/plans.test.ts` | Plan lookup (Scale, etc.) |
| `lib/security/src/encryption.test.ts` | AES-256-GCM key encryption |

### Typecheck

```sh
pnpm run typecheck   # full monorepo tsc --build
```

Last known result: **not yet captured** — run and paste exit code + timestamp here.

### Smoke scripts

| Script | Purpose | Run against |
|---|---|---|
| `scripts/wordpress-plugin-smoke.mjs` | WP plugin health / publish / taxonomy / media | Staging WP instance |
| `scripts/pilot-e2e-smoke-run.mjs` | Full pilot lifecycle (generate → humanize → publish) | Next app + staging WP |
| `scripts/parity-smoke.mjs` | Vite → Next route parity checks | Next app |

All scripts are **templated and ready to run** but have **not been executed against a live staging environment** as of this writing.

## How to close a flow

1. Locate the flow in `vite-next-parity.md`.
2. Exercise the flow manually or via the relevant smoke script.
3. Set `status: verified`, add `signoff: YYYY-MM-DD <name>`.
4. Update the summary table above.

## Signoff log

| Date | Approver | Flows verified | Notes |
|---|---|---|---|
| *(none yet)* | | | |
