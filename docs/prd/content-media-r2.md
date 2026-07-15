# PRD: Public content-media host (R2)

**Status:** Approved to implement (user selected R2 public + enrich & publish fallback)  
**Date:** 2026-07-16

## Problem

Visual-summary / raster featured images are stored as PNG/JPEG `data:` URIs. Destinations that need a **fetchable HTTPS URL** (Instagram, Notion cover when HTTPS-only was required historically, social gates, some CMS fallbacks) cannot use them. CMS paths that upload data URIs (WP/Ghost/Shopify) already work; the gap is **platform-hosted HTTPS**.

## User story

As a publisher, when I generate longform without stock featured, I get an HTTPS featured URL so Instagram/Notion/social gates and HTTPS-only publish paths work without manual stock pick.

## Success criteria

- [ ] Dedicated R2 bucket (not Next ISR cache) bound as `CONTENT_MEDIA_R2`
- [ ] Public base URL via `CONTENT_MEDIA_PUBLIC_BASE_URL` (custom domain preferred; `r2.dev` OK for staging)
- [ ] Enrich: if featured is raster `data:` and media host is configured → upload → store HTTPS on `featuredImageUrl` / `ogImageUrl`
- [ ] Publish: if featured is still raster `data:` → upload once → use HTTPS for that publish (and prefer persisting on piece when caller updates metadata)
- [ ] No-op / soft skip when bucket or public base URL missing (stock / CMS data-URI paths unchanged)
- [ ] SVG data URIs never uploaded as featured

## Scope in

- `@workspace/media` upload helper + R2 binding setter
- Wire enricher + shared publish helper
- Wrangler binding + deploy docs
- Supersede prior DECISION against platform bucket

## Scope out

- Public upload of arbitrary user files / BYOK CDN
- Image CDN transforms beyond existing sharp WebP optimize on Node
- Migrating historical `data:` rows in bulk backfill (lazy on next enrich/publish)

## Technical approach

1. Binding: `CONTENT_MEDIA_R2` → bucket `goals-ac-content-media` (+ staging)
2. Key: `content/{projectOrAnon}/{yyyy}/{mm}/{uuid}.webp` (or source mime if Worker cannot optimize)
3. Node: optimize to WebP then put; Workers without sharp: put original PNG/JPEG bytes
4. Node without binding: optional S3-compatible R2 API via `R2_ACCOUNT_ID` + access keys
5. Init from `initCfBindings` like D1/KV

## Edge cases

- Missing public base URL → skip upload (would produce unusable keys)
- Upload failure → keep data URI; log warn; publish continues with existing CMS data-URI paths
- Oversized payload → reuse existing 5MB data-URI decode cap

## Ops (manual / done 2026-07-16)

1. ~~`npx wrangler r2 bucket create goals-ac-content-media` (+ staging)~~ **done**
2. ~~Enable public access (r2.dev)~~ **done**
   - prod: `https://pub-b86c42258b4e40ce979e65390f79588c.r2.dev`
   - staging: `https://pub-2b41b9b8da9b4805a574284ef3c146ae.r2.dev`
3. ~~Set `CONTENT_MEDIA_PUBLIC_BASE_URL` in wrangler vars~~ **done** (r2.dev; prefer custom domain for production later)
4. Deploy Workers with new binding
