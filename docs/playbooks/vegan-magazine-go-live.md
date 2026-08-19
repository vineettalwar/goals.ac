# Vegan business magazine — go-live playbook

First paying customer profile: WordPress magazine, mix of daily news + evergreen features, ~5 drafts per weekday (~150/month). **Contract language:** five WordPress **drafts from their researched topics** — not five unattended live posts.

## Account setup (ops, no code)

1. **Plan:** Admin → Organizations → set plan to **Scale** (`PATCH /api/admin/organizations/plan`).
2. **BYOK required:** Settings → Integrations → AI → add Gemini or Bedrock API key. Scale has unlimited article count but no platform-key credit grant; BYOK skips quota and credit blocks.
3. **Quota override (optional):** Admin → Plans → set `articlesPerMonth` null for Scale if needed.
4. **Autopilot:** Leave **disabled**, or set `publishMode: draft` for at most one evergreen bonus piece/day. Never `publishMode: live` for this customer.
5. **Editor seat:** Invite their reviewer as **editor** (owner keeps billing/admin).

## WordPress connect

1. Install goals.ac WordPress plugin **0.1.0** (zip from `cms-plugins/wordpress`, not wordpress.org).
2. Project → Integrations → WordPress → **Plugin (HMAC)** connect with site URL + site key.
3. Confirm health tile green (`GET /goals-ac/v1/health`) and Yoast/Rank Math detected if installed.

Run smoke before first real article:

```sh
WP_SITE_URL=https://staging.example.com WP_SITE_KEY=... node scripts/wordpress-plugin-smoke.mjs
```

Optional hardening flags you can toggle during staging:

```sh
# Idempotency replay (same X-Idempotency-Key twice)
WP_SMOKE_IDEMPOTENCY=1

# Test category resolution via numeric ID (if term id is found in site-graph)
WP_SMOKE_TAXONOMY_ID_TEST=1

# Optional featured-image path (requires base64 payload from your pipeline)
WP_SMOKE_MEDIA_UPLOAD=1 \
  WP_SMOKE_MEDIA_BASE64=... \
  WP_SMOKE_MEDIA_FILENAME=featured.webp \
  WP_SMOKE_MEDIA_MIME_TYPE=image/webp
```

## Brand voice lock

1. Run brand scrape on their live magazine URL (project settings → re-scan, or onboarding fast-lane).
2. Pull CMS posts into voice index:

```sh
PROJECT_ID=123 AUTH_COOKIE="..." node scripts/import-magazine-brand-voice.mjs
```

Or in-app: `POST /api/website-projects/{id}/brand-voice/resync-cms` (requires WP plugin connected).

3. Upload 3–5 pasted sample articles if site-graph excerpts are too short: Settings → Brand voice → upload `.md` or paste text (min 80 chars each).

## Daily workflow — five drafts from your topics

**Do not promise autopilot.** Autopilot generates **one** piece per day from the strategy calendar.

### Morning (their research → your queue)

Use `Daily Five` in project Content Studio:

1. Set default section (usually `News` for the morning run).
2. Add up to 5 topics with:
   - keyword
   - section
   - notes
   - source URLs (required for News)
3. Generate batch drafts.

**News safety:** News topics must include at least one source URL in Daily Five before generate. Always publish to WordPress as **draft**; their editor verifies numbers and quotes before going live in WP.

**WordPress sections:** Section values must match existing WP category names. Taxonomy names resolve to term IDs via site-graph at publish.

### Generate → review → publish draft

1. Run Daily Five batch generation.
2. For each draft: **Humanize** → Fix gaps if needed.
3. Queue WordPress draft publish (async) or use publish dialog manually.
4. Confirm featured image + SEO meta in WP admin (Yoast/Rank Math fields).
5. Their editor publishes from WordPress when ready.

### Rate limits

Platform allows ~10 generations per user per minute — enough for five sequential pieces without bulk automation.

## SLA (until Sentry ships)

Daily ops check:

```sql
-- failed publishes in last 24h for this project
SELECT * FROM publish_records WHERE website_project_id = ? AND status = 'failed' AND created_at > now() - interval '1 day';
```

Or Integrations → Publishing → publish history in-app.
Or use the platform-wide operational view: `Admin → Publish reliability` (shows failed `publish_records` in the last 24h for pilot orgs, plus optional background job failure counts when available).

## Explicitly out of scope for launch

- Autopilot at 5/day
- Self-serve Growth checkout as primary contract
- Live web grounding / news crawler
- Native WordPress `future` scheduled status (use WP scheduler after draft lands)
- Hosted blog, backlink exchange, Surfer NLP

See [vegan-magazine-p1-deferred.md](./vegan-magazine-p1-deferred.md) for post-payment build candidates.
See [pilot-scorecard-and-runbook.md](./pilot-scorecard-and-runbook.md) for pass/fail criteria, operator runbook, and throughput policy.
See [parity-closure-evidence.md](./parity-closure-evidence.md) for Vite → Next migration verification status and evidence artifacts.
See [wp-staging-verification-evidence.md](./wp-staging-verification-evidence.md) for WordPress staging smoke-test template and captured outputs.

## Pilot E2E smoke run

Full lifecycle smoke (generate → humanize → publish → confirm) via the Next API endpoints. Respects all gating: brand voice required, quota, rate limits.

```sh
BASE_URL=http://localhost:3001 \
  AUTH_COOKIE="next-auth.session-token=..." \
  PROJECT_ID=123 \
  SOURCE_URLS="https://example.com/source-1,https://example.com/source-2" \
  node scripts/pilot-e2e-smoke-run.mjs
```

Optional overrides:

| Env var | Purpose |
|---|---|
| `TOPICS_JSON` | Custom topics array: `[{formatType, targetKeyword, angleHint}, ...]` |
| `WP_SECTION` | Section hint (default `news`) |
| `SOURCE_URLS` | Comma/newline-separated source URLs embedded in angleHint |

**Expected output (evidence to capture):**

```
Pilot E2E smoke → http://localhost:3001 project=123
── Step 1: WordPress health check
[OK] WP health → staging.example.com
── Step 2: Generate 2 content pieces (Daily Five)
[OK] Generated 2 piece(s)
     id=501 "pilot smoke test topic A"
     id=502 "pilot smoke test topic B"
── Step 3: Humanize pieces
[OK] Humanized piece 501
[OK] Humanized piece 502
── Step 4: Publish to WordPress (async)
[OK] Publish queued for piece 501
[OK] Publish queued for piece 502
── Step 5: Poll publish-records
[OK] All 2 piece(s) published
     piece 501 → https://staging.example.com/?p=789
     piece 502 → https://staging.example.com/?p=790
✓ Pilot E2E smoke passed
```

Script exits 0 on success, 1 on any failure (with `errorMessage` printed).

## Premortem checklist

- [ ] Scale + BYOK active before day 1
- [ ] WP plugin smoke passed on staging
- [ ] Brand voice indexed (≥3 sources)
- [ ] Test news piece with source URLs → WP draft with correct **News** category
- [ ] Test evergreen piece → WP draft with **Features** category
- [ ] Autopilot off or draft-only
- [ ] Customer confirms they will paste research notes daily
