# PRD conformance tranche — goals.ac autonomous SEO platform

**Date:** 2026-09-04
**Branch:** `claude/goals-ac-prd-review-wvxq2q`
**Source PRD:** the goals.ac product PRD (onboarding → scrape → style audit → integrations → autonomous engine → multi-channel publish).

## Problem

The product PRD was re-read against the shipped codebase. Most of it is already built: the scrape and brand-extraction engine, the resumable Typeform onboarding, GSC sync and opportunity scoring, the weekly ideation sweeps, the humanizer and slop gate, the approval workflow, and WordPress / LinkedIn / Twitter publishing all exist. Six requirements are either unimplemented or implemented narrower than the PRD states. This tranche closes them.

## Conformance audit

| PRD § | Requirement | Status | Evidence |
|---|---|---|---|
| 2.1 | Company name + URL kick off a crawl | Done | `onboarding/steps.ts` `firm_name`/`website`; `runBrandScrapeWithDiscovery` |
| 2.2 | NLP style analysis → brand voice profile | Partial | `brand-scraper.ts` derives tone qualitatively via LLM. No measured style signal. **Gap 2** |
| 2.2 | Branch on style-data sufficiency | **Missing** | `evaluateProjectVoiceReady` is a presence check, not a sufficiency check. **Gap 3** |
| 2.3 | 3–5 question style questionnaire fallback | **Missing** | No conditional questionnaire steps in the registry. **Gap 3** |
| 2.4 | LinkedIn / GSC / CMS integrations | Done | `connectors/linkedin.ts`, `search_property_connections`, WordPress steps |
| 2.5 | Rolling calendar of ideas awaiting approval | Done | `keywordOpportunitySweep`, Daily Five, content studio calendar |
| 3.1.1 | Recursive crawl to a configurable depth, default 20 pages | Partial | One hop off the homepage, hard-capped at 8 supplemental pages. **Gap 1** |
| 3.1.2 | Store style vectors (tone, sentiment, structural layout) per workspace | Partial | Qualitative fields only, no vector. **Gap 2** |
| 3.2.1 | GSC low-hanging fruit, positions 11–30 | Partial | Striking distance band is 4–20; 21–30 is invisible. **Gap 4** |
| 3.2.2 | Weekly suggestions with title, keyword, intent, outline | Done | `ARTICLE_IDEA_SOURCE_SYNC_CRON`, `KEYWORD_OPPORTUNITY_SWEEP_CRON` |
| 3.3.1 | Multi-step generation with web search grounding | Done | `seo-content-generator.ts`, citations, proof assets |
| 3.3.2 | Humanization pass removing AI tells | Done | `humanizer.ts`, `ai-writing-rules.ts`, slop scoring |
| 3.4.1 | Ideas / Ready for review / Published | Done | `approvalStatus` + content studio hub filters |
| 3.4.2 | Markdown / WYSIWYG editing before approval | Done | content piece editor |
| 3.4.3 | WordPress / LinkedIn / Twitter push | Done | `connectors/wordpress.ts`, `linkedin.ts`, `twitter-thread.ts` |
| 4.1 | Scrape report ≤ 60s, article ≤ 3 min | Unmeasured | No budget instrumentation. **Gap 5** |
| 4.2 | AES-256 at rest | Done | `lib/security/src/encryption.ts`, aes-256-gcm |
| 4.2 | GDPR on scraped website data | Partial | The brand crawler ignores `robots.txt` `Disallow`. **Gap 6** |

## Scope — in

**Gap 1 — crawl budget and depth.** `discoverBrandScanUrls` gains a configurable `maxPages` (default 20) and `maxDepth` (default 2), and the scraper follows internal links breadth-first to that budget instead of one hop off the homepage. Existing scoring, sitemap/GSC/CMS priority, and same-origin restriction stay.

**Gap 2 — measured style vector.** A deterministic `computeStyleVector()` over the scanned corpus: sentence-length mean and spread, paragraph shape, reading grade, vocabulary tier, question/first-person/second-person/contraction rates, list and heading density. Persisted on `brand_profiles.brand_memory.styleVector` (jsonb, type-only, no migration) and rendered into the generation prompt so cadence is matched from measurement, not adjectives.

**Gap 3 — sufficiency branch and questionnaire fallback.** `evaluateStyleSufficiency()` scores the corpus (usable pages, total words, extraction confidence). When it comes back insufficient, onboarding inserts three style questions — how you'd describe the firm to someone at a bar, competitors, jargon you love or hate — and their answers seed the brand profile. When it is sufficient, those steps never render.

**Gap 4 — striking distance band.** The GSC scorer covers positions 4–30, with 11–30 classified as `low_hanging_fruit` and scored on impression-weighted proximity to page one.

**Gap 5 — performance budgets.** Scrape and generation record elapsed milliseconds and log a warning when they cross the PRD's 60s / 180s budgets. Instrumentation only: no request is failed on a budget breach.

**Gap 6 — robots.txt.** The brand crawler fetches and honours `robots.txt` `Disallow` for its own user agent, cached per origin for the run. A disallowed URL is skipped, never fetched.

## Scope — out

- Programmatic SEO builder, internal-linking automation beyond what ships, post-publish analytics (all Phase 2 in the source PRD).
- Any change to publishing destinations, the approval state machine, or billing.
- Making a budget breach fail a request. Measure first.

## Technical approach

New modules under `lib/content-engine/src/brand/` (`style-vector.ts`, `style-sufficiency.ts`, `robots-txt.ts`) are pure and unit-tested. Wiring touches `brand-scraper.ts`, `brand-scan-discovery.ts`, `brand-extract-apply.ts`, `brand-context-loader.ts`. GSC work is confined to `lib/seo-tools/src/gscOpportunityScorer.ts`. Onboarding work is confined to the app's step registry, step components and `complete-session.ts`, plus the step-id union in `lib/db/src/schema/onboarding_sessions.ts` (jsonb — no migration).

## Edge cases

- A site with one page: crawl stops at the budget floor, sufficiency reports insufficient, questionnaire renders.
- `robots.txt` missing, 500, or unparseable: treated as fully allowed (the standard's own fallback).
- `robots.txt` disallowing everything: no supplemental pages fetched; the homepage still counts as user-supplied and is fetched.
- A crawl that hits `maxPages` before `maxDepth`: budget wins.
- Style vector over an empty corpus: all zeros, `vocabularyTier: "plain"`, and it must not be written into brand memory.
- Existing projects with no `styleVector` in brand memory: prompts fall back to the qualitative tone line.
- Positions 21–30 with under 100 impressions: still filtered out by the existing floor.
- A firm that skips the questionnaire: nothing is written, generation still runs off whatever the site gave.
- Two onboarding tabs answering questionnaire steps: existing optimistic-concurrency path covers it.

## Success criteria

- `pnpm run typecheck:libs` clean; `marketing-persona-app`, `worker`, `cf-jobs-worker` typecheck clean.
- Every new module has unit tests; the whole suite stays green.
- A crawl of a 40-page site fetches at most 20 pages and never a disallowed path.
- An insufficient site routes into the questionnaire and its answers reach the brand profile.
- A position-24 query with real impressions surfaces as an opportunity.

## Open questions

- Should the crawl budget be per-plan rather than a constant? Left as a constant with an options override until there is usage data.
- The 60s scrape budget is unreachable when the LLM extraction is slow. Instrumentation will show whether the budget or the pipeline needs to move.
