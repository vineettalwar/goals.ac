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
- `docs/memory.md`
