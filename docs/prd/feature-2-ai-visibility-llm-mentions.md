# Feature 2 — Real AI Visibility (DataForSEO LLM Mentions)

**Status:** Shipped (lib + Next) · **Index:** [openseo-integration-index.md](./openseo-integration-index.md)  
**Date:** 2026-09-06 · **Depends on:** `DATAFORSEO_LOGIN` + `DATAFORSEO_PASSWORD`

## Problem

[`llmVisibilityChecker.ts`](../../lib/seo-tools/src/llmVisibilityChecker.ts) role-plays ChatGPT/Perplexity/Claude/Gemini via our own LLM. Metrics are useful demos but not real mention/citation data. Partners selling “AI visibility” will discover the simulation.

## User story

As a project owner, I can run a brand lookup against live LLM Mentions / AI Overview data and see share-of-voice vs named competitors, with UI that clearly labels **live API** vs **simulated** fallback.

## Success criteria

1. DataForSEO AI Optimization client in `lib/serp-provider` (brand lookup + share of voice).
2. Dual path: live when creds present; simulated path retained and labeled.
3. Cost estimate shown when live; live only when DataForSEO env configured (platform BYOK).
4. `/search/visibility` surfaces live results without inventing engines we did not call.
5. Unit tests for response shaping.

## Shipped

| Piece | Where |
|---|---|
| Mentions client + SoV | `lib/serp-provider/src/llm-mentions.ts`, `share-of-voice.ts` |
| Tests (15) | `npx vitest run lib/serp-provider/src/llm-mentions.test.ts lib/content-engine/src/strategy/live-visibility-snapshots.test.ts` |
| Snapshot `source` | migration PG `0077` / D1 `0012` |
| Dual-path service | `lib/content-engine/src/strategy/llm-visibility-service.ts` |
| Live row shaping | `live-visibility-snapshots.ts` |
| API fields | `dataMode`, `llmMentionsConfigured`, `brandLookupCostEstimateUsd` (live engines only when live) |
| UI | Live API / Simulated badges + per-row source on `/search/visibility` |

**Cost control (kill condition):** live path only runs when DataForSEO env creds are set. UI shows ~$0.20–$0.40 estimate. Without credentials, falls back to simulated.

**Live engines claimed:** ChatGPT + Google AI Overview only (snapshot engines `chatgpt` / `gemini`). Perplexity/Claude remain simulated-only.

## Scope out (still)

- Prompt Explorer / cited sources tables
- MCP tools (Feature 3)
- Per-org encrypted DataForSEO key store (platform env only for now)

## Sources

OpenSEO MIT: `src/server/lib/dataforseo/ai.ts`, `features/ai-search/services/*`

## Verify

```sh
npx vitest run lib/serp-provider/src/llm-mentions.test.ts
pnpm --filter @workspace/db run migrate   # applies 0077
# With DATAFORSEO_LOGIN/PASSWORD set: Run check on /search/visibility → badge "Live API"
```
