# Feature 4 — GSC URL Inspection

**Status:** Shipped (lib + Next + CF) · **Index:** [openseo-integration-index.md](./openseo-integration-index.md)  
**Date:** 2026-09-06 · **Depends on:** Existing GSC OAuth (`search_property_connections`)

## Problem

GSC Search Analytics shows queries and clicks. After WordPress publish there is no automated check that Google sees the URL as indexable. OpenSEO exposes URL Inspection via MCP (`inspect_urls`).

## User story

As a publisher, after a successful CMS publish (or from Performance), I can inspect `published_url` and see coverage / indexing state without leaving goals.ac.

## Success criteria

1. Call Google Search Console URL Inspection API with stored OAuth tokens.
2. Persist last inspection result on publish record or a small `gsc_url_inspections` table.
3. Surface on Performance tab and/or publish history.
4. Optional post-publish hook (async job) for WordPress publishes only in v1.
5. Rate-limit inspections; never block the publish path on Inspection failure.

## Shipped

| Piece | Where |
|---|---|
| Client | `lib/seo-tools/src/gscUrlInspection.ts` |
| Service | `lib/content-engine/src/analytics/gsc-url-inspection-service.ts` |
| Schema | `gsc_url_inspections` — PG `0078` / D1 `0013` |
| Job | `QUEUES.gscUrlInspection` → `processGscUrlInspection` |
| API | `GET/POST …/gsc-url-inspections` (Next + CF gateway/read/write) |
| Post-publish hook | WordPress-only via `enqueueGscUrlInspectionAfterPublish` (Next + job publish) |
| Rate limit | 60 min per project+URL |
| UI | Performance Indexing column + Publish History badge/Inspect |

## Scope out

- Discover/News dimension expansion (nice follow-up)
- Bulk inspect entire sitemap
- MCP `inspect_urls` tool (follow-on)

## Kill condition

If URL Inspection quota or OAuth scopes are missing from current GSC connect flow, extend OAuth scopes first — do not silently no-op.  
**Resolved:** existing `webmasters.readonly` matches OpenSEO; no OAuth change required.

## Sources

OpenSEO MIT: GSC URL Inspection usage; Google Search Console URL Inspection API docs.

## Verify

```sh
pnpm --filter @workspace/db run migrate   # 0078
npx vitest run lib/seo-tools/src/gscUrlInspection.test.ts
# With GSC connected: Performance → Inspect on a published URL → coverage badge
# Or publish to WP → async inspection enqueued
```
