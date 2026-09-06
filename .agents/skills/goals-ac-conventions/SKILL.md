---
name: goals-ac-conventions
description: >-
  goals.ac repo conventions and forbidden patterns. Use when writing or reviewing
  code, naming functions, adding docs, or deciding what belongs in git. Covers
  forbidden words, build artifacts, and deployment validation.
---

# goals.ac Conventions

Project-specific rules that override generic coding habits. Also documented in `AGENTS.md`, `PROJECT.md`, `docs/memory.md`, and `.cursor/rules/`.

## Forbidden word: `ensure`

The word **`ensure`** must never appear anywhere in this repo:

- Identifiers (`ensureX`, `ensureSomething`)
- Filenames (`ensure-*.ts`)
- Comments and prose ("ensure that…", "this ensures…")
- Error messages and user-facing strings

**Use instead:** `init`, `getOrCreate`, `seed`, `provision`, `verify`, `require`, `confirm`, `must`.

| Avoid | Prefer |
|---|---|
| `ensureReferenceData` | `seedReferenceDataIfEmpty` |
| `ensureWorkspaceForOrganization` | `getOrCreateWorkspaceForOrganization` |
| `ensureOrganizationForUser` | `getOrCreateOrganizationForUser` |
| `ensurePlatformVoice` | `getOrCreatePlatformVoice` |
| `ensureCfBindings` | `initCfBindings` |

Before finishing a change, grep for `\bensure\b` in touched paths and fix any hits.

## No GitHub Actions

Zero `.github/workflows/`. Deploy via Cloudflare Workers Builds. Validate locally: `pnpm run typecheck`, package builds, `docker compose config --quiet`.

## No Sparkles / glitter icons

Lucide **`Sparkles`** (glitter / “AI magic” star) is **banned** in product UI.

- Do not put Sparkles on Generate, Humanize, Enhance, or similar actions.
- Prefer `RefreshCw`, `PenLine`, `FileText`, `TrendingUp`, or text-only.
- Before finishing UI work, grep touched paths for `Sparkles` and remove hits.

**Enforced in:** `.cursor/rules/no-sparkles.mdc`, `docs/memory.md`.

## Product page grid — locked

Product app pages share one chrome from `lib/app-shell/src/shell-constants.ts`:

| Constant | When |
|---|---|
| `APP_SHELL_PAGE` | Standard pages (`max-w-5xl`) |
| `APP_SHELL_PAGE_WIDE` | Dashboard, Content Studio, dense data (`max-w-7xl`) |

- **Left-align** — never `mx-auto` on product page roots (void gutter beside sidebar).
- **Same gutters** — only via those constants (`px-4 py-8 sm:px-6 lg:px-8`).
- Do not hand-roll `max-w-3xl|5xl|6xl|7xl … px-4 py-8` page shells.
- Inner measures (`max-w-prose`, dialog `max-w-lg`) are fine; page roots are not.
- Marketing `(public)` pages are exempt.

Check: `node lib/app-shell/scripts/check-page-chrome.mjs`

**Enforced in:** `.cursor/rules/app-shell-grid.mdc`, `docs/memory.md`.

## Tailwind canonical spacing classes

Prefer spacing-scale utilities over equivalent `-[Npx]` arbitrary values (`tailwindcss(suggestCanonicalClasses)`).

- Unit = `px / 4` → `left-[15px]` → `left-3.75`, `max-h-[320px]` → `max-h-80`, `min-w-[640px]` → `min-w-160`.
- Keep arbitrary for hairlines (`1px`–`3px`), font sizes (`text-[11px]`), tracking, shadows, and CSS variables.
- Fix on touch / new UI; no drive-by churn of legacy decorative orbs.

**Enforced in:** `docs/memory.md`.

## Build artifacts — do not commit

These are generated locally or in CI/Workers Builds and are **gitignored**. Never add them to git:

| Path | Purpose |
|---|---|
| `artifacts/marketing-persona-app/.marketing-out/` | Static marketing export (`scripts/build-marketing-static.mjs` → Cloudflare Pages) |
| `artifacts/marketing-persona-app/.marketing-build-backup/` | Temporary route swap during marketing build |
| `artifacts/marketing-pages/dist/` | Pages deploy output (copied from `.marketing-out`) |
| `artifacts/marketing-persona-app/.next/` | Next.js dev/build cache |
| `artifacts/marketing-persona-app/.open-next/` | OpenNext Cloudflare adapter output |
| `dist/`, `*.tsbuildinfo` | Compiled package output |

Ignored in root `.gitignore` (explicit artifact paths) and `artifacts/marketing-pages/.gitignore` (`dist/`).

If `.marketing-out/` appears in the working tree, that is expected after a marketing build. It should **not** be committed — `.gitignore` already excludes it.

Regenerate when needed:

```sh
node scripts/build-marketing-static.mjs
```

## Related enforcement

- `.cursor/rules/no-ensure.mdc`
- `.cursor/rules/no-github-ci.mdc`
- `.cursor/rules/no-sparkles.mdc`
- `.cursor/rules/app-shell-grid.mdc`
- `docs/memory.md`
