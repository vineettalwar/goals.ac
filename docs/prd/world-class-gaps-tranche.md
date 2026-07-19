# PRD: World-class gaps tranche (90-day sequence)

**Status:** In progress · parallel implementers  
**Date:** 2026-07-20  
**Related:** [executive-diagnosis.md](../competitors/executive-diagnosis.md) · [babylovegrowth-parity-planner.md](../competitors/babylovegrowth-parity-planner.md) · [HANDOFF.md](../../HANDOFF.md)

---

## Problem

goals.ac is engine-rich after Waves 0–5. Remaining gap to world-class for the consulting-led ICP is not more engines — it is **proof, outcomes coherence, demo time-to-value, lead magnet honesty, and agency productization**.

## Success criteria

| # | Deliverable | Done when |
|---|-------------|-----------|
| 1 | Success stories infrastructure + verify CTAs | `/success-stories` renders format-preview cards with GSC/Ahrefs/ChatGPT verify links; detail routes by slug; no fake named customer claims |
| 2 | Outcomes panel | Dashboard shows one row: articles · publish health · AI citation % · GEO — above autopilot activity |
| 3 | Fast-lane demo checklist | Done state lists partner steps with deep links (review → humanize → CMS → visibility → command center) |
| 4 | Public GEO lead magnet | Anonymous `/api/public/geo-audits/generate` rate-limited; post-audit soft capture/CTA; docs no longer claim auth-required |
| 5 | Partner report | Auth'd multi-project outcomes page + print-to-PDF; nav entry; gateway allow if needed |

## Out of scope

Surfer NLP, hosted blog, backlink exchange, detector APIs, public self-serve pricing GTM, new PDF libraries.

## Edge thesis (unchanged)

Humanize trust · Studio writing room · Integration reliability. This tranche packages **proof + outcomes + partner workflow** around that thesis.

## Verification

```sh
pnpm --filter @workspace/app-shell run typecheck
pnpm --filter @workspace/content-engine run typecheck
pnpm --filter @workspace/marketing-persona-app run typecheck
# Manual: /success-stories, /dashboard, /onboarding/fast-lane, /geo-audit, /reports/partner
```
