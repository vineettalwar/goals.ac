# Feature 6 — Backlinks overview

**Status:** Shipped (lib + Next) · **Index:** [openseo-integration-index.md](./openseo-integration-index.md)  
**Date:** 2026-09-06 · **Depends on:** DataForSEO platform creds (`DATAFORSEO_LOGIN` / `DATAFORSEO_PASSWORD`)

## Problem

Strategy/briefs have no off-site authority signal. Site audit covers on-site links; GSC covers indexing. Referring-domain / backlink volume is missing for context.

## User story

As a marketer, on Search → Site I can pull a DataForSEO backlinks overview for the project domain (summary counts + top referring domains) without leaving goals.ac.

## Success criteria

1. DataForSEO client: summary + top referring domains (max 10); MIT attribution to OpenSEO.
2. Creds reuse existing DataForSEO env; kill/no-op when unset (honest empty state).
3. `POST /api/website-projects/:id/backlinks` fetches live; no persistent CRM table in v1.
4. Thin panel on Search → Site.
5. Unit tests with mocked fetch.

## Shipped

| Piece | Where |
|---|---|
| Client + tests (8) | `lib/serp-provider/src/backlinks.ts` |
| API | `POST …/website-projects/[id]/backlinks` |
| UI | Search → Site → `BacklinksOverviewPanel` |

## Scope out

- Ahrefs DR scrape
- Link-building CRM / outreach
- Historical timeseries charts
- MCP backlinks tools (follow-on)

## Kill condition

If DataForSEO backlinks endpoints require a separate paid module and platform keys cannot call them, keep the panel in "not configured / billing" empty state — do not scrape Ahrefs.

## Sources

OpenSEO MIT: `src/server/lib/dataforseo/backlinks.ts`

## Verify

```sh
npx vitest run lib/serp-provider/src/backlinks.test.ts
# With DataForSEO keys: Search → Site → Refresh backlinks
```
