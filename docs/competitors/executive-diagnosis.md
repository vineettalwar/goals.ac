# Executive diagnosis — engine-rich, experience-thin

**Status:** Canonical product diagnosis · July 2026  
**Audience:** Product, eng, partner demos  
**Related:** [content-studio-competitive-plan.md](../prd/content-studio-competitive-plan.md) · [DECISIONS.md](../DECISIONS.md) · [HANDOFF.md](../../HANDOFF.md) · [goals-ac-capability-audit.md](./goals-ac-capability-audit.md)

---

## Diagnosis

**goals.ac is engine-rich, experience-thin.**

The backend already supports Semrush gaps, GSC scoring, rank tracking, brand-voice RAG, humanization, 16 CMS adapters, and a 30-day autopilot calendar. Competitors win on packaging, discoverability, and one coherent workflow — not on raw capability.

| Already in the engine | What competitors still look stronger at |
|---|---|
| Semrush keyword / competitor gaps | One obvious “research → brief → draft” path |
| GSC sync + query / click scoring | Score that feels live while writing (Surfer) |
| Rank tracking + SERP features | Keywords and Ideas as one discoverable hub |
| Brand-voice RAG | Voice shown in the writing room, not buried |
| Humanization + quality scores | Demoable before/after in partner rooms |
| 16 CMS adapters + social / ESP | Connect + health + publish without hunting tabs |
| 30-day autopilot calendar + cron | URL → daily articles with autopilot defaults on |

**Root cause:** Packaging and discoverability gaps — not missing backends. Closing the gap means surfacing what we already built into one coherent workflow, then hardening demo trust (humanize, health, Studio writing room).

---

## Strategic response

**Package existing engines; do not clone Semrush or ship a live NLP editor first.**

Shared surface: `lib/content-engine` + `lib/app-shell`, mirrored on Next and CF workers (Vite parity where the UI already exists).

### Packaging tranche shipped (2026-07-15)

Documented as **Competitive gap packaging — SHIPPED** in `HANDOFF.md`.

| Phase | What we packed |
|---|---|
| **0** | Command center, 16 CMS tiles, SERP features in rank UI, fast-lane → dashboard |
| **1** | Seed → clusters, brief, Add & generate, GSC-first CTA, click-decline → `content_refresh` / Refresh article |
| **2** | Dual editorial + SERP score, competitor topic diff, Fix-gaps enhance |
| **3** | Integration health API + `project_cms` cron, connect setup steps, `lastHealthOk` on tiles |
| **4** | Fast-lane autopilot + auto-queue on, internal link hub |

### Explicitly deferred

- Surfer-style real-time NLP editor
- Hosted `blog.customer.goals.ac` fallback for CMS-less SMB
- Per-CMS deep wizards beyond connect checklists
- Backlink exchange / AI-detector APIs as product features

### Next packaging waves

Waves 0–4 packaging/trust **shipped**. **Wave 5** (2026-07-17): humanize durability + Studio/integration reliability — see [content-studio-competitive-plan.md](../prd/content-studio-competitive-plan.md).

Still deferred: Surfer NLP, hosted blog, self-serve pricing.

**ICP (90 days):** Partner-demo path vs BabyLoveGrowth / AutoSEO — consulting-led, not self-serve checkout.

---

## How to use this doc

- Lead partner/competitive conversations with this diagnosis before feature lists.
- Prefer “surface X we already have” over “build Y competitor has” unless Y is in an accepted wave.
- When adding engines, ask: *where is this in one coherent workflow on day one?*
