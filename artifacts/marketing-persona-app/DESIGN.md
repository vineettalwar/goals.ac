---
name: goals.ac
description: Typeset editorial + SEO control room — newsprint and ink, IBM Plex chrome, Source Serif body, amber signal only.
colors:
  background: "#F3EFE6"
  foreground: "#0A0A0B"
  card: "#F3EFE6"
  border: "#C9C2B4"
  primary: "#D97706"
  primary-foreground: "#0A0A0B"
  secondary: "#E8E2D6"
  muted-foreground: "#5A554C"
  accent-warm: "#D97706"
  accent-warm-hover: "#B45309"
  accent-warm-foreground: "#0A0A0B"
  ink: "#0A0A0B"
  newsprint: "#F3EFE6"
  studio-chrome: "#0A0A0B"
typography:
  sans:
    fontFamily: "var(--font-sans-face), 'IBM Plex Sans', sans-serif"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  display:
    fontFamily: "var(--font-sans-face), 'IBM Plex Sans', sans-serif"
    fontSize: "clamp(2rem, 4.5vw + 0.5rem, 3.5rem)"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-0.02em"
  article:
    fontFamily: "var(--font-serif-face), 'Source Serif 4', Georgia, serif"
    fontSize: "1.0625rem"
    lineHeight: 1.7
    measure: "65ch"
  mono:
    fontFamily: "var(--font-mono-face), 'IBM Plex Mono', ui-monospace, monospace"
    fontSize: "0.75rem"
rounded:
  sm: "0.125rem"
  md: "0.125rem"
  lg: "0.125rem"
  xl: "0.25rem"
spacing:
  section-y: "6rem"
  card-pad: "1rem"
  page-x: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 1rem"
    height: "2.5rem"
  hero-cta-primary:
    backgroundColor: "{colors.accent-warm}"
    textColor: "{colors.accent-warm-foreground}"
    rounded: "{rounded.sm}"
    padding: "0.75rem 1.25rem"
  hairline-panel:
    backgroundColor: "transparent"
    border: "1px solid {colors.border}"
    rounded: "{rounded.sm}"
---

## Overview

goals.ac is a **typeset editorial desk** and **SEO control room**, not a forest-green SaaS costume and not a cinematic nature hero.

Two registers, one palette:

- **Marketing (goals.ac):** newsprint `#F3EFE6` field, ink `#0A0A0B` type, hairline rules, masthead headline. No full-bleed photography, no green-black canvas, no orbs/gradients/logo soup.
- **Studio (app.goals.ac):** ink-dark chrome (`#0A0A0B`) with a newsprint article column (~65ch serif). Copy-desk bar: status · score · Approve.

Stack: Next.js marketing export (`artifacts/marketing-pages` from `marketing-persona-app`), Vite product SPA (`artifacts/goals-app-ui`), shared tokens in `lib/app-shell/src/product-theme.css`.

## Colors

| Role | Token | Hex | Usage |
|------|-------|-----|-------|
| Newsprint | `--newsprint` / `--background` (light) | `#F3EFE6` | Marketing page field, article canvas |
| Ink | `--ink` / `--foreground` (light) | `#0A0A0B` | Body, headlines, chrome on newsprint |
| Hairline | `--border` | `#C9C2B4` | Rules, panels, inputs |
| Signal | `--primary` / `--accent-warm` / `--signal` | `#D97706` | **Only** accent: CTAs, scores, gates |
| Signal hover | `--accent-warm-hover` | `#B45309` | CTA hover |
| Signal text | `--primary-foreground` | `#0A0A0B` | Text on amber (contrast) |
| Muted | `--muted-foreground` | `#5A554C` | Secondary copy — ≥4.5:1 on newsprint |
| Studio chrome | `--studio-chrome` / `.dark --background` | `#0A0A0B` | App shell, sidebar |
| Error | `--destructive` | `#C0392B` | Destructive actions |

**Banned:** forest green (`#2D3B2D`, sage paper, `#121412` green-black), electric blue as a second accent, soft card shadows.

Links are ink + underline, not a second color. Scores use amber (`score-signal`), not blue.

## Typography

| Role | Family | Notes |
|------|--------|-------|
| UI chrome | IBM Plex Sans (`--font-sans-face`) | Nav, buttons, forms, marketing headlines |
| Article body | Source Serif 4 (`--font-serif-face`) | Draft/review column, ~65ch |
| Scores / URLs / schema / timestamps | IBM Plex Mono (`--font-mono-face`) | Copy-desk, citations, dateline |

**Banned as brand signature:** Plus Jakarta Sans; Playfair Display; italic display headlines; italic serif paired with oversized sans in the hero.

Headings are roman IBM Plex, weight 600, tracking-tight (not below `-0.04em`). Uppercase labels: `.marketing-section-label` or `font-mono` + ≥0.08em tracking.

## Elevation

Hairline only: `1px solid var(--border)`, radius `0.125rem`, **no** drop shadow, **no** oversized radius, **no** paper-card lift.

Utilities: `.hairline-panel`, `.paper-card` (alias, shadowless), `.article-canvas`, `.copy-desk-bar`.

## Surfaces

### Marketing hero

Fixed masthead: one H1, one deck, solid amber primary CTA, text secondary, dateline/metrics strip (scores, CMS, approve-before-live). Newsprint ground. No rotating offers, no photo, no spotlight.

### Studio article canvas

Seeded on the content-piece draft/review screen:

1. Copy-desk bar — status, score, Approve
2. Center serif draft column on newsprint
3. Right rail — brief, SERP/editorial scores, citations (mono labels, hairline panels)

No AI purple sparkle. Generate/Humanize/Enhance use existing lucide actions (`RefreshCw`, `PenLine`, `TrendingUp`).

## Components

### Buttons

| Variant | Treatment |
|---------|-----------|
| default / CTA | Amber fill, ink label, `rounded-sm`, no shadow |
| outline | Hairline border, transparent fill |
| ghost / secondary | Text + underline on marketing |

### App patterns

- **Page chrome (locked):** `APP_SHELL_PAGE` / `APP_SHELL_PAGE_WIDE` from `@workspace/app-shell/shell-constants`. Left-aligned. Inner 65ch article measure is allowed.
- Sidebar: ink (`--sidebar-bg: #0A0A0B`) in the product app.

## Token files

| File | Role |
|------|------|
| `lib/app-shell/src/product-theme.css` | Source of truth (ink, newsprint, signal, hairline, studio utilities) |
| `artifacts/marketing-persona-app/src/app/globals.css` | Imports product-theme; Tailwind `@theme`; marketing utilities |
| `artifacts/goals-app-ui/src/index.css` | Imports product-theme; product SPA `@theme` |
| `artifacts/goals-app-ui/index.html` | IBM Plex + Source Serif 4 + Plex Mono; `html.dark` studio chrome |
| `artifacts/marketing-persona-app/src/app/layout.tsx` | `next/font` faces |
| `artifacts/marketing-persona-app/src/lib/marketing/site/marketing-critical-css.ts` | Static export FOUC (newsprint, not black) |
| `artifacts/marketing-persona-app/src/components/ui/button-variants.ts` | Hairline radius, no CTA shadow |

`artifacts/marketing-pages` is the Cloudflare Pages deploy of the marketing static export — change tokens/components in `marketing-persona-app`, then rebuild the export.

## Do's and Don'ts

**Do**

- Use semantic tokens (`bg-background`, `text-foreground`, `bg-primary`)
- Keep amber as the only signal
- Set article body in Source Serif at ~65ch
- Put scores/URLs/timestamps in IBM Plex Mono
- Test contrast: ink on newsprint, ink on amber, newsprint on ink chrome

**Don't**

- Reintroduce forest green, sage paper, or `#121412` green-black
- Use Plus Jakarta or Playfair italic as identity
- Pair italic serif display with a second oversized sans in the hero
- Ship full-bleed cinematic / nature photography as the marketing hero
- Add a blue accent for links
- Soft shadows, pills on primary CTAs, glass orbs, logo soup
- Invent per-page product shells — use `APP_SHELL_PAGE` / `APP_SHELL_PAGE_WIDE`
