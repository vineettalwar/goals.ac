# WordPress staging verification evidence

Template for capturing `scripts/wordpress-plugin-smoke.mjs` output and manual staging checks. Fill in placeholder fields after each staging run.

> **Status:** This is a **blank template** — no staging run has been executed yet. Fill sections as you run each check.

## Environment

| Field | Value |
|---|---|
| Staging URL | `https://staging.example.com` ← replace |
| Plugin version | `0.1.0` |
| WordPress version | |
| SEO plugin | Yoast / Rank Math / none |
| Date | |
| Operator | |

## 1. Health check

```sh
WP_SITE_URL=https://staging.example.com WP_SITE_KEY=... node scripts/wordpress-plugin-smoke.mjs
```

### Health JSON response

```json
{
  "plugin_version": "",
  "wordpress_version": "",
  "php_version": "",
  "capabilities": [],
  "seo_plugin": ""
}
```

**Pass / Fail:** ___

## 2. Site-graph categories

Response from `GET /goals-ac/v1/site-graph` (categories subset):

```json
{
  "categories": [
    { "term_id": 0, "name": "", "slug": "" }
  ],
  "tags": []
}
```

**Expected categories present (News, Features, etc.):** ___

## 3. Taxonomy resolution

Verify category name → term ID mapping works at publish time.

| Category name | Expected term ID | Resolved correctly? |
|---|---|---|
| News | | |
| Features | | |

Optional numeric-ID test (`WP_SMOKE_TAXONOMY_ID_TEST=1`):

**Pass / Fail:** ___

## 4. Publish (draft)

Publish a test content piece as WordPress draft.

| Field | Value |
|---|---|
| Content piece ID | |
| WP post ID returned | |
| WP post status | `draft` |
| Correct category assigned | |
| SEO meta populated (title/description) | |

### Publish response (trimmed)

```json
{
  "id": 0,
  "status": "draft",
  "link": ""
}
```

## 5. Idempotency replay

Run with `WP_SMOKE_IDEMPOTENCY=1` — same `X-Idempotency-Key` sent twice.

| Field | Value |
|---|---|
| First response post ID | |
| Replay response post ID | |
| Same ID returned? | |

**Pass / Fail:** ___

## 6. Featured image / media upload

Run with `WP_SMOKE_MEDIA_UPLOAD=1`.

| Field | Value |
|---|---|
| Media ID returned | |
| Filename | |
| MIME type | |
| Attached to post ID | |

**Pass / Fail:** ___

## 7. SEO meta verification

Check in WP admin that the published draft has:

- [ ] Yoast/Rank Math SEO title populated
- [ ] Meta description populated
- [ ] Focus keyword set (if supported)
- [ ] Canonical URL correct

## Summary

| Check | Result |
|---|---|
| Health | |
| Site-graph categories | |
| Taxonomy resolution | |
| Draft publish | |
| Idempotency | |
| Media upload | |
| SEO meta | |

**Overall staging verdict:** ___

**Signed off by:** ___ **Date:** ___
