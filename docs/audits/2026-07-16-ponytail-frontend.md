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
| ~−0 / −3 deps | `delete` | Next `package.json` | **Removed 2026-07-16:** `gsap`, `@gsap/react`, `marked` (zero imports) |
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
| Generating progress | **Done 2026-07-16** (stream phase + headings) | Done | Closed |
| Repurpose flow | **Done 2026-07-16** (compact path/source) | Done | Closed |
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

### D. Dead leftovers — deleted 2026-07-16

| Path | Why |
|---|---|
| ~~`.../content-studio/brand-ai-profile-card.tsx`~~ | Shell card (richer; host-loaded profile) |
| ~~`.../content-studio/content-studio-calendar.tsx`~~ | Shell `StudioCalendarView` (mobile agenda + DnD) |
| ~~`.../content-studio/content-studio-hub-filters.tsx`~~ | Shell hub filters + list/grid |
| ~~`.../content-studio/content-studio-list-items.tsx`~~ | Shell cards; hub `ArticlePerformanceBadge` restored via `renderPieceExtras` |
| ~~`.../visibility/keyword-rank-chart.tsx`~~ | Shell chart via `@workspace/app-shell` |

---

## Recommended next actions (ordered)

1. **Do not** delete `goals-app-ui` (**confirmed** — live `app.goals.ac` Pages host).
2. Delete §D leftovers (~480 LOC) — **import grep verified** (see Appendix A).
3. Remove unused Next deps (`gsap` / `@gsap/react` / `marked`) — **zero `src/` imports verified**.
4. ~~Shell create catch-up~~ — **done 2026-07-16** (destination, competitor picker, stream headings, compact repurpose).
5. ~~Unify publish-destination registries~~ — **done** (canonical app-shell 27-ID registry; Next re-export). Legacy Vite copy still optional cleanup.
6. ~~CMS/ESP dialog consolidation~~ — **done** (−57% LOC via `SchemaConnectDialog`).
7. Demo trust surfaces (if partner GTM): video demo placeholder, success-stories coming-soon; Notion images/cover shipped.
8. Optional deletes: Next studio leftovers (~480 LOC) + unused `gsap`/`@gsap/react`/`marked`.

---

## Related

- Skill: `.agents/skills/ponytail-audit/SKILL.md`
- **Re-audit (same day pm):** [`docs/audits/2026-07-16-ponytail-frontend-reaudit.md`](./2026-07-16-ponytail-frontend-reaudit.md) — additional ~−2.3k LOC candidates after morning cleanup
- Prior session: `HANDOFF.md` (create wizard parity + deferred list)
- Deploy truth: `docs/deploy-cloudflare.md` (`app.goals.ac` → `goals-app-ui`)
- Competitive deferred: `docs/prd/content-studio-competitive-plan.md` § Explicitly deferred

---

## Agent verification appendices

Cross-checked by parallel explore agents on 2026-07-16 (claim verify, unfinished UI, HANDOFF gaps, TODO/dead scan).

### Appendix A — Claim verification

| Claim | Verdict |
|---|---|
| Delete entire `goals-app-ui` | **FALSE** — `app.goals.ac` Pages SPA |
| Next studio leftovers unused (4 files + keyword chart) | **VERIFIED** |
| `gsap` / `@gsap/react` / `marked` unused in Next `src/` | **VERIFIED** |
| `framer-motion` one-file in Next | **PARTIAL** — true for Next; also used in legacy `goals-ac` |
| Dual publish-destination registries | **VERIFIED (worse)** — **three** registries (app-shell integrations subset, Next full, legacy Vite copy) |
| `PieceLink` pure pass-through | **VERIFIED** |
| 8 CMS + 4 ESP near-copy dialogs | **VERIFIED** |
| `help-articles.ts` 20+ articles | **PARTIAL** — 16 articles / ~493 LOC |
| Theme context split across 3 files | **VERIFIED** |
| `CreateContentDialog` destination step | **YES** (shipped this session) |

### Appendix B — Unfinished features (synthesis)

Agents that inventoried gaps still listed shell competitor / stream / repurpose as open — **superseded same day** by shell create catch-up. Remaining truth:

| Tier | What remains |
|---|---|
| **Intentional deferred** | Hosted blog, Surfer NLP, TikTok/YouTube/inbox, Shopify theme **app block**, detector APIs, self-serve Growth checkout, backlink exchange, detector APIs |
| **Demo-visible (product)** | Marketing video placeholder; success-stories coming-soon; Notion adapter drops images; no public media bucket for non-WP `data:` featured; Instagram text-post placeholder image; Semrush needs org key; TYPO3 FAL real-site caveats; Bluesky JWK stability; CF public-worker social still env-only |
| **Architecture debt** | Next studio leftovers; unused gsap/marked deps; legacy `goals-ac` publish-destinations copy |
| **Safe deletes** | §D leftovers (~480 LOC) + 3 Next deps |

### Appendix C — Codebase health note

No meaningful `TODO` / `FIXME` / `throw "not implemented"` net in product UI packages. Incompleteness is mostly **deferred strategy** and **dual-host duplication**, not abandoned stubs.
