# Codebase map

**Audience:** agents and humans picking up the repo.  
**Outcome:** know which runtime serves a change, then jump to the right package or doc.

## Read first (in order)

| # | File | Why |
|---|---|---|
| 1 | [`PROJECT.md`](../PROJECT.md) | Living stack + architecture + status |
| 2 | [`HANDOFF.md`](../HANDOFF.md) | What the last session left open |
| 3 | This file | Runtime + package index |
| 4 | [`AGENTS.md`](../AGENTS.md) | Stack detail, workflows, env table |
| 5 | [`docs/memory.md`](memory.md) | Lessons that prevent re-fighting settled bugs |

Do **not** start by re-exploring the tree if those five files answer the question.

## Which runtime? (ask this first)

| Question | Answer |
|---|---|
| What serves customers today? | **Edge Mesh:** `cf-gateway` → `cf-public` / `cf-read` / `cf-write` + Pages (`goals-app-ui`, `marketing-pages`) + D1 |
| Where do we write features first? | `artifacts/marketing-persona-app` (Next, `:3001`) — **not deployed** |
| When is a change “shipped”? | When it lands on the **workers / Pages** path, not only in the Next app |
| Local Docker default? | Next + Postgres + `artifacts/worker` (pg-boss) |
| CF preview? | `pnpm run cf:preview` — D1, no remote provisioning |

```
Browser
  ├─ goals.ac          → marketing-pages (Pages)
  ├─ app.goals.ac      → goals-app-ui (Pages SPA)
  └─ api.goals.ac      → cf-gateway
                           ├─ cf-public-worker   (auth, OAuth, public)
                           ├─ cf-read-worker     (GET)
                           └─ cf-write-worker    (mutations → Queues)
                                                 └─ cf-jobs-worker
```

Full deploy: [`deploy-cloudflare.md`](deploy-cloudflare.md). Local: [`local-dev.md`](local-dev.md).

## Package index

Each package has a short `README.md`. High-traffic ones:

### Production (Edge Mesh)

| Package | Role |
|---|---|
| `artifacts/cf-gateway` | Route splitter / service bindings |
| `artifacts/cf-public-worker` | Google login, public + OAuth callbacks |
| `artifacts/cf-read-worker` | Authenticated reads |
| `artifacts/cf-write-worker` | Authenticated writes + job enqueue |
| `artifacts/cf-jobs-worker` | Queues + crons (D1) |
| `artifacts/goals-app-ui` | Live product UI |
| `artifacts/marketing-pages` | Live marketing site |

### Development / reference (not CF production)

| Package | Role |
|---|---|
| `artifacts/marketing-persona-app` | Canonical **dev** product + admin + most APIs |
| `artifacts/worker` | pg-boss (Postgres only) |
| `artifacts/api-server` | Legacy Express |
| `artifacts/goals-ac` | Legacy Vite redirect |

### Shared libs (selected)

| Package | Role |
|---|---|
| `lib/db` | Schema + migrations (Postgres + D1) |
| `lib/app-shell` | Shared nav / auth UI / page grid |
| `lib/cf-edge` | Worker session + env helpers |
| `lib/content-engine` | Generation + publish pipeline |
| `lib/ai-providers` | Tiered AI providers |
| `lib/connectors` | CMS clients |
| `lib/billing` | Credits |
| `cms-plugins/*` | On-site CMS plugins (WP, Joomla, Drupal, Shopify) |

## Topic docs

| Topic | Doc |
|---|---|
| Auth + avatars (incl. WIP) | [`docs/auth.md`](auth.md) |
| Decisions | [`docs/DECISIONS.md`](DECISIONS.md) |
| Admin | [`docs/admin.md`](admin.md) |
| Parity Next ↔ CF | [`docs/parity-matrix.md`](parity-matrix.md) |
| Production readiness | [`docs/audits/2026-09-06-production-readiness.md`](audits/2026-09-06-production-readiness.md) |
| Conventions | `.agents/skills/goals-ac-conventions/SKILL.md` |

## Hard rules (do not invent around these)

- **No GitHub Actions** — validate locally (`pnpm run typecheck`, package builds).
- **No `ensure`** in identifiers, comments, strings, or docs.
- **Product page grid** — `APP_SHELL_PAGE` / `APP_SHELL_PAGE_WIDE` only; left-aligned.
- **No Sparkles** icons in product UI.

## Provenance

Written 2026-09-12 from `PROJECT.md`, `docs/deploy-cloudflare.md`, and package layout. Re-check Edge Mesh hosts and “OpenNext retired” before trusting deploy claims after large infra PRs.
