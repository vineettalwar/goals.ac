# goals.ac Parity Planner — vs BabyLoveGrowth & AutoSEO

**Workstream C** · July 2026

**Subject:** goals.ac  
**Competitors:** [BabyLoveGrowth.ai](https://www.babylovegrowth.ai/en) (primary — closest AI/GEO positioning), [AutoSEO](https://getautoseo.com/) (secondary — self-serve SMB benchmark)

**GTM context:** goals.ac is **consulting-led, partner-only, no public pricing**. Phases below optimize **partner demo + product depth**, not self-serve checkout. Future self-serve track: [dual-track-gtm.md](./dual-track-gtm.md).

---

## Three-way feature matrix

| Feature | BabyLoveGrowth | AutoSEO | goals.ac today | Parity target | Phase |
|---------|----------------|---------|----------------|---------------|-------|
| **Positioning** | AI search + Google autopilot | Daily articles + backlinks | Strategy-first GEO/AEO platform | Own "managed GEO/AEO" lane | — |
| **Public pricing** | $99 / $299 | $49 / $99 / $199 | None (consulting) | Keep consulting-led; note competitor advantage | Deferred |
| **Onboarding** | URL → 4 min, CC trial | URL → 4 min, no CC | Fast-lane + full path | Partner demo: URL → 3 articles → visibility | 1 |
| **30 articles/mo** | Grow plan default | All paid tiers | Engine yes; quota blocks SMB | Partner engagements unblocked by quota | 1 |
| **30-day content plan** | Yes | Yes | Yes | Showcase in demo | 1 |
| **12-month roadmap** | No | No | Yes | Lead differentiator in partner pitch | — |
| **Daily autopilot** | Yes | Yes | Cron live, off by default | Enable + surface in dashboard | 1 |
| **Humanization** | Not marketed | Not marketed | Live (`humanizer.ts`) | Demo side-by-side vs BLG sample | 1 |
| **Article quality score** | Public 95/100 demo | None | In-app `/100` | Marketing score demo page | 1 |
| **Brand voice / colors** | Homepage showcase | Unknown | Brand scan + voice RAG | Brand tailoring on `/brand-voice` | 2 |
| **Infographics** | Per-article (testimonials) | Hero + infographic | Images only | Template infographics in pipeline | 3 |
| **CMS publish** | WP, Webflow, Shopify, Wix, API | ~11 + hosted blog | 16 CMS + webhook + API | Already ahead — demo breadth | — |
| **Hosted blog** | No | Yes | No | Subdomain fallback (if self-serve ships) | Deferred |
| **Public API** | Yes (custom CMS) | No | v1 publish/render | Demo for dev partners | — |
| **Backlink exchange** | 4,000+ network ($800+/mo) | 5–10/mo exchange | None (by design) | White-hat internal link hub | 2 |
| **Internal linking** | In-article | Pillar links | Beta hub + generation | Surface in autopilot dashboard | 2 |
| **GEO technical audit** | Yes + free lead magnet | Unknown | Yes + weekly re-audit | Anonymous free audit (rate-limited) | 2 |
| **LLM visibility tracking** | 4 engines, dashboard | Marketing only | 4 engines, scheduled | Unify with autopilot panel | 1 |
| **Reddit visibility** | "Engine" — find threads | No | LLM-simulated suggestions | Reddit API eval or keep manual-assist | 3 |
| **Languages** | 50+ marketed; 20+ Grow | 100 | 10 | Expand to 20+ | 3 |
| **Content formats** | Blog-focused | Blog-focused | 18+ formats + repurposing | Lead with studio breadth | — |
| **Social / ESP publish** | No | No | 6 social + 3 ESP | Partner differentiator | — |
| **Agency reseller** | White-label program | Unknown | Waitlist | Partner workspace + reports | 3 |
| **Free tools** | GEO, llms.txt, MCP, checkers | Limited | More tools; GEO needs auth | Anonymous GEO audit | 2 |
| **Case studies** | 17+ GSC/Ahrefs verified | GSC screenshots | Consulting testimonials | GSC template + verify CTAs | 2 |
| **BYOK / cost transparency** | No | No | Yes | Partner pitch differentiator | — |
| **Editorial control** | Black-box autopilot | Partial review | Full review + draft default | Feature, not limitation | — |

**Legend:** Phase 1 = partner demo readiness · Phase 2 = lead-gen parity · Phase 3 = depth · Deferred = future self-serve · — = goals.ac already wins or intentional gap

---

## Phase 1 — Partner demo readiness (2–3 weeks)

**Goal:** Win partner conversations against BLG $99 autopilot and AutoSEO $49 entry without public pricing.

| # | Deliverable | vs BLG | vs AutoSEO | Key files |
|---|-------------|--------|------------|-----------|
| 1.1 | **Unified autopilot activity panel** — articles generated, published, LLM citation delta, GEO score trend | Matches "one dashboard" testimonials | Exceeds (visibility + GEO) | New panel composing `autopilot/`, `ai-visibility-dashboard.tsx`, `geo-audit-panel.tsx` |
| 1.2 | **Marketing article quality demo** — public score breakdown like BLG 95/100 | Parity on showcase | Ahead (no AutoSEO scorecard) | Adapt `article-quality-panel.tsx` for marketing |
| 1.3 | **Fast-lane demo path** — URL → project → 3 articles → visibility snapshot in 15 min | Faster than full onboarding | Comparable to 3-article trial | `autopilot-url-hero.tsx`, `onboarding/fast-lane/` |
| 1.4 | **Humanization demo asset** — before/after side-by-side for partner deck | Counter "generic BLG output" | Counter AutoSEO volume-over-voice | `humanizer.ts` output samples |
| 1.5 | **Internal positioning doc rows** — BLG/AutoSEO-specific compare rows (keep public compare generic) | Sales enablement | Sales enablement | This doc + hub teardown |

**Success criteria:** Partner can run live demo without navigating Publishing tab buried settings.

**Shared with AutoSEO Sprint 1/3:** Fast-lane polish, autopilot activity dashboard — build once, demo against both competitors.

---

## Phase 2 — Lead-gen parity (3–4 weeks)

**Goal:** Match BLG/AutoSEO top-of-funnel without self-serve pricing.

| # | Deliverable | vs BLG | vs AutoSEO | Key files |
|---|-------------|--------|------------|-----------|
| 2.1 | **Anonymous GEO audit** — rate-limited, optional email capture | Matches free audit CTA | Ahead if AutoSEO lacks | `geo-audit/page.tsx`, `api/public/geo-audits/generate/route.ts` (auth remains `api/geo-audits/generate`) |
| 2.2 | **Internal link hub in autopilot dashboard** — suggested links count, cluster view | White-hat counter to $800 backlinks | White-hat counter to DA backlinks | `internal-links-panel.tsx` |
| 2.3 | **Brand tailoring showcase** — colors, voice, cross-links on `/brand-voice` | Matches BLG homepage "written like you" | Ahead | `brand-voice/page.tsx`, `project-brand-tab.tsx` |
| 2.4 | **GSC case study template** — DR, impressions, AI citation %, verify CTAs | Matches BLG success stories | Matches AVIAN Care format | Marketing success stories |
| 2.5 | **Compare page FAQ refresh** — backlink exchange, editorial control, consulting GTM | Honest vs both | Honest vs both | `compare-page-client.tsx` |

**Success criteria:** Inbound lead can run free GEO audit and see brand-voice demo without sales call.

---

## Phase 3 — Partner program & depth (6+ weeks)

**Goal:** Productize partner/agency motion vs BLG reseller program.

| # | Deliverable | vs BLG | vs AutoSEO | Key files |
|---|-------------|--------|------------|-----------|
| 3.1 | **Partner workspace** — multi-client org view, shared reporting template | Counter white-label reseller | N/A | Org model, new partner UI |
| 3.2 | **Infographic templates** — 1–2 per article in autopilot | Match testimonial expectations | Match per-article visuals | Content pipeline |
| 3.3 | **Language expansion** — 10 → 20+ with Semrush DB mapping | Partial parity (BLG claims 50+) | Behind AutoSEO 100 | `supported-languages.ts` |
| 3.4 | **Reddit decision** — Reddit API integration vs manual-assist positioning | Real threads vs simulated | N/A | `reddit-discovery/route.ts` |
| 3.5 | **Digital PR assist** (optional) — HARO surfacing, outreach drafts | Long-term white-hat links | Long-term | [white-hat-link-strategy.md](./white-hat-link-strategy.md) Phase 2 |

---

## Explicitly out of scope

| Item | Rationale | BLG | AutoSEO |
|------|-----------|-----|---------|
| Backlink exchange network | PBN-adjacent; Google spam-policy risk | Core product | Core product |
| Public self-serve $99 pricing | Current GTM is consulting/partner-only | Their hook | Their hook |
| Fake scarcity ("24 spots left") | Trust erosion | Uses it | No |
| CC-gated 3-day trial | Friction; free tools + demo substitute | Uses it | No CC |
| Hosted blog fallback | Only if self-serve ships | No | Yes |
| Reddit auto-posting | Spam risk; manual-assist only | No (find threads) | No |

---

## Sprint alignment (avoid duplicate work)

| goals.ac work item | BLG parity | AutoSEO parity | Existing sprint ref |
|--------------------|------------|----------------|---------------------|
| Fast-lane onboarding | Phase 1 | Sprint 1 | [getautoseo-teardown.md](./getautoseo-teardown.md) Sprint 1 |
| Autopilot activity dashboard | Phase 1 | Sprint 3 | Both teardowns |
| Anonymous GEO audit | Phase 2 | Lead gen | BLG-specific |
| Internal link hub surface | Phase 2 | White-hat counter | [white-hat-link-strategy.md](./white-hat-link-strategy.md) |
| Stripe Growth tier | Deferred | Deferred | [dual-track-gtm.md](./dual-track-gtm.md) — future only |
| Infographics | Phase 3 | Sprint 4 | Both |
| 100 languages | Phase 3+ | Sprint 4 | Long-term |

---

## Partner pitch cheat sheet (goals.ac vs both)

**When prospect mentions BabyLoveGrowth:**

- "Same AI visibility tracking — we measure ChatGPT, Perplexity, Claude, Gemini with scheduled snapshots."
- "Same 30-day calendar — plus a 12-month strategy BLG doesn't offer."
- "No backlink exchange risk — we build internal clusters and citation-worthy depth."
- "You see every draft, every cost (BYOK), and every quality score — not a black box."

**When prospect mentions AutoSEO:**

- "Same autopilot velocity — better humanized articles and strategy depth."
- "Broader CMS (16 vs ~11) plus social and email repurposing."
- "No link scheme — and a consulting track when you outgrow self-serve tools."
- "Public API if your stack is custom code."

**When prospect wants cheapest option:**

- Acknowledge BLG $99 / AutoSEO $49 self-serve advantage honestly.
- Reframe: true cost = edit time + link-scheme risk + strategy gap.
- Offer scoped consulting engagement, not price matching.

---

## Verification checklist

- [ ] Every "goals.ac today" row verified against codebase (see [goals-ac-capability-audit.md](./goals-ac-capability-audit.md))
- [ ] No phase assumes public pricing unless GTM changes
- [ ] BLG pricing from public page Jul 2026; agency terms inferred
- [ ] AutoSEO pricing from [getautoseo-gtm-pricing.md](./getautoseo-gtm-pricing.md)
- [ ] LLM visibility accuracy limits documented (simulated checks, not direct engine API)
