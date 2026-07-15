# PRD: Content Studio Competitive Plan

**Status:** Active · Waves 0–1 shipped · Wave 2 partial (2.1–2.2, 2.4) · Wave 1 complete  
**ICP (90 days):** Partner-demo path vs BabyLoveGrowth / AutoSEO — consulting-led, not self-serve checkout  
**Related:** [babylovegrowth-parity-planner.md](../competitors/babylovegrowth-parity-planner.md), [DECISIONS.md](../DECISIONS.md), [HANDOFF.md](../../HANDOFF.md)

---

## Problem

goals.ac is **engine-rich and experience-thin**. The platform already ships strong pipelines — humanization, dual editorial+SERP scoring, Fix-gaps enhance, 16 CMS connectors, social/ESP publish, autopilot cron, command center — but competitors win on **workflow coherence** and **demo-ready surfaces**.

**Canonical write-up:** [executive-diagnosis.md](../competitors/executive-diagnosis.md) (engines already live vs where packaging still wins the room).

| Competitor | What they win on | Where goals.ac lags in the room |
|---|---|---|
| **Surfer** | Live editor + real-time NLP term coverage while you write | No side-by-side brief/SERP panel during drafting; score feels post-hoc, not “writing room” |
| **BLG / AutoSEO** | Volume simplicity — URL → daily articles → quality score on the homepage | Partner must dig through Studio, Publishing, and Integrations; humanize trust is under-demoed |
| **Buffer** | Social polish — per-platform preview, voice, scheduling UX | Social exists but lacks humanize parity with articles and one-click article→social flow |

**Root cause:** Packaging and reliability gaps, not missing core engines. Closing the competitive gap means surfacing what we already built and hardening humanize + integration trust before chasing Surfer-style live NLP.

---

## Edge thesis

goals.ac wins partner conversations on three durable differentiators competitors cannot copy quickly:

1. **Humanize trust** — Auditable rewrite pass (slop diagnosis, heading/link preservation, brand voice sample), not black-box autopilot output. Counter BLG/AutoSEO “generic AI slop” with before/after proof.
2. **Studio writing room** — Brief + SERP context beside the draft, live dual score, Fix gaps — strategy-first GEO/AEO, not volume-only blog factory.
3. **Integration reliability** — 16 CMS + social + ESP with health cron, connect checklists, publish records — partners ship to real stacks, not hosted-blog fallbacks.

**Positioning lane:** Managed GEO/AEO with editorial control. Autopilot is a feature; human review and integration breadth are the product.

---

## Competitors ring

Three rings map competitor strengths to goals.ac wave priorities:

```mermaid
flowchart LR
  subgraph autopilot["Autopilot ring"]
    BLG[BLG daily articles]
    AutoSEO[AutoSEO volume]
    goals_autopilot[Command center + cron + auto-queue]
  end
  subgraph optimization["Optimization ring"]
    Surfer[Surfer live NLP]
    Clearscope[Clearscope briefs]
    goals_opt[Dual score + Fix gaps + side panel]
  end
  subgraph distribution["Distribution ring"]
    Buffer[Buffer social polish]
    CMS_hosted[AutoSEO hosted blog]
    goals_dist[CMS health + social + publish history]
  end
  BLG --> goals_autopilot
  AutoSEO --> goals_autopilot
  Surfer --> goals_opt
  Clearscope --> goals_opt
  Buffer --> goals_dist
  CMS_hosted -.->|deferred| goals_dist
```

| Ring | Competitor exemplars | goals.ac response | Wave |
|---|---|---|---|
| **Autopilot** | BLG, AutoSEO — set-and-forget daily content | Fast-lane → dashboard, auto-queue on, command center, optional autopilot dashboard (Wave 3) | 0 (demo assets), 3 (dashboard) |
| **Optimization** | Surfer, Clearscope — score while writing | Side panel brief/SERP, live draft score, unify create UX — **not** full live NLP | 1 |
| **Distribution** | Buffer — social scheduling polish; AutoSEO — hosted blog | Health cron expansion, connect UX, publish history, article+social one-click, IG image gate | 2 |

---

## Execution waves

### Wave 0 — Humanize reliability + demo assets (in progress)

**Goal:** Make humanization trustworthy in production and demoable against BLG/AutoSEO samples.

| # | Deliverable | Acceptance |
|---|---|---|
| 0.1 | **Humanize sanitize fix** — `sanitizeAiProse` runs after rewrite; slop score reflects sanitized output; no regression on heading/link guards | Humanize pass completes; audit `slopScoreAfter` matches sanitized body |
| 0.2 | **Secondary keywords** — `contentPieceToGeneratedArticle` passes `pieceMetadata.secondaryKeywords` (not empty `[]`) into humanizer prompt | Secondary terms survive humanize on content pieces with cluster/brief keywords |
| 0.3 | **DeepL re-humanize** — After DeepL translation pass, optional humanize on localized draft (English gen → DeepL → humanize chain) | Non-English projects get humanized localized output when DeepL + humanize enabled |
| 0.4 | **All-social humanize** — Humanize action on social composer formats (LinkedIn, X, Instagram, etc.), not articles-only | Social repurpose + composer expose humanize with platform limits respected |
| 0.5 | **Human-voice score** — Surface `scoreHumanVoice` breakdown prominently in article quality panel (already computed) | Quality panel shows human-voice row with actionable detail |
| 0.6 | **Before/after demo** — Marketing asset: side-by-side raw AI vs humanized sample for partner deck + `/article-quality` tie-in | Partner deck asset + optional public demo section |

**Out of Wave 0:** Detector APIs (GPTZero, Originality, etc.) — explicitly deferred.

---

### Wave 1 — Studio side panel + live draft score (not started)

**Goal:** Surfer-like *feel* without building a live NLP engine — brief and SERP context beside the draft, score updates as the user edits.

| # | Deliverable | Acceptance |
|---|---|---|
| 1.1 | **Side panel brief/SERP** — Brief summary, target keyword, secondary keywords, competitor topics, PAA, SERP feature hints in `ContentPieceLayoutAside` | Panel loads from piece + `/serp-score` without full page navigation |
| 1.2 | **Live draft score** — Debounced re-score on body edit (editorial + SERP combined); show delta vs last save | Score updates within ~2s of pause typing; no server round-trip per keystroke |
| 1.3 | **Unify create UX** — Single create path in Studio (format picker → keyword/brief → generate) aligned across Next + `goals-app-ui` / Vite shell | One modal flow; repurpose remains secondary entry |

**Out of Wave 1:** Full Surfer NLP term coverage, real-time “terms to add” highlighting in editor — deferred to future tranche or never (see Deferred).

---

### Wave 2 — Integration trust + distribution polish (planned)

**Goal:** Win Buffer-style distribution confidence and reduce partner “will publish break?” anxiety.

| # | Deliverable | Acceptance |
|---|---|---|
| 2.1 | **Health cron expansion** — `connectionHealthCheck` covers social (Meta, LinkedIn, etc.) and ESP creds, not only `project_cms` | Cron updates `lastHealth` on social/ESP tiles; failures surface in integrations UI |
| 2.2 | **IG image gate** — Block or warn on Instagram publish without image attachment | Composer shows clear gate; publish API returns actionable error |
| 2.3 | **Connect UX** — Finish setup steps on remaining CMS/social tiles (parity with WP/Ghost/Shopify checklists) | New connections show step checklist until health passes |
| 2.4 | **Publish history** — UI over `publish_records` (provider, status, output mode, timestamp) | Project publishing tab lists last N publishes with drill-down |
| 2.5 | **Article + social one-click** — From approved article, generate + queue social variants in one action | Single CTA creates linked social pieces and opens composer queue |

---

### Wave 3 — Optional depth (backlog)

**Goal:** Partner-program polish and long-tail parity — only after Waves 0–2 demo path is solid.

| # | Deliverable | Notes |
|---|---|---|
| 3.1 | **Optional autopilot dashboard** — Unified activity panel (articles, publishes, LLM citation delta, GEO trend) | Composes command center + visibility + geo audit |
| 3.2 | **Coverage % H2s** — SERP score shows H2 topic coverage % vs competitor headings | Extends `serp-content-score.ts` coverage breakdown |
| 3.3 | **Hosted blog** (`blog.customer.goals.ac`) | **Only when self-serve GTM ships** — not partner-demo priority |

---

## Explicitly deferred

| Item | Rationale | Revisit when |
|---|---|---|
| Full Surfer NLP editor | High build cost; Wave 1 side panel + live score covers 80% of demo need | Partner feedback demands term-level highlighting |
| Hosted blog fallback | AutoSEO differentiator for CMS-less SMB; goals.ac is integration-first | Self-serve track launches ([dual-track-gtm.md](../competitors/dual-track-gtm.md)) |
| TikTok / YouTube / inbox | Out of ICP; Buffer parity partial only | Social expansion sprint |
| Backlink exchange network | PBN-adjacent; white-hat internal link hub instead | Never for core product |
| Detector APIs (GPTZero, etc.) | Legal/accuracy risk; human-voice score + before/after demo sufficient | Partner explicitly requests |

---

## Success criteria — partner demo path

A partner (or sales engineer) can run this **live demo in ≤20 minutes** without buried settings:

1. **Fast-lane** — URL → project → command center with keyword clusters visible.
2. **Generate** — Add & generate from cluster; draft opens in Studio with quality panel showing editorial + SERP + human-voice scores.
3. **Humanize** — Before/after visible; secondary keywords preserved; slop score drops in audit.
4. **Optimize** — Fix gaps enhance addresses SERP gaps; side panel shows brief context (Wave 1).
5. **Integrate** — CMS tile shows green health; connect checklist complete for demo stack (WP or Ghost).
6. **Publish** — Article publishes; publish history row appears (Wave 2); optional social one-click queues LinkedIn variant (Wave 2).
7. **Differentiate** — 12-month roadmap + BYOK + editorial control called out vs BLG black-box and AutoSEO volume.

**90-day ICP:** Win partner conversations vs BLG $99 autopilot and AutoSEO $49 entry. Public self-serve pricing remains deferred.

**Verify commands:**

```sh
pnpm run typecheck
cd lib/content-engine && npx vitest run src/articles/serp-content-score.test.ts
cd lib/seo-tools && npx vitest run src/keywordGapAnalyzer.refresh.test.ts
pnpm --filter @workspace/marketing-persona-app run typecheck
# Manual :3001 — humanize, serp-score, article-quality, integrations/health, content-studio create
# Manual CF preview — parity on humanize + serp-score routes
```

---

## File map — touch points

### Wave 0 — Humanize + demo

| Area | Files |
|---|---|
| Humanizer core | `lib/content-engine/src/content/humanizer.ts`, `lib/content-engine/src/content/ai-writing-rules.ts` |
| Content piece bridge | `lib/content-engine/src/content/content-piece-seo.ts` (metadata, `secondaryKeywords`) |
| Enhance + humanize chain | `lib/content-engine/src/content/content-piece-enhance.ts`, `lib/content-engine/src/content/content-studio-generator.ts` |
| DeepL chain | `lib/content-engine/src/support/integrations/deepl-refinement.ts`, `lib/content-engine/src/support/integrations/deepl-credentials.ts`, `lib/deepl/` |
| Human-voice score | `lib/content-engine/src/articles/article-quality-score.ts` (`scoreHumanVoice`) |
| API routes | `artifacts/marketing-persona-app/src/app/api/content-pieces/[id]/humanize/route.ts`, `artifacts/cf-write-worker/src/content-pieces.ts` |
| Quality UI | `artifacts/marketing-persona-app/src/components/content/article-quality-panel.tsx`, `lib/app-shell/src/content-piece/content-quality-panel.tsx` |
| Marketing demo | `artifacts/marketing-persona-app/src/lib/marketing/content/article-quality-demo.ts`, `artifacts/marketing-persona-app/src/components/marketing/pages/tools/article-quality-demo-client.tsx` |
| Social humanize | `lib/app-shell/src/social/social-composer-panel.tsx`, `lib/app-shell/src/social/social-ui.tsx`, `artifacts/marketing-persona-app/src/components/social/social-hub-client.tsx` |
| Schema | `lib/db/src/schema/content_pieces.ts` (`pieceMetadata.secondaryKeywords`, `humanized`) |

### Wave 1 — Studio side panel + create UX

| Area | Files |
|---|---|
| Piece layout + aside | `artifacts/marketing-persona-app/src/components/content/content-piece-layout.tsx`, `content-piece-layout-aside.tsx`, `content-piece-client.tsx` |
| SERP score API | `artifacts/marketing-persona-app/src/app/api/content-pieces/[id]/serp-score/route.ts`, `lib/content-engine/src/articles/serp-content-score.ts`, `artifacts/cf-write-worker/src/content-pieces-ai.ts` |
| Shared quality panel | `lib/app-shell/src/content-piece/content-piece-ui.tsx`, `artifacts/goals-app-ui/src/pages/ContentPiecePage.tsx` |
| Create flow (Next) | `artifacts/marketing-persona-app/src/components/content-studio/create-content-modal.tsx`, `create-content-create-*.tsx`, `content-studio-client.tsx` |
| Create flow (Vite) | `artifacts/goals-ac/src/pages/content-studio/content-studio-create-modal.tsx`, `artifacts/goals-app-ui/` shell routes |
| Brief / cluster context | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/keyword-clusters/route.ts`, keyword opportunity routes |

### Wave 2 — Integrations + distribution

| Area | Files |
|---|---|
| Health cron | `lib/jobs/src/handlers/connectionHealthCheck.ts`, `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/integrations/health/route.ts` |
| Connect UX | `lib/app-shell/src/integrations/cms-connect-dialogs.tsx`, `cms-connect-types.ts`, `integrations-ui.tsx` |
| Publish records | `lib/db/src/schema/publish_records.ts`, publish pipeline helpers in `lib/content-engine/` |
| IG / Meta | `artifacts/cf-public-worker/src/auth-meta-pages.ts`, `lib/app-shell/src/social/types.ts`, Meta OAuth routes |
| Social hub | `artifacts/marketing-persona-app/src/app/(app)/projects/[id]/social/page.tsx`, `lib/app-shell/src/social/social-queue-panel.tsx` |
| Publishing tab | `artifacts/marketing-persona-app/src/components/projects/project-publishing-tab.tsx` |
| One-click article→social | `lib/content-engine/src/content/content-studio-generator.ts` (`repurposeContentPiece`), repurpose API routes |

### Wave 3 — Backlog

| Area | Files |
|---|---|
| Command center / autopilot | `lib/content-engine/src/analytics/command-center-service.ts`, `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/command-center/route.ts`, `project-automation-panel.tsx` |
| SERP H2 coverage | `lib/content-engine/src/articles/serp-content-score.ts` (coverage breakdown extension) |
| Hosted blog | Not started — future `artifacts/` worker + subdomain routing |

### Shared / cross-wave

| Area | Files |
|---|---|
| Content engine exports | `lib/content-engine/src/index.ts` |
| App shell | `lib/app-shell/src/content-piece/`, `lib/app-shell/src/integrations/` |
| CF gateway allowlist | `artifacts/cf-gateway/src/index.ts` |
| Competitor context | `docs/competitors/babylovegrowth-parity-planner.md`, `docs/competitors/goals-ac-capability-audit.md` |
| Decisions + handoff | `docs/DECISIONS.md`, `HANDOFF.md`, `docs/memory.md` |

---

## Open questions

- **DeepL → humanize order:** Humanize before or after DeepL for non-English? Default: English gen → humanize → DeepL, with optional re-humanize on localized output (Wave 0.3).
- **Live score debounce:** Client-only editorial score vs server SERP score on save — hybrid likely (editorial local, SERP on blur/save).
- **Social humanize scope:** All six platforms in one release or LinkedIn + X first?
