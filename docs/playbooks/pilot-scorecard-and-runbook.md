# Pilot scorecard & operator runbook

Defines pass/fail for any pilot customer. Criteria are reliability and operator cost — not day-count. A pilot that runs 60 days at 100 % delivery is passing; a pilot that fails 3 publishes in week 1 is not.

## Scorecard fields

Record one row per pilot week (or per incident, whichever comes first).

| Field | Source | Notes |
|---|---|---|
| `publish_success_rate` | `publish_records` table or Admin → Publish reliability | Target ≥ 98 %. Count = succeeded / (succeeded + failed) for the period. |
| `draft_accuracy` | Editor feedback (manual) | Did the WP draft require only minor copy-edits, or did the editor reject for factual / structural issues? Binary pass/fail per piece; target ≥ 90 % pass. |
| `operator_minutes_per_day` | Operator self-report | Time spent on Daily Five entry + publish monitoring + incident response. Target ≤ 30 min/day once ramped. |
| `generation_errors` | Application logs (`pino` JSON, `level: 50`) | Count of 5xx or model-timeout errors during generate. Target: 0 per day. |
| `brand_voice_drift` | Editor feedback (manual) | Does output still sound like the magazine after ≥ 50 pieces? yes/no. |
| `incident_count` | This runbook's incident log | Number of operator interventions that required code change or config fix. |

### Pass / fail criteria

| Criterion | Pass | Fail |
|---|---|---|
| Publish success rate | ≥ 98 % over any rolling 7-day window | < 95 % over any rolling 7-day window |
| Draft accuracy | ≥ 90 % pieces accepted with minor edits | < 80 % pieces accepted |
| Operator cost | ≤ 30 min/day average over a week | > 60 min/day average over a week |
| Generation errors | ≤ 1 per week (transient, auto-recovered) | ≥ 3 per week or any data-loss error |
| Brand voice drift | Editor says "yes, sounds like us" | Editor flags systemic tone mismatch |

**No day-count gate.** A pilot passes when all five criteria hold for two consecutive weeks at steady-state volume, regardless of calendar duration.

## Throughput policy — no artificial cap

The platform does not impose an artificial per-day or per-month article cap for Scale plan customers with BYOK.

- `articlesPerMonth` is set to `null` for Scale.
- Rate limit is ~10 generations per user per minute (Gemini quota, not a business rule).
- If the customer wants 10 drafts/day instead of 5, the platform supports it. Operator capacity and editor review bandwidth are the real constraints, not software limits.
- Autopilot (strategy-calendar) generates at most 1 piece/day — this is a product design choice, not a throughput cap. Manual Daily Five has no batch-size ceiling beyond the generation rate limit.

## Logging & evidence requirements

Every scorecard row must link to evidence. No "it felt fine" entries.

| Evidence type | Where to find it | Retention |
|---|---|---|
| Publish success/failure | `publish_records` table: `status`, `error_message`, `created_at` | DB lifetime |
| Generation logs | Pino JSON stdout (filter `level >= 40`) | Container/host log retention policy |
| WP plugin health | `GET /goals-ac/v1/health` response | Point-in-time; run before each batch |
| Editor feedback | Shared doc or Slack thread (link in scorecard row) | Operator responsibility |
| Smoke test results | `scripts/pilot-e2e-smoke-run.mjs` output (once created) | Operator saves terminal output or pipes to file |

### Pre-batch checklist (daily)

- [ ] WP plugin health returns 200 + expected version
- [ ] BYOK key valid (generate a throwaway test or check Settings → Integrations → AI status)
- [ ] No failed publishes in Admin → Publish reliability for this project since last check

## Operator runbook — next action per failure class

### F1: Publish fails (WP returns 4xx/5xx)

| Step | Action |
|---|---|
| 1 | Check `publish_records.error_message` for the failed row. |
| 2 | If 401/403: WP plugin site key rotated or plugin deactivated. Re-check WP Plugins page → re-enter site key in project settings. |
| 3 | If 404 on category: category slug doesn't match WP taxonomy. Fix section name in Daily Five to match an existing WP category, or create the category in WP. |
| 4 | If 5xx from WP: WP hosting issue. Check WP site health (`/wp-admin/site-health.php`). Retry publish from publish history. |
| 5 | If timeout: increase WP `max_execution_time` or check hosting resource limits. Retry. |

### F2: Generation error (model timeout or 5xx)

| Step | Action |
|---|---|
| 1 | Check Pino logs for the error. Filter: `level: 50`, look for `model_error` or `timeout`. |
| 2 | If Gemini quota exceeded: customer's BYOK key hit rate limit. Wait 60s and retry, or reduce batch concurrency. |
| 3 | If model returns malformed output: retry once. If repeats, note the keyword + section and file a bug. |
| 4 | If platform 5xx: check API server health. Restart if needed (`docker compose restart`). |

### F3: Draft accuracy below threshold

| Step | Action |
|---|---|
| 1 | Collect rejected pieces from editor with rejection reason. |
| 2 | If factual errors in news: verify source URLs were provided in Daily Five. News pieces without source URLs are expected to hallucinate — this is operator error, not a platform bug. |
| 3 | If tone mismatch: re-index brand voice (`POST /api/website-projects/{id}/brand-voice/resync-cms`). Add more sample articles if index is thin (< 5 sources). |
| 4 | If structural issues (wrong heading style, FAQ where none wanted): check content format settings. Adjust format or template if available. |

### F4: Brand voice drift

| Step | Action |
|---|---|
| 1 | Ask editor to flag 3 specific pieces where tone drifted. |
| 2 | Re-run brand voice resync from CMS. |
| 3 | If drift persists after resync: upload 3–5 recent published articles as explicit voice samples. |
| 4 | If still drifting: file a bug with the flagged pieces + brand voice index contents. |

### F5: Operator cost exceeds threshold

| Step | Action |
|---|---|
| 1 | Identify which step takes the most time (Daily Five entry? Publish monitoring? Incident response?). |
| 2 | If Daily Five entry: check whether topics can be batched more efficiently, or whether a CSV/paste import would help (P1 candidate). |
| 3 | If publish monitoring: automate with the pilot smoke script once `pilot-e2e-smoke-run` is available. |
| 4 | If incident response: root-cause the incidents (F1–F4 above) to reduce frequency. |

## Honest claims — what the platform does and does not do

- **Does:** Generate SEO-optimized drafts from operator-supplied topics and source URLs, push them to WordPress as **drafts**, apply brand voice styling, handle taxonomy mapping.
- **Does not:** Auto-publish live. Fact-check news content. Crawl the web for sources. Replace editorial review.
- **News workflow is draft-only.** Every news piece lands in WP as `status: draft`. The customer's editor verifies facts, quotes, and numbers before publishing in WordPress. This is by design and not a temporary limitation.
- **No Sentry requirement.** Monitoring uses `publish_records` queries + Pino logs + Admin → Publish reliability panel. Sentry is a P1-deferred item (see [vegan-magazine-p1-deferred.md](./vegan-magazine-p1-deferred.md)).

## Smoke test

Run the end-to-end pilot smoke before first real batch and after any config change:

```sh
# Once pilot-e2e-smoke-run script is created:
WP_SITE_URL=https://staging.example.com \
  WP_SITE_KEY=... \
  PROJECT_ID=123 \
  node scripts/pilot-e2e-smoke-run.mjs
```

Until that script exists, use the existing WordPress plugin smoke:

```sh
WP_SITE_URL=https://staging.example.com WP_SITE_KEY=... node scripts/wordpress-plugin-smoke.mjs
```

## Publish incident simulation (failure + recovery)

Runs a controlled end-to-end publish incident against one pilot project:

1. Create a fresh content piece via `POST /api/website-projects/{id}/content-pieces`.
2. Force a deterministic publish failure by calling:
   - `POST /api/content-pieces/{pieceId}/publish` with an intentionally invalid `wordpressConnectionId`
   - expected failure: `publish_records.status = 'failed'` with `error_message` containing `WordPress connection not found`
3. Recover by republishing the same `pieceId` using the normal WordPress payload:
   - `POST /api/content-pieces/{pieceId}/publish` with `{ platform: "wordpress" }`
   - expected recovery: `publish_records.status = 'published'`

### Procedure

```sh
AUTH_COOKIE="session=..." \
PROJECT_ID=123 \
BASE_URL=https://app.goals.ac \
  node scripts/incident-simulation.mjs
```

Defaults:
- `BASE_URL` falls back to `http://localhost:3001`.
- The forced invalid `wordpressConnectionId` defaults to `2147483647` (override via `INVALID_WP_CONNECTION_ID` if needed).

### Evidence to capture

Save the script output (it prints the key `pieceId` + publish-record IDs).
In addition, capture a DB snippet for auditability (run immediately after the script completes):

```sql
SELECT
  id,
  content_piece_id,
  provider,
  connection_id,
  status,
  error_message,
  created_at,
  published_at,
  remote_url
FROM publish_records
WHERE website_project_id = <PROJECT_ID>
  AND content_piece_id = <pieceId>
ORDER BY created_at DESC
LIMIT 10;
```

What you should see:
- At least one row with `status = 'failed'` and the deterministic `error_message`.
- At least one row with `status = 'published'` after the recovery call.

## Incident log template

Append to this section or a linked doc per incident.

```
### YYYY-MM-DD — <short title>
- **Class:** F1 / F2 / F3 / F4 / F5
- **Impact:** <pieces affected, time lost>
- **Root cause:** <one line>
- **Resolution:** <what was done>
- **Evidence:** <link to publish_records query, log snippet, or editor note>
- **Prevention:** <config change, code fix, or process tweak>
```
