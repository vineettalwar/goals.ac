# Ponytail frontend audit — 2026-07-16

Over-engineering / complexity audit of product UI packages using [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) methodology (`/ponytail-audit`).  
**Install:** `.cursor/rules/ponytail.mdc` + `.agents/skills/ponytail{,-audit,-review}/`.

**Scope in:** `artifacts/marketing-persona-app`, `artifacts/goals-app-ui`, `lib/app-shell`  
**Scope out:** `artifacts/goals-ac` (legacy Vite redirect) · correctness / security / perf (out of ponytail scope)

**Intensity:** high-confidence deletes only; treat ambiguous “dead” surfaces as unfinished until proven otherwise.

---

## Verdict

The frontend is **engine-rich and host-duplicated**, not random abstraction soup. Biggest real cuts are leftover Next studio forks after shell convergence, dead npm deps (if verified), and data-driven consolidation of CMS/ESP connect dialogs. The single largest “delete the whole package” finding against `goals-app-ui` is **wrong** — that package deploys `app.goals.ac`.

---

## Correction log (do not follow blindly)

| Claim from explore pass | Resolution |
|---|---|
| Delete entire `artifacts/goals-app-ui` (~12.6k LOC) | **FALSE.** Live Cloudflare Pages product SPA (`pnpm run cf:pages:app`, `docs/deploy-cloudflare.md`). Shares `lib/app-shell` with Next. |
| Shell create missing destination | **FIXED 2026-07-16.** `CreateContentDialog` now: format → keyword → [competitors?] → [destination?] → review. |

---

## Ranked findings (complexity / over-build)

Estimates are order-of-magnitude. Tags: `delete` · `shrink` · `yagni` · `native`.

| Est. | Tag | Path | Finding |
|---:|---|---|---|
| ~−480 | `delete` | Next studio leftovers | Unused after hub → `StudioView`: `brand-ai-profile-card.tsx` (115), `content-studio-calendar.tsx` (148), `content-studio-hub-filters.tsx` (91), `content-studio-list-items.tsx` (91); plus unused `visibility/keyword-rank-chart.tsx` (37) |
| ~−800 | `shrink` | `lib/app-shell/.../cms-connect-dialogs.tsx` | 8 near-identical CMS connect dialogs + hand-rolled `<dialog>`; field schemas already exist in Next `cms-connection-schemas.ts` |
| ~−250 | `shrink` | `lib/app-shell/.../esp-connect-dialogs.tsx` | 4 ESP dialogs + second hand-rolled dialog (`div role="dialog"`) |
| ~−0 / −3 deps | `delete` | Next `package.json` | Suspected unused: `gsap`, `@gsap/react`, `marked` (verify before remove) |
| ~−0 | `yagni` | Dual publish registries | `lib/app-shell/src/content-piece/publish-destinations.ts` vs `marketing-persona-app/.../publishing-destinations.ts` — ID sets diverge (shell subset) |
| ~−0 | `shrink` | `cn()` | Duplicated in `lib/app-shell/src/cn.ts` and Next `lib/utils.ts` |
| ~−0 | `yagni` | Shell `ContentPieceView` / `SocialHubView` | Large prop surfaces; intentional shared-UI contract, not free deletes |
| n/a | `native` | Connect dialogs | App-shell avoids Radix/shadcn Dialog by design (host-agnostic); keep or adopt carefully |

**Not ranked as deletes:** Next `CreateContentModal` richness vs compact shell wizard — canonical Next path; shell is Vite/Pages demo parity. Dual data hooks (`goals-app-ui` ↔ Next) — required while both hosts ship.

**net (safe, high-confidence):** ~−480 LOC leftovers + possible −3 deps after verification.  
**net (aspirational consolidation):** multi-kLOC if CMS/ESP dialogs unify and registries merge — do only with a PRD and parity tests.

---

## Top large files (signal, not guilt)

| LOC | File |
|---:|---|
| 1401 | `marketing-persona-app/src/lib/org/org-access.ts` (server) |
| 1332 | `lib/app-shell/src/integrations/cms-connect-dialogs.tsx` |
| 1155 | `lib/app-shell/src/content-piece/content-piece-ui.tsx` |
| 1137 | `marketing-persona-app/src/components/settings/settings-client.tsx` |
| 1055 | `lib/app-shell/src/section-panels/keyword-tracking-ui.tsx` |
| 932 | `marketing-persona-app/.../cms-connection-schemas.ts` |
| 819 | `goals-app-ui/src/pages/SectionPages.tsx` |
| 811 | `marketing-persona-app/.../publishing-destinations.ts` |
| 710 | `lib/app-shell/src/studio/create-content-dialog.tsx` (post destination step) |

---

## Features not fully implemented

Sources: `HANDOFF.md`, competitive plan Waves 0–3.2, create-wizard diff, TYPO3/Shopify caveats. Status checked 2026-07-16.

### A. Explicitly deferred (intentional — do not treat as bugs)

| Feature | Status | Notes |
|---|---|---|
| Hosted blog (Wave 3.3) | Deferred | Self-serve GTM; competitive plan |
| Full Surfer-style NLP editor | Deferred / out of scope | Live term highlighting deliberately skipped |
| TikTok / YouTube / inbox social | Deferred | Out of ICP; Buffer parity partial only |
| Shopify theme **app block** | Deferred | Soft Liquid snippet + docs/preflight shipped; Partner app block not |
| Detector APIs (GPTZero, etc.) | Deferred | Explicitly out of Wave 0 |
| Public self-serve pricing | Deferred | Partner GTM first |
| Backlink exchange | Deferred | Competitive plan |

### B. Partial / shell ↔ Next parity gaps

| Feature | Shell (`CreateContentDialog` / app-shell) | Next (`CreateContentModal`) | Gap |
|---|---|---|---|
| Multi-step create | Done | Done | — |
| LinkedIn archetype + hook | Done (chips on keyword step) | Done (separate steps) | UX depth only |
| Competitor URLs | Paste textarea | Project analyses cards + quick-add | Shell weaker |
| Destination / `intendedPublishPlatform` | **Done 2026-07-16** | Done | Closed |
| Project competitor picker | **Done 2026-07-16** (cards + analyses + quick-add) | Done | Closed |
| Generating progress | **Done 2026-07-16** (stream headings + label fallback) | Done | Closed |
| Repurpose flow | Missing | Done | Shell missing |
| Brand AI profile card | Shell owns | Thin host passes profile | Leftover Next card file |

### C. Soft / demo landmines (works with caveats)

| Area | Caveat | Pointer |
|---|---|---|
| Shopify theme snippets | Soft amber preflight; manual Liquid in `cms-plugins/shopify/theme-snippets/` | HANDOFF Shopify section; `docs/cms-plugins/shopify-theme-sections.md` |
| Visual summary → featured image | Sharp PNG is `data:` URI for in-app only; CMS publish still needs HTTPS stock/media | HANDOFF visual-summary decision |
| Platform social OAuth credentials | LinkedIn/X/Meta can live in admin DB; CF public-worker paths may still be env-only | HANDOFF platform admin credentials |
| TYPO3 FAL media | URL fetch only; BE-user / folder edge cases on real sites | HANDOFF TYPO3 |
| Semrush gaps button | UI live; scan needs org Semrush key | HANDOFF Semrush |
| Analytics best-time slots | Needs ≥3 metric samples; else falls back | HANDOFF social analytics |
| Migrations | PG `0064`+ social OAuth cols; D1 may need local apply | HANDOFF migrate notes |

### D. Dead leftovers (implemented elsewhere — safe delete candidates)

| Path | Why |
|---|---|
| `.../content-studio/brand-ai-profile-card.tsx` | Self-fetching; hub uses shell card |
| `.../content-studio/content-studio-calendar.tsx` | Shell `StudioCalendarView` |
| `.../content-studio/content-studio-hub-filters.tsx` | Shell hub filters |
| `.../content-studio/content-studio-list-items.tsx` | Shell list/grid |
| `.../visibility/keyword-rank-chart.tsx` | Shell chart via `@workspace/app-shell` |

---

## Recommended next actions (ordered)

1. **Do not** delete `goals-app-ui`.
2. Delete §D leftovers (~480 LOC) after a quick import grep in CI/local.
3. Verify then remove unused Next deps (`gsap` / `@gsap/react` / `marked`) if zero imports.
4. Shell catch-up (optional): project competitor picker → streaming headings → repurpose (only if Pages demo must match Next create).
5. Unify publish-destination registries under one package export (needs conscious type expansion on shell).
6. CMS/ESP dialog consolidation — largest shrink; needs schema-driven PRD and visual parity.

---

## Related

- Skill: `.agents/skills/ponytail-audit/SKILL.md`
- Prior session: `HANDOFF.md` (destination step + deferred list)
- Deploy truth: `docs/deploy-cloudflare.md` (`app.goals.ac` → `goals-app-ui`)
- Competitive deferred: `docs/prd/content-studio-competitive-plan.md` § Explicitly deferred

---

## Agent verification appendices

_Appended when parallel verify / unfinished-feature agents complete._
