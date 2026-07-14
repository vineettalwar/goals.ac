# Design System

## Overview

goals.ac uses **Tailwind CSS 4** with a custom design token layer built on CSS custom properties. The design has two modes — a dark "glass" aesthetic for the main app pages and a clean light mode with subtle borders and shadows for forms and dashboards.

## Color Tokens

All colors are defined as HSL CSS variables in `artifacts/goals-ac/src/index.css` and exposed through the Tailwind `@theme inline` block.

### Light Mode (`:root`)
| Token | Value | Usage |
|---|---|---|
| `--background` | `210 20% 98%` | Page background (near-white blue-tinted) |
| `--foreground` | `222 47% 10%` | Primary text |
| `--card` | `0 0% 100%` | Card backgrounds |
| `--border` | `214 32% 91%` | Border color |
| `--primary` | `221 83% 53%` | Blue accent (`#3B82F6`) |
| `--muted` | `210 40% 96%` | Muted backgrounds |
| `--destructive` | `0 84% 60%` | Error/delete red |

### Dark Mode (`.dark`)
| Token | Value | Usage |
|---|---|---|
| `--background` | `222 47% 5%` | Deep navy page background |
| `--foreground` | `210 40% 98%` | Near-white text |
| `--card` | `222 47% 8%` | Dark card backgrounds |
| `--border` | `217 33% 17%` | Subtle border |
| `--primary` | `217 91% 60%` | Slightly lighter blue for contrast |

## Dark / Light Mode Strategy

- Mode is toggled via a `dark` class on `<html>`, stored in `localStorage`.
- The `@custom-variant dark (&:is(.dark *))` directive applies all `dark:` utilities correctly without relying on `prefers-color-scheme`.
- Pages default to dark mode on first visit.

## Glass Card Patterns

The signature "glass" look is used on dark backgrounds (hero sections, roadmap pages):

```css
/* Glass card — dark mode only */
.glass-card {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  backdrop-filter: blur(12px);
  border-radius: var(--radius-lg);
}

.glass-card-md {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.10);
  backdrop-filter: blur(16px);
}
```

In light mode, glass cards automatically fall back to standard card styling:
```css
/* Light mode override */
:root .glass-card,
:root .glass-card-md {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  backdrop-filter: none;
}
```

**Rule**: Never use `glass-card` without a light mode fallback. Always test both modes.

## Typography

| Variable | Font | Usage |
|---|---|---|
| `--font-sans` | Plus Jakarta Sans (400–800) | All UI text |
| `--font-mono` | JetBrains Mono (400–500) | Code blocks, IDs, hash values |

Typography scale uses Tailwind's default `text-xs` through `text-4xl`. The `@tailwindcss/typography` plugin is available for prose content (markdown-rendered articles).

### Font Loading
Fonts are loaded via Google Fonts in `index.css`. No local font files are bundled.

## Border Radius

| Token | Value |
|---|---|
| `--radius-sm` | `--radius - 4px` |
| `--radius-md` | `--radius - 2px` |
| `--radius-lg` | `--radius` (base: 8px) |
| `--radius-xl` | `--radius + 4px` |

## Component Conventions

### Buttons
- Primary: `bg-primary text-primary-foreground` — blue fill
- Outline: `border border-input bg-background` — transparent with border
- Destructive: `bg-destructive text-destructive-foreground`
- Size variants: `sm`, `default`, `lg` — use `sm` in dense UIs (tables, cards)

### Cards
- Standard: `rounded-lg border bg-card text-card-foreground shadow-sm`
- Glass (dark only): `glass-card` or `glass-card-md` utility class
- Light mode cards use `border shadow-xl bg-background` with no blur

### Badges
```tsx
<Badge variant="secondary">draft</Badge>
<Badge variant="outline">published</Badge>
```

### Dialogs
- Max width: `max-w-2xl` for content forms, `max-w-lg` for confirmations
- Always include `max-h-[85vh] overflow-y-auto` for scrollable content

### Status Colors
| Status | Class |
|---|---|
| Draft | `text-muted-foreground` |
| Ready | `text-blue-600 dark:text-blue-400` |
| Published | `text-green-600 dark:text-green-400` |
| Error | `text-destructive` |
| Cached | `text-amber-600 dark:text-amber-400` |

## Brand Assets

| Asset | Location | Usage |
|---|---|---|
| Favicon | `artifacts/goals-ac/public/favicon.svg` | Browser tab icon — SVG with three blue circles (target/bullseye motif) |
| OG Image | `artifacts/goals-ac/public/og-image.png` | OpenGraph social preview (1200×630) |
| OpenGraph JPG | `artifacts/goals-ac/public/opengraph.jpg` | Alternative OG format |

### Logo Usage
The logo mark consists of three blue circles arranged as a bullseye/target:
- Outer ring: `stroke="#3B82F6"` (Tailwind `blue-500`)
- Middle fill: `fill="#3B82F6"` (solid blue circle)
- Accent dot: `fill="#3B82F6"` upper-right

In the nav, the wordmark `goals.ac` is rendered in text with `font-bold` at the sans font.

## Elevation System

Two elevation levels via CSS variables:
```css
--elevate-1: rgba(0,0,0, .03);  /* subtle lift — hover states */
--elevate-2: rgba(0,0,0, .08);  /* card shadows — light mode */
```

## Animation

- Tailwind CSS Animate (`tw-animate-css`) is imported for enter/exit transitions.
- Loading spinners: `<Loader2 className="animate-spin" />` from Lucide React.
- Progress indicators: custom step-by-step trackers in roadmap and content generation flows.
- SSE streaming content: revealed character-by-character from the `chunk` event, accumulating into a live preview.
