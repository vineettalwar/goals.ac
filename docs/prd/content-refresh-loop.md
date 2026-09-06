# PRD: Content Refresh Loop

**Status:** Shipped (MVP) — URL import, Optimize page (+ secondary keywords), WP update confirm, refresh queue, Search performance → Optimize, Diagnose→Fix→Stay copy, non-WP export honesty  
**Date:** 2026-09-06  
**ICP (90 days):** Partner-demo path vs Surfer / BLG / AutoSEO — consulting-led  
**Related:** [executive-diagnosis.md](../competitors/executive-diagnosis.md) · [content-studio-competitive-plan.md](./content-studio-competitive-plan.md) · [DECISIONS.md](../DECISIONS.md) · [HANDOFF.md](../../HANDOFF.md)

---

## Problem

Surfer wins demos on a closed loop: **Diagnose → Fix → Stay optimized**. Partners paste a live URL (or pick a decaying page), get live guidelines, fix gaps, and republish.

goals.ac creates and scores **new** pieces well (dual editorial + SERP score, Fix-gaps enhance, Humanize, CMS publish). Decay discovery (`content-decay-service` + `content-decay-sweep`) and rank / AI-visibility signals already exist. They are **not** wired into one first-class path for **existing live pages**.

Without that surface, the Surfer comparison fails on “improve what you already published,” even though most engines are already in-repo.

**Root cause:** packaging gap, not a missing score engine. Aligns with [executive-diagnosis.md](../competitors/executive-diagnosis.md): package engines; do not clone Surfer NLP first.

---

## User story

As a founder or agency SEO, I pick a live URL (or a decay / rank / AI-visibility alert), land in Studio with the page body and dual Content Score against a target keyword, click Fix gaps / Humanize, then publish an **update** to the connected CMS — without rewriting from scratch.

---

## Success criteria

| # | Done when |
|---|---|
| 1 | From project Search or Studio: **Optimize page** accepts URL + primary keyword (optional secondary) |
| 2 | SSRF-safe fetch extracts title/body; creates/links a content piece with `source: refresh` + canonical URL |
| 3 | Article quality panel shows dual editorial + SERP score on imported body (reuse existing panel + serp-content-score) |
| 4 | Enhance (“Fix gaps”) and Humanize work on refresh pieces the same as drafts |
| 5 | Publish supports **update-by-URL / CMS id** when WordPress is connected; otherwise export/copy with clear honesty |
| 6 | **Refresh queue** (project-scoped) lists prioritized items from GSC decay, rank drops, and AI-visibility misses, each with CTA → Optimize flow |
| 7 | Product/marketing copy tells one Diagnose → Fix → Stay story; score still labeled non-Surfer-NLP |

---

## Edge thesis

Humanize trust · Studio writing room · Integration reliability.

This PRD extends the Studio writing room to **owned live pages** and closes the Surfer “Improve Existing Pages” moment without an NLP arms race.

---

## Scope

### In

- URL import → content piece + dual score + enhance + Humanize + WP update
- Refresh queue UI over existing decay / rank / visibility signals (read-only join; no new crawl product)
- Entry points: Studio create wizard, Search performance / keywords, dashboard opportunity row

### Out

- Live NLP term highlighting
- Chrome / Google Docs extensions
- Product MCP / Surfy-style agent
- Full Surfer “Sites” crawl product
- Plagiarism / detector APIs
- Deep update paths for non-WP CMS beyond what connectors already support (document honesty; WP-first MVP)

---

## Technical approach

| Piece | Reuse |
|---|---|
| HTML fetch + extract | Brand scrape / GEO fetch patterns + SSRF guard in `lib/security` |
| Score + enhance | Dual score in `lib/app-shell` quality panel + `content-piece-enhance` |
| Decay signals | `lib/content-engine/.../content-decay-service.ts` + GSC opportunities |
| Rank / AI visibility | Existing Search surfaces + list APIs |
| UI shell | `lib/app-shell` Studio + Search; Next routes in `marketing-persona-app` |
| Persist | `content_pieces` metadata: `sourceUrl`, `refreshOf`, keyword, `source: refresh` — avoid new tables unless CMS update-id mapping needs a column |

**MVP defaults**

- WordPress-first publish **update** only
- Queue cadence: reuse existing decay sweep; no new cron

---

## Edge cases

| Case | Behavior |
|---|---|
| Soft 404 / JS-heavy page | Fail closed; offer “paste markdown instead” |
| Login wall / blocked fetch | Stop; do not invent body |
| Canonical mismatch | Show fetched URL vs entered URL; require confirm before save |
| Very long page | Truncate for score with visible warning; keep full body editable if extract succeeded |
| No GSC | Queue still works from manual URL + rank tracker signals |
| Wrong CMS post match | Block publish update until URL / CMS id confirmed |
| D1 vs Postgres | New list endpoints use shared helpers (`countAsInt`, etc.) |

---

## Premortem

1. **Import quality junk** → score looks broken in demos. Mitigate: extract confidence gate + paste-markdown fallback.
2. **CMS update overwrites wrong post**. Mitigate: explicit URL / id match confirmation before publish update.

---

## Open questions

| Question | Default |
|---|---|
| WP-first update only for MVP? | Yes |
| New cron for refresh queue? | No — reuse decay sweep |
| Non-WP update depth in v1? | Honesty badge / export only |

---

## Build slices (after PRD approval)

1. URL import API + content piece create (`source: refresh`)
2. Studio **Optimize page** entry + quality panel on import
3. WP update confirm on publish
4. Refresh queue UI joining decay / rank / visibility
5. Marketing / empty-state Diagnose → Fix → Stay copy (no Surfer visual clone)

**No product code until this PRD is approved.** → Approved 2026-09-06; MVP shipped (entry-point packaging complete).

---

## Appendix A — Surfer → goals.ac gap matrix

Brand cues to borrow (paper/forest voice, not Surfer UI): “be the answer,” Content Score as north star, Diagnose → Fix → Stay as one story. Do **not** copy Surfer visual language ([PRODUCT.md](../../artifacts/marketing-persona-app/PRODUCT.md) anti-references).

| Surfer moment | Their product | goals.ac today | Follow-on |
|---|---|---|---|
| AI visibility | AI Tracker | Shipped: `/search/visibility` | Package into refresh queue CTAs |
| Competitive gaps | Research / topical | Shipped: competitors, topical map, opportunities | — |
| Write + score while drafting | Content Editor + NLP | Dual score + coverage checklist; NLP deferred | NLP only if dual score fails partner demos |
| Improve existing pages | URL → Editor + Auto-Optimize | Shipped: Optimize page + WP update | Polish entry CTAs |
| Content Audit / “what next” | Sites audit + alerts | Shipped: `/search/refresh` queue | Stay loop / alerts later |
| Stay optimized 24/7 | Re-opt loop | Partial: decay sweep, not daily open-and-fix | Queue + alerts after MVP |
| Where you work | Docs / Chrome / WP plugin / MCP | CMS publish strong; no Docs/Chrome sidecar; no product MCP | Later PRDs |

### Missing features ranked (build order)

1. **Content Refresh Loop** (this PRD) — Improve Existing Pages + Content Audit packaging
2. **Editor-side auto internal links** — Shipped MVP (quality-panel Insert; see [editor-internal-links.md](./editor-internal-links.md))
3. **Shareable editor / agency collab** — Surfer-style share link (auth/permissions heavy)
4. **Product MCP** — only after refresh loop has stable APIs
5. **Chrome / Google Docs sidecar** — distribution; defer
6. **Live NLP term bank** — still deferred unless dual score insufficient in demos
7. **Plagiarism / detector APIs** — already deferred

---

## Appendix B — Positioning vs Surfer

| We do not | We do |
|---|---|
| Clone Surfer NLP or Content Score marketing claims | Ship Optimize page + Refresh queue on existing engines |
| Copy Surfer’s OS chrome / purple SaaS look | Tell Diagnose → Fix → Stay in goals.ac brand register |
| Build Sites crawl or Docs extension in this tranche | WP-first update + honest export for other CMSes |
