# PRD: Content Engine Awesome (marketing → product)

**Status:** Shipped 2026-09-11  
**ICP:** Founder / growth lead (partner demos stay credible)  
**Related:** [executive-diagnosis.md](../competitors/executive-diagnosis.md), [content-studio-competitive-plan.md](./content-studio-competitive-plan.md), [PRODUCT.md](../../artifacts/marketing-persona-app/PRODUCT.md)

## Problem

goals.ac is engine-rich and experience-thin. Marketing sells an 18-format catalog and splits naming across Content Engine / Studio / Autopilot. The product’s real weekly path is Studio create → humanize → score → publish, but MOFU formats SEO buyers need (comparison, listicle, case study) are not first-class, and create has too many steps.

## User story

As a B2B founder or growth lead, I want to understand the SEO production loop on the marketing site and then publish a comparison / listicle / case study in one session, so I ship weekly content without an agency and without AI slop.

## Success criteria

1. `/` and `/content-engine` explain research → draft → humanize → score → publish with human review.
2. Nav and page chrome use **Content Studio** (URL stays `/content-engine`).
3. Marketing format lists match the default `blog_wordpress` surface (plus MOFU formats once shipped).
4. Studio Express create: format → keyword → review → generate.
5. One “This week’s queue” CTA from Studio / project empty states.
6. `comparison`, `listicle`, `case_study` in schema, SEO pipeline, and picker.

## Scope in

- Phase 1: marketing naming, homepage pipeline, `/content-engine` rebuild, Autopilot/FAQ alignment, format honesty.
- Phase 2: Express create, This week spine, MOFU formats, Autopilot tab label, marketing sync.

## Scope out

Surfer NLP, hosted blog, fake case stories, social on default picker, Vite dual-create merge, pricing currency overhaul.

## Technical approach

Package existing `lib/content-engine` surfaces; extend `CONTENT_FORMAT_TYPES` + `SEO_LONGFORM_FORMATS`; Express skips wizard steps only (quality gates unchanged).

## Edge cases

- Express still runs auto-humanize and publish readiness.
- Schema change requires Postgres + D1 generate.
- Marketing Phase 1 must not list MOFU formats until Phase 2 ships them (then sync).
