# WordPress staging verification — runbook + evidence

> **⚠ Human required.** This gate cannot close automatically. Run every step
> against a real staging WordPress instance, fill in every evidence block below,
> then commit the filled file. Gate 0 BLOCK-5 closes only when a human signature
> appears at the bottom of a completed run.

Smoke script: `scripts/wordpress-plugin-smoke.mjs`
Packaging: `cms-plugins/wordpress/scripts/package-plugin.sh`

---

## Prerequisites

| Item | Requirement |
|---|---|
| Plugin zip | Built from source (Step 0 below) |
| Staging WordPress | WP 6.4+, PHP 8.1+, REST API enabled |
| Permalink structure | **Not Plain** — must be set to Post name or any custom structure (Settings → Permalinks) |
| Node.js | 18+ on the machine running the smoke script |
| Site key | Copied from WP Admin → Settings → goals.ac → Site Key field after plugin activation |

**Required env vars** (set before running any smoke commands):

```sh
export WP_SITE_URL=https://staging.example.com   # no trailing slash
export WP_SITE_KEY=<paste-site-key-here>
```

---

## Step 0 — Package the plugin

```sh
bash cms-plugins/wordpress/scripts/package-plugin.sh
```

Expected output: `Built cms-plugins/wordpress/dist/goals-ac.zip`

**Pass criterion:** zip exists and `unzip -l` output shows `goals-ac/goals-ac.php` +
`goals-ac/vendor/autoload.php` (Composer dependencies bundled).

### Evidence

| Field | Value |
|---|---|
| Zip path | `cms-plugins/wordpress/dist/goals-ac.zip` |
| Zip size (bytes) | |
| `goals-ac.php` present in zip | ☐ yes / ☐ no |
| `vendor/autoload.php` present | ☐ yes / ☐ no |

**Pass / Fail:** ___

---

## Step 1 — Install on staging WordPress

1. In WP Admin → Plugins → Add New → Upload Plugin, upload `goals-ac.zip`.
2. Click **Install Now** then **Activate**.
3. Navigate to Settings → goals.ac — confirm the Site Key field shows a 32-character alphanumeric key.
4. Copy the site key into `WP_SITE_KEY` (from Step 0 env vars above).

**Pass criterion:** Plugin appears as Active with no PHP fatal errors in site health.

### Evidence

| Field | Value |
|---|---|
| WordPress version | |
| PHP version | |
| Plugin status | Active |
| Site key length | 32 chars |
| Any activation errors | ☐ none / describe: |

**Pass / Fail:** ___

---

## Step 2 — Health check

```sh
node scripts/wordpress-plugin-smoke.mjs
```

Expected line: `[OK] GET /health → plugin 0.1.0 · WP X.Y.Z`

**Pass criterion:** HTTP 200, `version` field present, no `[FAIL]` lines.

### Evidence — health JSON

```json
{
  "plugin_version": "",
  "cms_version": "",
  "php_version": "",
  "capabilities": {},
  "seo_plugin": ""
}
```

**Pass / Fail:** ___

---

## Step 3 — Site-graph (categories + tags)

Same command as Step 2 — the script hits `/site-graph` automatically.

Expected line: `[OK] GET /site-graph → N categories, M tags`

**Pass criterion:** HTTP 200, categories and tags arrays present (can be empty on a fresh
WP install), HMAC auth accepted (no 401).

> **Note:** If the smoke category "News" is not found, the script prints `[WARN]` — not
> `[FAIL]`. Create the category in WP Admin → Posts → Categories before the production
> go-live run. A missing category at smoke time is a warning; a missing category at
> publish time is a failure.

### Evidence — site-graph summary

```json
{
  "categories": [],
  "tags": [],
  "smoke_category_id": null
}
```

| Check | Result |
|---|---|
| HMAC accepted (no 401) | ☐ yes / ☐ no |
| Category "News" resolved | ☐ yes / ☐ warn (not yet created) |

**Pass / Fail:** ___

---

## Step 4 — llms.txt

```sh
# Without schema write (read current value — safe, non-destructive):
node scripts/wordpress-plugin-smoke.mjs

# With schema write (POST a test llms.txt then re-verify GET):
WP_SMOKE_SCHEMA=1 node scripts/wordpress-plugin-smoke.mjs
```

Expected line: `[OK] GET /llms.txt → # llms.txt…`

**Pass criterion:** `GET https://staging.example.com/llms.txt` returns HTTP 200 with
`Content-Type: text/plain`. A 404 means the permalink structure is set to Plain or the
plugin was not activated properly (rewrite rules flushed on activation).

### Evidence

| Check | Result |
|---|---|
| `GET /llms.txt` HTTP status | |
| Content-Type header | `text/plain; charset=utf-8` |
| First line of response | |

**Pass / Fail:** ___

---

## Step 5 — Draft publish + taxonomy resolution

```sh
WP_SMOKE_PUBLISH=1 WP_SMOKE_CATEGORY=News node scripts/wordpress-plugin-smoke.mjs
```

This creates **one draft post** titled `goals.ac smoke <ISO timestamp>` — safe to delete
after verification. Do NOT set `WP_SMOKE_STATUS=publish` on a production site.

Expected lines:
```
[OK] POST /content → https://staging.example.com/?p=123
```

**Pass criteria:**
- HTTP 201 (or 200) from `/content`.
- Post exists in WP Admin → Posts with status `draft`.
- Category "News" assigned to the post (visible in post editor).
- SEO meta fields populated if a SEO plugin (Yoast / Rank Math) is active.

### Evidence

| Field | Value |
|---|---|
| WP post ID returned | |
| WP post URL | |
| Post status in WP Admin | `draft` |
| Category "News" assigned | ☐ yes / ☐ no |
| SEO title populated | ☐ yes / ☐ n/a (no SEO plugin) |
| SEO description populated | ☐ yes / ☐ n/a |

### Publish response JSON (trimmed)

```json
{
  "remote_id": 0,
  "url": "",
  "status": "draft"
}
```

**Pass / Fail:** ___

---

## Step 6 — Idempotency replay (optional but recommended)

```sh
WP_SMOKE_PUBLISH=1 WP_SMOKE_IDEMPOTENCY=1 WP_SMOKE_CATEGORY=News node scripts/wordpress-plugin-smoke.mjs
```

Expected line: `[OK] idempotency replay remote_id stable (123)`

**Pass criterion:** Both calls return the same `remote_id`. A duplicate post ID means the
idempotency store is not persisting nonces correctly.

### Evidence

| Field | Value |
|---|---|
| First call post ID | |
| Replay call post ID | |
| Same ID? | ☐ yes / ☐ no |

**Pass / Fail:** ___

---

## Step 7 — JSON evidence capture (optional)

Run with `WP_SMOKE_JSON=1` to produce a JSON block suitable for pasting into this doc:

```sh
WP_SMOKE_PUBLISH=1 WP_SMOKE_JSON=1 node scripts/wordpress-plugin-smoke.mjs
```

### Full JSON evidence

```json
{}
```

*(Paste the JSON block printed after "── JSON evidence ──" here.)*

---

## Summary

| Step | Check | Result |
|---|---|---|
| 0 | Plugin packaged | |
| 1 | Plugin installed + activated | |
| 2 | Health check (HTTP 200) | |
| 3 | Site-graph + HMAC auth | |
| 4 | llms.txt (HTTP 200) | |
| 5 | Draft publish + taxonomy | |
| 6 | Idempotency replay | |

**Overall staging verdict:** ☐ Pass — Gate 0 BLOCK-5 closed / ☐ Fail — items need fixing

**Signed off by:** ___ **Date:** ___ **Staging URL:** ___
