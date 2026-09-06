# Feature 5 — Rank tracking hardening

**Status:** Part A shipped (richer SERP-feature persistence) · **Index:** [openseo-integration-index.md](./openseo-integration-index.md)  
**Date:** 2026-09-06 · **Priority:** After Features 1–4

## Intent

Enhance existing `tracked_keywords` / `keyword_rank_snapshots` / DataForSEO organic path. Borrow OpenSEO ideas without UI rewrite:

- One-active-run guard per keyword (debounce)
- Richer SERP-feature JSON persistence
- Optional local location (national already works)

## Out of scope until prioritized

Full OpenSEO rank-tracker Workflow rewrite · DaisyUI rank UI.

## Sources

OpenSEO: `src/server/features/rank-tracking/`, `RankCheckWorkflow`.

---

## Part A — Richer serpFeatures persistence

**Status:** Pending / may land in parallel

Persist the full SERP-feature JSON from DataForSEO into `keyword_rank_snapshots.serpFeatures` (currently stored as raw provider response). No schema changes required — `serpFeatures` column is `jsonb`.

## Part B — One-active-run / debounce guard

**Status:** Shipped · **Date:** 2026-09-06

### Problem

A daily cron sweep enqueues a job for every active tracked keyword. If a manual enqueue fires close to cron time, or cron runs twice, the same keyword gets checked twice within minutes — wasting SERP credits and producing duplicate snapshots.

### Solution (minimal — no new DB table)

Pure helper `lib/jobs/src/handlers/keyword-rank-debounce.ts`:

```ts
shouldSkipRankCheck(lastCheckedAt, now?, windowMs?): boolean
```

Returns `true` when `lastCheckedAt` is within the last 45 minutes.

**Guard applied in two places** (`keywordRankCheck.ts`):

1. **`checkSingleKeyword`** — after fetching the row, before calling the SERP provider. Logs skip and returns early.
2. **`sweepAllKeywords`** — before `enqueue`. Sweep query now selects `lastCheckedAt`; keywords checked within the window are not re-enqueued.

### Trade-offs

- 45-minute window is a configuration constant (default) — callers can pass a different `windowMs`.
- No distributed lock or unique DB index. `ponytail:` ceiling — if pg-boss is running multiple workers in parallel and two jobs fire simultaneously for the same keyword within the debounce window, both would pass the guard (race window ≈ single DB round-trip). Upgrade path: unique partial index on `(trackedKeywordId, date_trunc('hour', checked_at))` in `keyword_rank_snapshots`.
- Test file: `keyword-rank-debounce.test.ts` (4 vitest assertions, no fixtures).

### Files changed

| File | Change |
|---|---|
| `lib/jobs/src/handlers/keyword-rank-debounce.ts` | New — pure helper |
| `lib/jobs/src/handlers/keyword-rank-debounce.test.ts` | New — 4 vitest assertions |
| `lib/jobs/src/handlers/keywordRankCheck.ts` | Guard in `checkSingleKeyword` + sweep debounce |
| `docs/prd/feature-5-rank-tracking-hardening.md` | This update |
