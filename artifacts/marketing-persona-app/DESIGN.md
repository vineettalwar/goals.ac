---
name: goals.ac
description: Premium-minimal B2B content growth platform — paper surfaces, forest green primary, editorial marketing on dark hero bands.
colors:
  background: "#FAFAF8"
  foreground: "#1A1A1A"
  card: "#FFFFFF"
  border: "#E8E5E0"
  primary: "#2D3B2D"
  primary-foreground: "#FFFFFF"
  secondary: "#F5F3EF"
  muted-foreground: "#6B6560"
  accent-warm: "#e8702a"
  accent-warm-hover: "#d2611f"
  surface-dark: "#1A1A1A"
  destructive: "#C0392B"
typography:
  sans:
    fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  display:
    fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3.75rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  editorial:
    fontFamily: "var(--font-playfair), 'Playfair Display', serif"
    fontStyle: "italic"
    fontWeight: 400
rounded:
  sm: "calc(0.75rem - 4px)"
  md: "calc(0.75rem - 2px)"
  lg: "0.75rem"
  xl: "calc(0.75rem + 4px)"
  pill: "9999px"
spacing:
  section-y: "4rem"
  card-pad: "1.5rem"
  page-x: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 1rem"
    height: "2.5rem"
  button-primary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
  button-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 1rem"
  hero-cta-primary:
    backgroundColor: "{colors.accent-warm}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: "0.75rem 1.75rem"
  paper-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card-pad}"
---

## Overview

goals.ac uses **Tailwind CSS 4** with semantic CSS variables in `src/app/globals.css`. The system has two surface registers:

- **Paper (product + light marketing):** off-white background (`#FAFAF8`), forest-green primary (`#2D3B2D`), `paper-card` surfaces with subtle border and shadow.
- **Dark editorial (marketing heroes):** full-bleed photography, black bridge gradients, `glass-card` on dark bands only — never as a default app chrome pattern.

Stack: Next.js App Router, Radix primitives via shadcn-style `Button`, Lucide icons, GSAP for scroll marketing, `@tailwindcss/typography` for prose.

## Colors

| Role | Token | Hex | Usage |
|------|-------|-----|-------|
| Page bg | `--background` | `#FAFAF8` | App shell, forms, dashboards |
| Ink | `--foreground` | `#1A1A1A` | Body text, headings |
| Surface | `--card` | `#FFFFFF` | Cards, panels, inputs on light |
| Border | `--border` | `#E8E5E0` | Dividers, input borders |
| Brand | `--primary` | `#2D3B2D` | Buttons, rings, active step dots |
| Muted text | `--muted-foreground` | `#6B6560` | Secondary copy — keep ≥4.5:1 on `--background` |
| Warm CTA | `--accent-warm` | `#e8702a` | Hero primary CTA on dark photography |
| Dark band | `--surface-dark` | `#1A1A1A` | Marketing section bridges, hero foot |
| Error | `--destructive` | `#C0392B` | Destructive actions |

Marketing dark sections use white at 75–90% opacity for body copy, not gray-on-tint. Glass cards: `rgba(255,255,255,0.05)` fill, `rgba(255,255,255,0.1)` border, `backdrop-filter: blur(8px)` — **dark bands only**.

## Typography

| Role | Family | Notes |
|------|--------|-------|
| UI / body | Plus Jakarta Sans (`--font-jakarta`) | Weights 400–800; default for app and marketing |
| Editorial accent | Playfair Display italic (`--font-playfair`) | Sparingly on marketing — pull quotes, hero emphasis |
| Labels | `.marketing-section-label` | 12px, semibold, uppercase, `letter-spacing: 0.08em` |

Headings use `tracking-tight`. Display hero lines: clamp max ~3.75rem; avoid sub `-0.04em` letter-spacing on display. Body prose max ~65–75ch. Uppercase labels must use ≥0.08em tracking (WCAG 1.4.12).

## Elevation

**Paper cards** (`.paper-card`): `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` — no paired wide drop shadow.

**Paper hover** (`.paper-card-hover`): `translateY(-3px)` + `0 8px 24px rgba(0,0,0,0.08)` on hover; 250ms `cubic-bezier(0.16, 1, 0.3, 1)`.

**Glass cards** (`.glass-card`): border + translucent fill + 8px blur; hover lifts with brighter border — marketing dark sections only.

**Hero bridges**: `.hero-bridge`, `.section-bridge-top/bottom`, `.features-bridge` — black gradient scrims; not decorative page backgrounds.

## Components

### Surfaces (`marketing-surfaces.ts`)

- `cardSurfaceClass("paper")` → app UI, auth, settings, project lists
- `cardSurfaceClass("glass")` → marketing pages on `bg-black` bands (pricing tiers, success stories, video demo)

### Buttons (`src/components/ui/button.tsx`)

| Variant | Classes |
|---------|---------|
| default | `bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm` |
| outline | `border border-border bg-card hover:bg-secondary` |
| ghost | `hover:bg-secondary` |
| destructive | `bg-destructive` |

Sizes: `sm` (h-8), `default` (h-10), `lg` (h-11). Marketing hero uses `.hero-cta-primary` (warm pill) on dark photography.

### Motion

Hero entrances: `.hero-reveal`, `.hero-fade`, `.hero-zoom` with `cubic-bezier(0.16, 1, 0.3, 1)`. All disabled under `prefers-reduced-motion: reduce`. Step dots: `.step-dot` / `.active` / `.complete` with primary fill and soft ring.

### App patterns

- Dialogs: `max-w-2xl` forms, `max-h-[85vh] overflow-y-auto`
- Status colors: draft `muted-foreground`, ready blue, published green, error `destructive`, cached amber
- Sidebar: `--sidebar-bg` white, `--sidebar-border` matches `--border`

## Do's and Don'ts

**Do**

- Use semantic tokens (`bg-primary`, `text-muted-foreground`, `border-border`) — not raw hex in components
- Pick `paper` vs `glass` surface by route register: `(app)` → paper; dark marketing bands → glass
- Keep warm orange CTA for high-contrast hero conversion; forest green for in-app actions
- Test contrast on both `#FAFAF8` and `#000000` bands
- Honor reduced motion on all hero and card hover transitions

**Don't**

- Default to glassmorphism in the product app shell
- Pair `1px border` with wide soft shadows on the same card (ghost-card tell)
- Use cream/sand token names or warm-tinted near-white as the entire brand personality
- Add tracked uppercase eyebrows to every section — one deliberate label system max
- Use left accent rails, gradient text, or hero-metric stat grids
- Exceed `rounded-2xl` (16px) on large section cards; reserve full pill for tags and hero CTAs
