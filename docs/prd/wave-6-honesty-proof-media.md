# PRD: Wave 6 — Honesty, proof, media

**Status:** 6.A + 6.B2 implemented · 6.C (media R2 verify) pending  
**Date:** 2026-07-23  
**ICP (90 days):** Partner-demo path vs BLG / AutoSEO — consulting-led  
**Related:** [executive-diagnosis.md](../competitors/executive-diagnosis.md) · [content-studio-competitive-plan.md](./content-studio-competitive-plan.md) · [content-media-r2.md](./content-media-r2.md) · [world-class-gaps-tranche.md](./world-class-gaps-tranche.md) · [HANDOFF.md](../../HANDOFF.md)

---

## Problem

Waves 0–5 + the world-class gaps tranche shipped engines, trust surfaces, and partner workflow. Remaining losses in the room are no longer “missing Studio features.” They are:

1. **Marketing oversell** — flat “16+/20+ destinations,” social analytics polish, and `/pricing` vs `llms.txt`/compare SKU mismatch  
2. **Empty proof** — success-stories infrastructure exists; `PUBLISHED_STORIES` is empty (correct — no fake wins); social proof still reads thin  
3. **Media happy path** — Instagram (and other HTTPS-only gates) hard-fail on `data:` featured images when content-media R2 soft-skips

**Diagnosis unchanged:** engine-rich / experience-thin — now concentrated in *claims, evidence, and publish media*, not autopilot or dual score.

---

## Success criteria

| # | Done when |
|---|---|
| 6.A | No public marketing page claims flat “16+ CMS” / “20+ destinations” without depth honesty; social copy does not claim Buffer-grade analytics | **done** |
| 6.A | `llms.txt`, compare, nav, and `/pricing` agree: programs on `/pricing`; self-serve Starter/Growth described as in-app (Settings → Billing), not as the public pricing page SKU list | **done** |
| 6.B | One real permissioned story **or** success-stories stays empty with stronger “method + verify” framing (no invented logos/metrics) | **6.B2 done**; 6.B1 pending |
| 6.C | Partner demo: generate article → featured is HTTPS (or stock) → Instagram/social gate does not fail solely because of `data:` URI when R2 is configured on jobs/write | pending |
| 6.C | Content-media R2 success checkboxes in `content-media-r2.md` verified on production (or documented blocker) | pending |

---

## Edge thesis (unchanged)

Humanize trust · Studio writing room · Integration reliability.  
Wave 6 packages **honest claims + evidence + media reliability** around that thesis — not new engines.

---

## Scope

### In

| Wave | Theme | Deliverables |
|---|---|---|
| **6.A** | Marketing honesty punch list | See punch list below — copy + llms.txt + compare + nav + feature cards |
| **6.B** | Proof | Permissioned story intake path **or** empty-state / method-kit polish; never fake named wins |
| **6.C** | Media happy path | Confirm R2 public host on CF jobs (+ write path if needed); soft-skip messaging in publish UI when unconfigured; IG preflight already exists — make it green in demo |

### Out

Surfer NLP · hosted blog · TikTok/YouTube inbox · backlink exchange · detector APIs · deepening Basic-publish CMS (Contentful/Sanity/Strapi/Wix/Framer/Squarespace/HubSpot) unless a named partner deal requires one · dual Studio create merge · inventing customer stories · public GTM flip to self-serve-first

---

## 6.A — Marketing honesty punch list (do first)

Highest leverage, fewest files. Align claims with product honesty badges already in-app (`tierBadge: "Basic publish"`).

| # | File / surface | Current problem | Fix |
|---|---|---|---|
| A1 | `app/llms.txt/route.ts` | “Starter (free), Growth ($49/mo)” as if `/pricing` lists them | Point: programs on `/pricing`; self-serve plans in-app after signup (Settings → Billing) |
| A2 | `compare-page-client.tsx` | “CMS auto-publish (16+ destinations)”; “16 CMS…”; “Self-serve Growth… on /pricing” | Split deep CMS (WP/Ghost/Shopify/…) vs Basic publish; pricing blurb matches A1 |
| A3 | `pricing-page-client.tsx` | Table row “CMS + social destinations (16+)”; FAQ implies DIY destinations without depth caveat | Prefer “WordPress, Ghost, Shopify + more (Basic publish on headless/site builders)” or count only deep tier |
| A4 | `marketing-feature-data.ts` | “20+ destinations”; social “Per-platform voice and **analytics** included” | Drop or soften analytics; destinations copy matches depth honesty |
| A5 | `site-nav.ts` | “20+ CMS and ESP destinations” | Same honesty language as A3–A4 |
| A6 | `content-engine-marketing.tsx` / integrations marketing | Flat social + CMS grids with equal weight | Optional: label Basic / deep; at minimum stop implying parity with WP plugin path |
| A7 | `integrations-directory-page-client.tsx` / roadmap | `${total}+ destinations` / “20+ publish destinations” | Derive count honestly or say “CMS, social, and ESP” without inflated parity |

**Canonical claim (use everywhere):**

> Publish to WordPress, Ghost, Shopify, and other CMS/social destinations. Deep plugin and Admin API paths for primary stacks; Basic publish for headless and site builders.

**Pricing claim (use everywhere):**

> Hands-on GEO/AEO programs on `/pricing`. Self-serve Starter / Growth available in-app (Settings → Billing) after signup — Growth is $49/mo when Stripe is configured.

---

## 6.B — Proof

| Option | When | Work |
|---|---|---|
| **B1 — One permissioned story** | Partner grants publish rights + verify links | Fill one `SuccessStory` in `success-stories.ts`; keep verify CTAs (GSC / Ahrefs / ChatGPT) |
| **B2 — Empty catalog** | No permissioned story yet | Keep `PUBLISHED_STORIES = []`; demos + verify tools; no invented wins; do not put internal launch status on the public site |

Default until a real launch: **B2**. Do not invent metrics.

---

## 6.C — Media happy path

Depends on [content-media-r2.md](./content-media-r2.md) (code wired; ops checkboxes still open).

| # | Deliverable |
|---|---|
| C1 | Verify prod: `CONTENT_MEDIA_R2` bound on jobs (+ write if enrich runs there); `CONTENT_MEDIA_PUBLIC_BASE_URL` live (`media.goals.ac` or staging) |
| C2 | Smoke: raster `data:` featured → enrich or publish → HTTPS URL persisted / used; IG gate passes |
| C3 | If R2 unset: publish dialog already warns — keep honesty; do not pretend IG works on data URIs |
| C4 | Update `content-media-r2.md` checkboxes when verified |

---

## Technical notes

- No new packages. Copy edits + env/ops verification + optional one story row.  
- Basic-publish list (product SSOT): Contentful, Sanity, Strapi, Wix, Framer, Squarespace, HubSpot — `lib/app-shell/src/integrations/types.ts` `tierBadge`.  
- Deep demo stacks: WordPress, Ghost, Shopify (plus Webflow/Notion/plugin CMS as secondary).  
- Self-serve Growth checkout already exists in-app (`billing-service` / Settings) — Wave 6 does **not** remove it; it stops marketing from saying `/pricing` *is* that SKU page.

---

## Premortem

| If Wave 6 fails | Defense |
|---|---|
| Honesty pass softens claims and sales hates it | Keep “20+” only if qualified (“including Basic publish”); never claim Surfer NLP or Buffer analytics |
| Still no case study and empty state still feels lame | Ship B2 method-kit polish in same PR as A1–A7 |
| R2 “configured” but enrich path never runs on CF | C1 must name which worker hosts enrich; smoke on that path |
| Scope creeps into Surfer / hosted blog | Out-of-scope table; refuse in review |

---

## Order of work

1. **6.A punch list** (one PR, marketing + llms.txt only)  
2. **6.B2** empty-state polish (same PR if tiny; else follow-up)  
3. **6.C** ops verify + smoke; doc checkboxes  
4. **6.B1** only when a real customer grants rights  

---

## Verification

```sh
# After 6.A — grep should not show unqualified 16+/20+ CMS parity claims on marketing surfaces
rg -n '16\+|20\+ destinations|16 CMS|analytics included' artifacts/marketing-persona-app/src/components/marketing artifacts/marketing-persona-app/src/lib/marketing artifacts/marketing-persona-app/src/app/llms.txt

pnpm --filter @workspace/marketing-persona-app run typecheck
# Manual: /pricing, /compare/ai-seo-tools, /platform-integrations, /llms.txt, /success-stories
# Manual: Studio → featured data URI → publish IG (or social) with R2 configured
```

---

## Open questions

1. Prefer **B2** until launch, or chase a permissioned pilot story this month? (Default: B2.)  
2. Is `media.goals.ac` already serving public objects in prod, or staging-only? (Blocks C2.)
