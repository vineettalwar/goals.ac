# Vite removal checklist — cutover & rollback

This checklist governs the decision to stop running the legacy Vite app and operate on Next only. It is the operator-facing complement to the [parity tracker](./vite-next-parity.md).

## Honest status of evidence

| Category | Status | Notes |
|---|---|---|
| Parity tracker records | **Templated + 5 verified** | 5 P0 flows have full records with signoff. Remaining P0/P1 flows are seed rows only (TBD fields). |
| Smoke scripts | **Created, not yet run against staging** | `scripts/pilot-e2e-smoke-run.mjs`, `scripts/wordpress-plugin-smoke.mjs` exist. Outputs not yet captured. |
| Daily Five validation | **Unit tests written** | `src/lib/content/daily-five-validation.test.ts` — not yet run in CI (no CI exists). |
| Publish reliability | **Unit tests written** | `src/lib/admin/publish-reliability.test.ts` — covers scoring + alert thresholds. |
| Legacy Vite UI confirmation | **Not possible** | Several flows have `behaviorParity: missing` because legacy Vite source is unavailable for comparison. Backend parity confirmed via shared `@workspace/content-engine` usage. |

---

## 1 — Parity signoff gate

Cutover is **blocked** until all of these are true:

- [ ] **No P0 items in `missing` status.** Every P0 row in [`vite-next-parity.md`](./vite-next-parity.md) must have `status: verified` with a `signoff` date and approver.
- [ ] **No P1 items in `missing` status for pilot-critical flows.** At minimum: `studio-generate-cache-hit`, `publish-dialog-preview-render`, `publish-record-history-panel`.
- [ ] **All `behaviorParity: missing` flows** have a written delta note explaining why UI parity cannot be confirmed and confirming backend equivalence.
- [ ] **Smoke scripts have been run at least once on a staging tenant** with captured terminal output saved to a file or pasted into the pilot scorecard.

### Evidence checklist — what constitutes parity closure

Each checked box requires a linked artifact, not a verbal assertion.

- [ ] `scripts/pilot-e2e-smoke-run.mjs` exits 0 on staging (save output to `docs/evidence/pilot-smoke-<date>.txt`)
- [ ] `scripts/wordpress-plugin-smoke.mjs` exits 0 on WP staging (save output)
- [ ] `src/lib/content/daily-five-validation.test.ts` passes (`npx vitest run src/lib/content/daily-five-validation.test.ts`)
- [ ] `src/lib/admin/publish-reliability.test.ts` passes (`npx vitest run src/lib/admin/publish-reliability.test.ts`)
- [ ] `publish_records` query for pilot project shows 0 failed rows in last 24h (paste SQL output)
- [ ] Admin → Publish reliability panel loads without error for the pilot org
- [ ] Manual Daily Five: submit 5 items → 5 `content_pieces` rows created → 5 WP drafts land with correct categories
- [ ] Manual humanize: humanize a generated piece → `preHumanizeBody` stored → revert restores original
- [ ] Parity inventory summary table in [`vite-next-parity.md`](./vite-next-parity.md) has no `status: not-started` P0 rows

---

## 2 — Cutover steps (operator runbook order)

Execute in this order. Each step has a go/no-go before proceeding.

### Step 1: Pre-cutover smoke (day −1)

```sh
# WP plugin health
WP_SITE_URL=https://staging.example.com WP_SITE_KEY=... node scripts/wordpress-plugin-smoke.mjs

# Full lifecycle smoke
BASE_URL=http://localhost:3001 \
  AUTH_COOKIE="next-auth.session-token=..." \
  PROJECT_ID=123 \
  SOURCE_URLS="https://example.com/source-1" \
  node scripts/pilot-e2e-smoke-run.mjs
```

**Go/no-go:** both scripts exit 0. Save outputs.

### Step 2: Redirect-only mode

- Keep Vite running but route all user navigation to Next equivalents.
- Validate deep links (query params) still land on the correct Next entry points.
- Monitor for 404s or broken redirects in server logs for 2–4 hours.

**Go/no-go:** zero user-reported navigation failures after 2 hours.

### Step 3: Operator sanity pass

- In the Next app, run a real Daily Five batch on the pilot org (not a test org).
- Confirm publish produces a WordPress draft with correct taxonomy mapping.
- Check Admin → Publish reliability — no new failures.

**Go/no-go:** all 5 pieces published as drafts with correct categories.

### Step 4: Disable non-critical Vite paths

- Remove Vite links from navigation.
- Leave a documented "retired endpoints" fallback accessible at the old URLs for 72 hours (returns a redirect to Next, not a 404).

### Step 5: Enable Next-only

- Set the rollback switch (env var or feature flag) to `VITE_FALLBACK=disabled`.
- Vite process stays deployed but unreachable for 72 hours (rollback window).
- After 72 hours with no rollback trigger, tear down Vite deployment.

---

## 3 — Rollback steps (if Next fails within 72 hours)

If a production blocker appears after cutover, follow these steps in order:

| # | Action | How | Time |
|---|---|---|---|
| 1 | **Re-enable Vite access** | Set `VITE_FALLBACK=enabled` (or revert redirect rules). Vite process is still deployed during the 72h window. | < 5 min |
| 2 | **Disable broken Next endpoints** | If the failure is in a specific Next API route, add a `maintenance: true` guard to that route and redeploy. Do not disable all of Next — only the broken path. | < 15 min |
| 3 | **Notify pilot operator** | Message the operator: "Using legacy flow for [specific action] while we fix. Other flows remain on Next." | Immediately |
| 4 | **Log the blocker** | Reopen the specific `flowId` in [`vite-next-parity.md`](./vite-next-parity.md) — set `status: in-progress`, add a `deltaNotes` entry describing the failure. | < 10 min |
| 5 | **Continue writing through canonical Next APIs where possible** | Only route the broken flow through Vite. Do not wholesale revert to Vite for everything. | Ongoing |
| 6 | **Fix and re-verify** | Fix the root cause, re-run the relevant smoke script, update the parity tracker, get signoff. | Varies |
| 7 | **Re-attempt cutover** | Restart from Step 2 above. The 72h rollback window resets. | — |

### What triggers a rollback

- Any `publish_records` failure rate > 5% over a 1-hour window for the pilot org.
- Any P0 flow that returns 5xx or produces incorrect data.
- Editor reports ≥ 2 pieces with structural/factual issues not present in the Vite workflow.
- Operator cannot complete a Daily Five cycle within 60 minutes (2x the target).

### What does NOT trigger a rollback

- Cosmetic UI differences (different spacing, icon changes) — log as P2, fix later.
- `behaviorParity: missing` flows where backend is confirmed equivalent — these were accepted at signoff.
- Transient Gemini model timeouts (these are provider issues, not Vite-vs-Next regressions).

---

## 4 — Evidence to attach to the cutover decision

Before signing off on cutover, the operator collects and links:

| Evidence | Source | Status |
|---|---|---|
| Parity tracker snapshot | [`vite-next-parity.md`](./vite-next-parity.md) § Parity inventory summary | All P0 rows `verified` |
| Pilot E2E smoke output | `scripts/pilot-e2e-smoke-run.mjs` terminal capture | Exit 0 |
| WP plugin smoke output | `scripts/wordpress-plugin-smoke.mjs` terminal capture | Exit 0 |
| Daily Five validation tests | `npx vitest run src/lib/content/daily-five-validation.test.ts` | Pass |
| Publish reliability tests | `npx vitest run src/lib/admin/publish-reliability.test.ts` | Pass |
| `publish_records` failure rate (24h) | SQL query or Admin → Publish reliability panel | 0 failures |
| Admin plan/quota override | Manual verification (set plan, verify quota label) | Confirmed |
| Incident simulation | `scripts/incident-simulation.mjs` output per [pilot scorecard](../playbooks/pilot-scorecard-and-runbook.md) § Publish incident simulation | Fail + recover captured |

---

## 5 — Post-cutover monitoring (first 72 hours)

- [ ] Check `publish_records` failure rate every 4 hours (SQL or Admin panel).
- [ ] Run `scripts/pilot-e2e-smoke-run.mjs` once per day during the 72h window.
- [ ] Confirm operator Daily Five completes in ≤ 30 min.
- [ ] After 72 hours with no rollback trigger: tear down Vite deployment, archive this checklist as complete.

---

## References

- [Vite → Next parity tracker](./vite-next-parity.md) — flow-level mapping, verification records, parity closure evidence
- [Pilot scorecard & operator runbook](../playbooks/pilot-scorecard-and-runbook.md) — pass/fail criteria, failure-class response, incident log
- [Vegan magazine go-live playbook](../playbooks/vegan-magazine-go-live.md) — customer-specific setup, Daily Five workflow, premortem checklist
- Scripts: `scripts/pilot-e2e-smoke-run.mjs`, `scripts/wordpress-plugin-smoke.mjs`, `scripts/incident-simulation.mjs`
- Tests: `src/lib/content/daily-five-validation.test.ts`, `src/lib/admin/publish-reliability.test.ts`
