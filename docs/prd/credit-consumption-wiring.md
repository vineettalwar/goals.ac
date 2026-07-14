# PRD: Credit Consumption Wiring

## Problem

Stripe renewal grants credits to organization workspaces, but AI generation routes never debit the ledger. Count-based quotas (`usage_events` counts) are the only enforcement layer. Paid subscribers accrue credits that do not limit usage, making billing inaccurate and blocking a credit-metered product model.

## User story

As a **Growth/Scale subscriber** using the platform AI key, I want my monthly credit grant to reflect actual consumption so I understand usage limits and can upgrade or add BYOK when needed.

As a **platform operator**, I want every AI call to produce auditable ledger entries linked to `usage_events` so invoices and support can trace any debit.

## Success criteria

1. Every AI generation route (Next.js + worker) calls `prepareAiBilling` before invoking a model.
2. Platform-key calls on growth/scale pass **both** count quota and credit reserve checks.
3. Successful generations write `usage_events` and settle the reservation (`model_consumption` + `orchestration` for platform key; `orchestration` only for BYOK on paid plans).
4. Failed or aborted generations call `releaseReservation`.
5. Cached short-circuits (no AI call) skip billing entirely.
6. `pnpm run typecheck` passes.

## Scope in

- `lib/billing` pricing + consumption helpers, multi-line settlement
- `artifacts/marketing-persona-app/src/lib/ai-billing.ts` shared helper
- All AI generation Next.js routes (~27) + worker `contentGenerate` handler
- `GET /api/billing/credits` balance endpoint
- Client 402 handling for `insufficient_credits`
- Documentation updates

## Scope out

- Credit expiry, Stripe metered top-ups
- Settings UI credit balance display (API only in this pass)
- Legacy Express `api-server` routes
- Non-AI routes (`geo-audits`, credential tests, `tools/llms-txt`)

## Enforcement matrix (dual)

| Plan | Platform key | BYOK |
|---|---|---|
| **starter** | Count quota only | Free (no quota, no credits) |
| **growth / scale** | Count quota **and** credit reserve/settle | Orchestration credits only |

## Tier pricing (initial constants)

| Tier | Model credits |
|---|---|
| `strategy` | 15 |
| `planning` | 8 |
| `execution` | 5 |
| `rapid` | 1 |

| Orchestration | Credits |
|---|---|
| Platform key | 2 |
| BYOK | 1 |

## Technical approach

1. `estimateAiCallCredits` → `reserveCredits` before AI
2. `recordUsage` (returns `usageEventId`) → `settleAiCall` on success
3. `releaseAiCall` on failure / stream abort
4. Central `prepareAiBilling` / `completeAiBilling` / `cancelAiBilling` in app layer; worker imports billing lib directly

## Edge cases

- Org without workspace: `ensureWorkspaceForOrganization` auto-provisions
- Stream abort mid-generation: `finally` releases reservation
- Duplicate settle (retry): idempotent guard on `reservationRunId`
- Roadmap/content cache hits: no reserve, no settle
- Starter BYOK: skip all billing (dev-friendly)

## Open questions

- Tune tier credit costs after observing real usage (constants are starting estimates)
- When to retire count quotas after credit enforcement proves stable
