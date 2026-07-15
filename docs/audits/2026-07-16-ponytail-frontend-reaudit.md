# Ponytail frontend re-audit — 2026-07-16 (pm)

Second pass after the morning cleanup batch.  
**Scope:** `artifacts/marketing-persona-app`, `artifacts/goals-app-ui`, `lib/app-shell`  
**Out:** `artifacts/goals-ac`, correctness / security / perf  

**Prior batch (closed — do not re-open as deletes):** Next studio leftovers, `gsap`/`@gsap/react`/`marked`, CMS/ESP `SchemaConnectDialog`, publish-destination SSOT, shell create parity, success-stories illustrative card, content-media R2 (ops).

**Install:** `.cursor/rules/ponytail.mdc` + `.agents/skills/ponytail{,-audit,-review}/`

---

## Verdict

Ponytail **safe-delete runway is not exhausted.** Morning cuts were real; a second cluster remains: deprecated Next content-piece layout after shell migration, orphan marketing/dashboard files, and three unused Next deps. Dual-host create/settings duplication is still intentional — not free deletes. **Do not delete `goals-app-ui`.**

---

## False claims

| Claim | Resolution |
|---|---|
| Delete entire `goals-app-ui` | **FALSE** — live `app.goals.ac` Pages |
| Delete app-shell exports unused by Next | **FALSE** — Pages public API |
| Delete `assertAiGenerationEnabled` / `ai-billing-tiers` | **FALSE** — unfinished wiring, not dead junk |

---

## Ranked findings (new)

| Est. | Tag | Finding | Path |
|---:|---|---|---|
| ~−1128 | `delete` | Deprecated Next content-piece layout cluster after shell `ContentPieceView` (`@deprecated` already) | `…/content/content-piece-layout{,-aside,-header}.tsx`, `use-content-piece-handlers.ts`, `content-piece-utils.ts`, `markdown-toolbar.tsx` |
| ~−598 | `delete` | Orphan dashboard server sections — hub uses shell `DashboardView` | `…/dashboard/dashboard-sections.tsx` |
| ~−221 | `delete` | Roadmap page clients after redirect → `/content-engine` | `…/marketing/pages/roadmaps/roadmap{s,-detail}-*-client.tsx` |
| ~−117 | `delete` | `VideoDemoSection` never mounted | `…/marketing/sections/video-demo-section.tsx` |
| ~−68 | `delete` | `BrandTailoringPanel` zero imports | `…/brand/brand-tailoring-panel.tsx` |
| ~−78 | `delete` → **finished** | `useJobPoll` now drives generate + publish polls in `use-content-piece-data` | `goals-app-ui/src/hooks/use-job-poll.ts` |
| −3 deps / ~−25 | `delete` | Unused Next deps: `@dnd-kit/core`, `@dnd-kit/utilities` (DnD in app-shell), `@radix-ui/react-separator` (+ orphan `ui/separator.tsx`) | `marketing-persona-app/package.json` |
| ~−144 | `delete` | Dead helpers: `settings-types.ts`, `lib/utils/motion.ts`, `lib/billing/quota-checkout.ts`, `lib/format/date.ts`, AI re-export stubs, `marketing-section-surface.ts` | verify import-graph before each file |
| ~−80–120 | `shrink` | Next `ContentExportPanel` / `StockByokPanel` near shell copies | prefer shell import |
| ~−20 | `shrink` | Theme context split (product + marketing) | merge later |
| aspirational | `shrink` | Admin LinkedIn/X/Meta/Bluesky dialogs still near-copy | schema-driven like CMS |
| keep | `yagni` | Dual create wizards Next vs shell | both hosts ship |
| keep | `yagni` | `PieceLink` 3-line host adapter | Next vs RR `Link` |

**net (high-confidence):** ~−2350 LOC, −3 deps  
**net (aspirational shrink):** dual-wizard / admin dialogs — PRD + parity tests first  

---

## Assumed unfinished (not deletes) — how to finish

| Surface | Intended job | Finish by |
|---|---|---|
| Deprecated `content-piece-layout*` cluster | Pre-shell Next piece editor UI | Already superseded by `ContentPieceView` — delete only if no leftover edit paths; or port any unique status-select leftover into shell |
| `dashboard-sections.tsx` | Server-rendered dashboard widgets | Re-wire into `DashboardPageClient` / `load-dashboard-data` **or** delete if shell `DashboardView` already covers all cards |
| Public `roadmaps-*-client.tsx` | Marketing roadmap browser/generator | Re-mount behind `/roadmaps` (today `permanentRedirect` → `/content-engine`) **or** keep redirect and delete clients |
| `VideoDemoSection` | Homepage “see it live” collage/tour | Import on marketing home between hero and features |
| `BrandTailoringPanel` | Show voice/colors/offerings on brand/piece | Mount on project brand tab or piece aside with brand profile props |
| `useJobPoll` | Shared async job polling | **Done 2026-07-16** — generate + publish in Pages `use-content-piece-data` |
| Unused `@dnd-kit` on Next | Studio calendar DnD | Not unfinished — DnD lives in app-shell; drop Next deps |
| Dead helpers (`motion`, `quota-checkout`, date utils, AI stubs) | Leftover re-exports / unused utils | Delete after import-graph confirm, or re-wire call sites if intentional |

---

## Recommended next actions

1. Do **not** delete `goals-app-ui`.
2. Verify + delete deprecated content-piece layout cluster (largest chunk).
3. Delete orphan `dashboard-sections`, roadmap clients, `VideoDemoSection`, `BrandTailoringPanel`, `useJobPoll`.
4. Remove unused `@dnd-kit/*` + `@radix-ui/react-separator` from Next (confirm calendar only via shell).
5. Optional: thin Next export/stock panels → shell; admin social dialogs consolidation (separate PR).

---

## Related

- Prior audit: [`docs/audits/2026-07-16-ponytail-frontend.md`](./2026-07-16-ponytail-frontend.md)
- Explore agent: [ponytail re-audit](788798ca-feff-4ac7-b9dc-194200e1f91f)
