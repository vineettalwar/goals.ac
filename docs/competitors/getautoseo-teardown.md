# AutoSEO (getautoseo.com) — Competitive Teardown

**Date:** July 2026  
**Status:** Research complete (Sprint 0)  
**Strategy:** Dual-track GTM — self-serve SMB + consulting mid-market

---

## Executive summary

[AutoSEO](https://getautoseo.com/) is a productized SMB growth engine: **1 article/day + backlink exchange + ChatGPT/Google visibility**, priced at **$49–$199/mo** with instant signup. goals.ac **matches or exceeds** AutoSEO on platform depth (autopilot, CMS breadth, GEO/AEO, humanization) but **loses on packaging** (consulting-first GTM, 5-article Starter cap, no self-serve Growth checkout).

**Strategic response:** Two front doors — fast-lane SMB onboarding with Growth tier, plus existing consulting track for mid-market. **Do not copy** backlink exchange; counter with internal link hub + citation-worthy content.

---

## Competitor at a glance

| Dimension | AutoSEO | goals.ac |
|-----------|---------|----------|
| Positioning | Agency replacement on autopilot | Strategy-first GEO/AEO platform |
| Core promise | 30 articles/mo + backlinks | 12-month roadmap → 30-day calendar |
| Pricing | $49 / $99 / $199/mo public | Free Starter; Growth shipping |
| Onboarding | URL → 4 min, no CC | Fast-lane (new) + full onboarding |
| Backlinks | Exchange network (core) | White-hat internal links (by design) |
| CMS | 11 platforms + hosted blog | 16 CMS + ESP + social |
| Languages | 100 | **25+** (50+ roadmap) |
| AI visibility | Marketing + content | Live LLM citation tracking |
| Quality | Good enough, minor edits | Humanizer + quality scores |
| Quota upgrade UX | Self-serve checkout | **Growth checkout wired** (Sprint 4) |
| Link metrics | Backlink count | **Internal link coverage + suggestions** (Sprint 4) |
| Visual assets | Hero + infographic | **Visual summary block + stock hero** (Sprint 4) |
| Article velocity | 30/mo SLA claim | **In-app X/30 counter** (Sprint 4) |

---

## What AutoSEO does well

1. **Frictionless funnel** — URL is the only required input at top of funnel
2. **Clear volume promise** — 30 articles/mo with SLA
3. **Backlink narrative** — tangible "100 DA worth/month" metric
4. **Visual assets** — hero image + infographic per article
5. **Social proof** — 2,479+ customers, Trustpilot, GSC case studies
6. **Agency anchoring** — $5k/mo vs $99/mo comparison
7. **Hosted blog fallback** — captures non-CMS users

---

## What goals.ac has that AutoSEO lacks

1. **12-month growth roadmaps** feeding content calendar
2. **Humanization pipeline** + editable brand voice RAG
3. **GEO technical audit** + llms.txt + schema injection via plugins
4. **LLM visibility tracking** (ChatGPT, Perplexity, Claude, Gemini)
5. **20+ publish destinations** including ESP and social
6. **BYOK cost transparency**
7. **Public API** for programmatic publish
8. **Editorial control** as feature, not limitation
9. **White-hat positioning** — no PBN/exchange risk

---

## Gap matrix (priority)

| Gap | Priority | Sprint | Resolution |
|-----|----------|--------|------------|
| Self-serve Growth pricing | P0 | 2 | Stripe checkout, 30 article quota |
| Quota → Growth upgrade UX | P0 | 4 | Checkout CTA on 402 + quota toasts |
| Fast-lane onboarding | P0 | 1 | URL → 3 articles + 30-day plan |
| WP plugin connect on fast-lane | P0 | 4 | Plugin + site key tab on connect wizard |
| Autopilot activity dashboard | P1 | 3 | Unified articles + visibility panel |
| Link coverage metrics | P1 | 4 | Coverage % + suggestions on dashboard |
| Article velocity counter | P1 | 4 | X/30 widget (no SLA marketing yet) |
| Visual summary blocks | P2 | 4 | Markdown visual summary per article |
| Language expansion | P2 | 4 | 25+ languages, honest marketing |
| Compare/pricing page updates | P1 | 3 | Dual-track CTAs, honest feature rows |
| SMB case studies | P1 | 3 | GSC metrics template |
| Infographics (full render) | P2 | 4B | Template-based PNG renderer deferred |
| Hosted blog | P2 | 4B+ | Subdomain fallback deferred |
| 100 languages | P2 | Never claim | Localized keyword research roadmap |
| Backlink exchange | — | Never | White-hat alternative doc |

---

## Research artifacts

| Workstream | Document |
|------------|----------|
| A — Product teardown | [getautoseo-product-teardown.md](./getautoseo-product-teardown.md) |
| B — GTM & pricing | [getautoseo-gtm-pricing.md](./getautoseo-gtm-pricing.md) |
| C — Internal audit | [goals-ac-capability-audit.md](./goals-ac-capability-audit.md) |
| D — Link strategy | [white-hat-link-strategy.md](./white-hat-link-strategy.md) |
| E — Dual-track GTM | [dual-track-gtm.md](./dual-track-gtm.md) (future self-serve) |
| F — BabyLoveGrowth teardown | [babylovegrowth-teardown.md](./babylovegrowth-teardown.md) |
| G — Three-way parity planner | [babylovegrowth-parity-planner.md](./babylovegrowth-parity-planner.md) |

---

## Implementation sprints (post-research)

### Sprint 1 — Fast lane
- `/content-autopilot` URL hero
- `autopilot-intent` session + fast-lane onboarding route
- API: project → strategy → queue 3 articles
- WP connect on project model

### Sprint 2 — Growth tier
- Enable Growth in `OFFERED_PLAN_IDS`
- Wire Stripe checkout + webhook plan resolution
- Growth quota: 30 articles/mo
- Pricing page SaaS cards

### Sprint 3 — Packaging
- Autopilot activity dashboard
- Compare page feature rows
- SMB case study section on success stories

### Sprint 4 — Residue closure (balanced)
- Quota exhausted → Growth Stripe checkout (toasts + inline prompts)
- Fast-lane WP connect: plugin + site key tab
- Dashboard link coverage + suggestion metrics
- Visual summary markdown block in SEO articles
- Article velocity counter (X/30) in dashboard + billing
- 25+ languages with honest marketing copy
- Compare infographics row → partial

---

## Risks & assumptions

1. AutoSEO quality is SMB-acceptable — humanization must be **demonstrable** in marketing
2. Backlink exchange drives retention — white-hat alternative must be **marketable**
3. Third-party pricing ($49/$99/$199) should be verified at live signup
4. Legacy company autopilot dual stack may confuse until bridged

---

## Related docs

- [babylovegrowth-teardown.md](./babylovegrowth-teardown.md) — BabyLoveGrowth hub (closest AI/GEO competitor)
- [babylovegrowth-parity-planner.md](./babylovegrowth-parity-planner.md) — goals.ac vs BLG + AutoSEO feature matrix
- [competitive-edge-prd.md](../competitive-edge-prd.md) — edge pillars and execution phases
- [goldsuite-ac-prd.md](../goldsuite-ac-prd.md) — product vision and tier draft
