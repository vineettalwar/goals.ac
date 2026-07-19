# BabyLoveGrowth — GTM & Pricing Intelligence

**Workstream B** · July 2026

**Perspective:** How BLG sells vs how goals.ac sells today (consulting/partner-only), with AutoSEO as the self-serve benchmark.

---

## Pricing matrix (public, Jul 2026)

| Tier | BLG price/mo | Anchored from | Articles/mo | Notes |
|------|--------------|---------------|-------------|-------|
| Grow | **$99** | $247 | 30 auto-published SEO + LLM | Most popular; 20+ languages |
| Scale | **$299** | $599 | Same volume + specialist | 2 hrs/mo SEO/GEO expert; +3 languages; priority support |
| Agency | Custom | — | Reseller | White-label, client dashboard, book 15-min call |

**AutoSEO comparison (third-party verified):**

| Tier | Price/mo | Articles/mo |
|------|----------|-------------|
| Starter | $49 | ~25–30 |
| Pro | $99 | ~30–70 |
| Scale | $199 | up to ~150 |

**goals.ac today:**

| Track | Price | Offer |
|-------|-------|-------|
| Consulting / partner | No public pricing | Scoped GEO/AEO program + platform access |
| Future self-serve (hypothesis) | See [dual-track-gtm.md](./dual-track-gtm.md) | Not current GTM |

---

## BLG value anchoring

- **Price drop narrative:** $247 → $99 (60% off Grow); $599 → $299 Scale
- **Bundled backlink value:** "$800+ backlinks built monthly" on Grow plan
- **Volume math:** ~30 articles + ~7 contextual backlinks/mo (testimonial: Amelia Wilson) ≈ agency replacement
- **Agency comparison:** Implicit "$5k/mo agency" vs $99 autopilot (same playbook as AutoSEO)
- **Scarcity:** "24 spots left in July" on pricing page
- **Annual option:** "Yearly -25%" toggle on pricing

**Component stack (inferred from marketing + testimonials):**

| Component | BLG claimed value |
|-----------|-------------------|
| 30 SEO + LLM articles | Core product |
| Backlink network | $800+/mo |
| Keyword research | Included |
| GEO audit + competitor gap | Included |
| AI citation tracking | Included |
| Reddit visibility agent | Included |
| CMS auto-publish | Included |

---

## Trial & guarantee mechanics

| Mechanism | BLG | AutoSEO | goals.ac |
|-----------|-----|---------|----------|
| Trial type | 3-day free trial, **CC required** | 3 articles + plan, no CC on signup | Partner demo / discovery call |
| Money-back | 90-day organic traffic guarantee | 7-day monthly / 30-day annual | Per engagement scope |
| SLA | None explicit on pricing | "30 articles in first month or next month free" | None public |
| Annual discount | ~25% | ~4 months free | N/A |

**goals.ac opening:** BLG CC-gated trial creates friction. Free tools (GEO audit, llms.txt) + partner demo can substitute without copying trial mechanics.

---

## Agency / reseller program (BLG)

From pricing page "Want to offer SEO to your clients":

| Element | BLG offer |
|---------|-----------|
| Resell under your brand | White-label positioning |
| Client pricing control | Agency sets price |
| Dashboard visibility | Results-only or full dashboard |
| Multi-client management | "Manage all clients in one place" |
| Execution | "Content, backlinks, and SEO handled for you" |
| Entry | Book 15-min call |

**Testimonials:** Agency owners (Mighty Crulz, Justin Wallace) cite onboarding 15 clients in 2 months via BLG automation.

**goals.ac today:** Agency reseller on waitlist (`marketing-feature-data.ts` — `agency-reseller`). Multi-project org model exists; no white-label, client billing passthrough, or branded reports.

**Parity gap:** BLG has a live agency GTM; goals.ac partner program is consulting-led, not productized reseller.

---

## Social proof patterns

| Pattern | BLG | AutoSEO | goals.ac opportunity |
|---------|-----|---------|---------------------|
| Customer count | 4,000+ companies | 2,479+ businesses | Build partner case studies |
| Success stories | 17+ vertical case studies with GSC/Ahrefs charts | AVIAN Care GSC screenshots | GSC-backed template |
| Verification CTAs | "Verify with Ahrefs", "Verify with ChatGPT" | GSC screenshots | Add to success stories |
| Hero metrics | DR growth, impressions, traffic multiples | Click/impression growth | DR + AI citation % |
| Testimonial volume | 20+ on homepage carousel | Trustpilot | Partner quotes |
| Logo wall | Samwell, Myhair, Attention, etc. | Customer logos | Partner/client logos |

**BLG case study format (replicate for goals.ac):**

- Vertical tag (SaaS, D2C, agency)
- Before/after metric (DR 12→32, 620→14K reach, 3→2K daily visitors)
- Time to results (2 months, 7 days, 6 months)
- Named founder quote

---

## Acquisition channels (BLG)

| Channel | Evidence |
|---------|----------|
| Reddit | Justin Wallace: "found on reddit"; organic community mentions |
| Comparison / SEO content | Footer: "AI SEO Tool Comparison", "Link Building Tool Comparison" |
| Free tools | GEO audit, llms.txt, playbooks — SEO lead magnets |
| Academy | "SEO/AEO Academy" in footer |
| Affiliate | "Earn with Affiliate" nav item |
| Long-form sample articles | Homepage myhair.ai article ranks as content marketing |
| Claude MCP | Developer-adjacent distribution |

**AutoSEO channels:** Comparison pages ("AutoSEO vs ChatGPT"), sister product GrowthGrid cross-promotion.

---

## Free GEO audit as top-of-funnel

BLG repeats "Do ChatGPT, Claude, Perplexity & Gemini recommend your website?" with "Run free audit" CTA on homepage (twice) and success stories footer.

**goals.ac:** `/geo-audit` marketing page + anonymous `POST /api/public/geo-audits/generate` (rate-limited: 5/IP/hour) and public GET by id. Also on CF public worker. Soft waitlist/signup capture on results.

**Parity action:** Done — anonymous rate-limited GEO audit lead magnet.

---

## goals.ac GTM implications (consulting-led, partner-only)

Current reality: **no public pricing, no self-serve checkout.** Parity vs BLG/AutoSEO is **product demo + partner narrative**, not price matching.

### Partner demo script (15 min)

1. **URL in** — fast-lane or live brand scan (`website-projects/route.ts`)
2. **30-day strategy** — show calendar with keywords + intent
3. **Sample article** — humanized output + quality score breakdown (counter BLG 95/100)
4. **Visibility dashboard** — LLM citations + GEO score trend (counter BLG "rank on ChatGPT")
5. **CMS publish** — one-click to their stack (counter BLG "works with your CMS")
6. **White-hat links** — internal link hub, not exchange (counter BLG $800 backlinks)

### Messaging vs BLG (consulting track)

| BLG pitch | goals.ac counter |
|-----------|------------------|
| "$99/mo, everything automatic" | "Managed GEO/AEO program — editorial control, measurable citations, no black box" |
| "$800+ backlinks/month" | "Content clusters + internal links — no exchange penalty risk" ([white-hat-link-strategy.md](./white-hat-link-strategy.md)) |
| "Rank on ChatGPT" | "Live citation tracking across 4 engines + weekly GEO re-audit" |
| "95/100 article quality" | "Humanized output + inspectable scores — edit burden measured, not assumed" |
| "4-minute setup" | "Fast-lane for partners; 12-month strategy depth BLG can't match" |
| "Agency reseller" | "Partner program with strategist + platform — not a white-label box" |

### Messaging vs AutoSEO (consulting track)

| AutoSEO pitch | goals.ac counter |
|---------------|------------------|
| "$49/mo cheapest autopilot" | "Strategy-first program, not article spam" |
| "100 DA backlinks/month" | Same white-hat counter as BLG |
| "No CC trial" | "Discovery call + free tools, no CC" |
| Infographics + hosted blog | "CMS-native publish + 18 content formats" |

### What goals.ac should NOT copy

- Backlink exchange network (BLG + AutoSEO)
- CC-gated 3-day trial (BLG)
- Fake scarcity ("24 spots left")
- Public $99 price war (deferred — see [dual-track-gtm.md](./dual-track-gtm.md) for future self-serve hypothesis)

### What to borrow

- GSC/Ahrefs verification CTAs on case studies
- Public article quality score demo on marketing
- Anonymous GEO audit lead magnet
- Agency case study format (DR, AI citation %, time-to-results)
