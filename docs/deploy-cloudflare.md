# Deploy goals.ac to Cloudflare

**Production target (Workers Free):** the **Edge Mesh** — static marketing on **Pages**, product UI on **Pages** (`app.goals.ac`), thin API **Workers** behind `api.goals.ac`, and **`goals-ac-jobs`** for queues + crons. D1 is the primary database.

The OpenNext monolith Worker (`goals-ac`) is **retired** — it exceeded the Free **3 MB** gzip limit (~9.3 MB). Use **`pnpm run cf:preview`** locally only; production is the Edge Mesh below.

> **Postgres alternative:** Hyperdrive + Neon/pgvector is still supported — set `DB_DIALECT=postgres` and `DATABASE_URL` instead of D1. See [Hyperdrive (optional)](#hyperdrive-postgres-alternative).

## Edge Mesh architecture (Free tier)

```mermaid
flowchart TB
  subgraph pages [Cloudflare Pages Free]
    Marketing[goals.ac marketing static]
    AppUI[app.goals.ac product SPA]
  end

  subgraph gateway [goals-ac-gateway]
    Router[Service Bindings router]
  end

  subgraph shards [Sharded Workers under 3 MB each]
    PublicW[goals-ac-public]
    ReadW[goals-ac-read]
    WriteW[goals-ac-write]
  end

  subgraph data [Data plane]
    D1[(D1 goals-ac)]
    KV[(KV cache)]
    Q[Queues]
  end

  JobsW[goals-ac-jobs]

  Marketing --> PublicW
  AppUI --> gateway
  gateway --> PublicW
  gateway --> ReadW
  gateway --> WriteW
  ReadW --> D1
  ReadW --> KV
  WriteW --> Q
  WriteW --> D1
  Q --> JobsW
  JobsW --> D1
```

| Host | Artifact | Deploy |
|---|---|---|
| `goals.ac` | `artifacts/marketing-pages` (static export from Next public routes) | `pnpm run cf:pages:marketing` |
| `app.goals.ac` | `artifacts/goals-app-ui` (Vite SPA) | `pnpm run cf:pages:app` |
| `api.goals.ac` | `artifacts/cf-gateway` → public / read / write | `pnpm run cf:edge:deploy` |
| Background jobs | `artifacts/cf-jobs-worker` | `pnpm run cf:deploy:jobs` |

Legacy apps **not deployed** on Cloudflare: `artifacts/goals-ac` (Vite redirect), `artifacts/api-server`, `artifacts/worker` (pg-boss).

## Legacy monolith (local preview only — not deployed)

The `goals-ac` OpenNext Worker was **deleted** from Cloudflare. The Next.js app in `artifacts/marketing-persona-app` remains for **local dev** (`pnpm dev` :3001) and **Workers runtime preview** (`pnpm run cf:preview` :8787).

```mermaid
flowchart LR
  subgraph GitHub
    Repo[goals.ac monorepo]
  end
  subgraph CF [Cloudflare]
    Builds[Workers Builds]
    AppWorker[goals-ac OpenNext Worker]
    JobWorker[goals-ac-jobs Worker]
    D1[(D1)]
    R2[(R2 cache)]
    KV[(KV)]
    Queues[Queues + DLQ]
    Cron[Cron Triggers]
  end
  Repo --> Builds
  Builds --> AppWorker
  AppWorker --> D1
  AppWorker --> R2
  AppWorker --> KV
  AppWorker -->|enqueue| Queues
  Queues --> JobWorker
  Cron --> JobWorker
  JobWorker --> D1
```

| Component | Cloudflare product | Notes |
|---|---|---|
| Next.js app (local only) | OpenNext preview | `cf:preview` on :8787; `pnpm dev` on :3001 |
| GitHub → deploy | **Workers Builds** | Native Git integration (no GitHub Actions) |
| App database | **D1** | `DB` binding, `lib/db/migrations-d1/` |
| Static assets | Workers Assets / Pages | Marketing + product SPAs on Pages |
| Next.js ISR/cache | **R2** | OpenNext path only |
| AI cache + rate limits | **KV** | `AI_CACHE`, `RATE_LIMIT` bindings |
| Background jobs | **Queues** | Single `goals-ac-jobs` queue with typed envelopes |
| Job consumer + sweeps | **goals-ac-jobs Worker** | `artifacts/cf-jobs-worker` |
| Scheduled sweeps | **Cron Triggers** | On jobs Worker |

## Prerequisites

1. **Cloudflare account:** **Contact@vineet.de's Account** (`bdd4b32a0d2c3e380d9b57dbfaa90fe6`).  
   Canonical ID lives in `scripts/cloudflare-account.json`. Both `wrangler.jsonc` files pin `account_id` so wrangler never provisions on another account when you have multi-account access.
2. **Workers plan:** **Free** for the Edge Mesh (each shard & jobs Worker stay under 3 MB gzip). OpenNext monolith requires **Workers Paid** if you deploy it anyway.
3. **Wrangler auth:** `pnpm exec wrangler login` (OAuth user must have access to Contact@vineet.de).
4. **Provision resources** (always targets Contact@vineet.de via `account_id` + `CLOUDFLARE_ACCOUNT_ID`):
   ```sh
   node scripts/cf-provision.mjs
   ```
   Paste returned IDs into:
   - `artifacts/marketing-persona-app/wrangler.jsonc`
   - `artifacts/cf-jobs-worker/wrangler.jsonc`
5. **Domain:** Workers → goals-ac → Domains → attach `goals.ac`

## One-time Cloudflare setup

### 1. D1 + migrations

```sh
pnpm run cf:migrate:d1      # remote
pnpm run cf:seed:d1         # industries + locations (first deploy)
```

After schema changes:
```sh
pnpm --filter @workspace/db run generate:d1
pnpm run cf:migrate:d1
```

Set **`DB_DIALECT=d1`** in Worker vars (already in `wrangler.jsonc`).

### 2. R2, KV, Queues, Images

`node scripts/cf-provision.mjs` creates:
- R2: `goals-ac-next-cache` (+ staging)
- KV: `goals-ac-cache`, `goals-ac-ratelimit` (+ staging)
- Queues: `goals-ac-jobs`, `goals-ac-jobs-dlq` (+ staging)

Bindings are pre-wired in `wrangler.jsonc`. Enable **Cloudflare Images** on your account in the dashboard.

### 3. Deploy Edge Mesh Workers

```sh
# Order matters: shards before gateway (service bindings)
pnpm run cf:edge:deploy
pnpm run cf:deploy:jobs

# Set secrets on read + write workers (same AUTH_SECRET as NextAuth)
cd artifacts/cf-read-worker && pnpm exec wrangler secret put AUTH_SECRET
cd ../cf-write-worker && pnpm exec wrangler secret put AUTH_SECRET
```

### 4. Deploy Pages

**Prefer Git-connected Pages** (auto-deploy on push). Direct-upload projects (`wrangler pages deploy`) show **No Git connection** and cannot be converted later — use `pnpm run cf:pages:git-setup migrate` instead.

```sh
# One-time: connect Pages to GitHub (after GitHub app is installed — see below)
pnpm run cf:pages:git-setup check
pnpm run cf:pages:git-setup migrate

# Manual fallback (direct upload — no Git integration)
pnpm --filter @workspace/marketing-pages run build
pnpm run cf:pages:marketing
pnpm --filter @workspace/goals-app-ui run build
pnpm run cf:pages:app
```

Attach custom domains in the Pages dashboard: `goals.ac`, `app.goals.ac`. Point `api.goals.ac` to the **goals-ac-gateway** Worker.


### 4. Worker secrets (runtime)

| Secret / var | Required (D1) |
|---|---|
| `AUTH_SECRET` | Yes |
| `NEXTAUTH_URL` | Yes |
| `GEMINI_KEY_ENCRYPTION_SECRET` | Yes |
| `GEMINI_API_KEY` | Recommended |
| `NEXT_PUBLIC_APP_URL` | Build var (Workers Builds) |
| `NEXT_PUBLIC_SITE_URL` | Build var |
| `STRIPE_*`, `GOOGLE_CLIENT_*`, `RESEND_API_KEY` | Feature-gated |

`REDIS_URL` is **not needed** on the Cloudflare path — KV handles cache and rate limits.

```sh
cd artifacts/marketing-persona-app
pnpm exec wrangler secret put AUTH_SECRET --env production
```

Deploy uses `--keep-vars` to preserve dashboard secrets.

### 5. Background jobs (D1 path)

When `DB_DIALECT=d1`, `enqueue()` sends typed job envelopes to the **`JOBS_QUEUE`** binding. The **`goals-ac-jobs`** consumer Worker processes them via `@workspace/jobs/process-job`.

Cron sweeps run on the jobs Worker via **Cron Triggers** — no external scheduler required.

Legacy `artifacts/worker` (pg-boss) remains for local Postgres dev only.

## Workers Builds (GitHub → Cloudflare)

Use **Workers Builds** (dashboard Git integration) — not GitHub Actions. Connect the **same GitHub repo twice**, once per Worker.

Account: **Contact@vineet.de** (`bdd4b32a0d2c3e380d9b57dbfaa90fe6`)

### 1. Connect GitHub (once per account)

1. [Workers & Pages](https://dash.cloudflare.com/bdd4b32a0d2c3e380d9b57dbfaa90fe6/workers-and-pages) → select Worker → **Settings** → **Builds**
2. **Connect** → authorize Cloudflare on GitHub → pick the `goals.ac` repo
3. Production branch: `main` (or your default branch)

### 2. Jobs Worker — `goals-ac-jobs`

| Setting | Value |
|---|---|
| Root directory | `/` (monorepo root) |
| Build command | `corepack enable && pnpm install --frozen-lockfile` |
| Deploy command | `pnpm --filter @workspace/cf-jobs-worker run deploy` |
| Build watch paths (include) | `artifacts/cf-jobs-worker/**`, `lib/jobs/**`, `lib/db/**`, `lib/content-engine/**`, `pnpm-lock.yaml` |
| Environment variables | `CLOUDFLARE_ACCOUNT_ID=bdd4b32a0d2c3e380d9b57dbfaa90fe6` |

### 3. Public API Worker — `goals-ac-public`

| Setting | Value |
|---|---|
| Root directory | `/` |
| Build command | `corepack enable && pnpm install --frozen-lockfile` |
| Deploy command | `pnpm --filter @workspace/cf-public-worker run deploy` |
| Build watch paths (include) | `artifacts/cf-public-worker/**`, `lib/cf-edge/**`, `lib/db/**`, `lib/jobs/**`, `lib/seo-tools/**`, `pnpm-lock.yaml` |

### 4. Read / Write / Gateway Workers

Connect three additional Workers Builds projects (or one build that runs `pnpm run cf:edge:deploy`):

| Worker | Deploy command |
|---|---|
| `goals-ac-read` | `pnpm --filter @workspace/cf-read-worker run deploy` |
| `goals-ac-write` | `pnpm --filter @workspace/cf-write-worker run deploy` |
| `goals-ac-gateway` | `pnpm --filter @workspace/cf-gateway run deploy` |

Set `AUTH_SECRET` on **read** and **write** Workers via dashboard secrets.

### 5. Pages — `goals-ac-marketing` and `goals-ac-app`

Direct-upload Pages projects **cannot** add Git later. If the dashboard shows **No Git connection**, run the migration script (it deletes and recreates the projects with GitHub source).

**Prerequisite:** install the [Cloudflare Workers and Pages GitHub app](https://github.com/apps/cloudflare-workers-and-pages/installations/new) on `vineettalwar/goals.ac`. If `pnpm run cf:pages:git-setup check` fails with error `8000011`, uninstall and reinstall the app from [GitHub installations](https://github.com/settings/installations).

| Pages project | Build command | Output dir | Watch paths |
|---|---|---|---|
| `goals-ac-marketing` | `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @workspace/marketing-pages run build` | `artifacts/marketing-pages/dist` | `artifacts/marketing-pages/**`, `artifacts/marketing-persona-app/**`, `scripts/build-marketing-static.mjs` |
| `goals-ac-app` | `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @workspace/goals-app-ui run build` | `artifacts/goals-app-ui/dist` | `artifacts/goals-app-ui/**`, `lib/api-client-react/**`, `lib/api-zod/**` |

Dashboard fallback (per project): **Workers & Pages → project → Settings → Builds → Connect** → repo `vineettalwar/goals.ac`, branch `main`, root `/`, build command and output dir from the table above.

```sh
pnpm run cf:pages:git-setup check     # verify GitHub app
pnpm run cf:pages:git-setup migrate   # delete direct-upload + recreate with Git
pnpm run cf:pages:git-setup status    # list Git connection state
```

### 6. ~~OpenNext monolith — `goals-ac`~~ (retired)

Removed from Cloudflare. Do not recreate unless you upgrade to Workers Paid and explicitly need a single-bundle deploy.

### 4. Secrets (not in Git)

Set in dashboard: **Workers → goals-ac → Settings → Variables and Secrets**, or:

```sh
cd artifacts/marketing-persona-app
pnpm exec wrangler secret put AUTH_SECRET
pnpm exec wrangler secret put NEXTAUTH_URL
pnpm exec wrangler secret put GEMINI_KEY_ENCRYPTION_SECRET
```

Deploy uses `--keep-vars` so dashboard secrets survive Git deploys.

### 5. Staging (optional)

`wrangler.jsonc` has an `env.staging` block. Create a second Worker (`goals-ac-staging`) and connect the same repo with:

- Non-production branch: e.g. `staging` or `develop`
- Deploy command: `pnpm --filter @workspace/marketing-persona-app exec opennextjs-cloudflare deploy -- --env staging --keep-vars`

### 6. D1 migrations on schema changes

Workers Builds does **not** run migrations automatically. After merging schema changes:

```sh
pnpm run cf:migrate:d1
```

Or add a manual step / separate workflow when you change `lib/db/migrations-d1/`.

## Hyperdrive (Postgres alternative)

```sh
pnpm exec wrangler hyperdrive create goals-ac-db \
  --connection-string="postgresql://USER:PASS@HOST:5432/goalsac"
```

Add to `wrangler.jsonc`, set `DB_DIALECT=postgres`, run Postgres migrations.

## Local preview (Workers runtime)

```sh
pnpm install
cp artifacts/marketing-persona-app/.dev.vars.example \
   artifacts/marketing-persona-app/.dev.vars
# AUTH_SECRET, NEXTAUTH_URL=http://localhost:8787, GEMINI_KEY_ENCRYPTION_SECRET

pnpm run cf:migrate:d1:local
pnpm run cf:seed:d1:local
pnpm run cf:preview   # http://localhost:8787
```

Day-to-day UI: `pnpm --filter @workspace/marketing-persona-app run dev` (:3001) with Docker Postgres.

## Deploy commands

| Command | Action |
|---|---|
| `pnpm run cf:edge:deploy` | Deploy public + read + write + gateway Workers |
| `pnpm run cf:deploy:jobs` | Deploy jobs consumer Worker |
| `pnpm run cf:pages:marketing` | Build + deploy marketing Pages (`goals.ac`) |
| `pnpm run cf:pages:app` | Build + deploy product SPA Pages (`app.goals.ac`) |
| `pnpm run cf:pages:git-setup migrate` | Migrate Pages projects from direct upload to GitHub |
| `pnpm run cf:preview` | Local OpenNext preview (:8787) — dev only |
| `pnpm run cf:build` | Build OpenNext bundle for local preview |
| `pnpm run cf:migrate:d1` | Apply D1 migrations (remote) |
| `pnpm run cf:seed:d1` | Seed reference data |
| `node scripts/cf-provision.mjs` | Create CF resources + print IDs |
| `node scripts/cf-setup.mjs` | Setup checklist |

## Validate after deploy

```sh
curl -sS https://goals.ac/api/platform/status | jq .
curl -sS https://goals-ac-jobs.<account>.workers.dev/
pnpm exec wrangler tail --env production
```

## Vectorize brand voice

At scale, migrate brand voice retrieval from D1 JSON cosine to **Vectorize**. Stub and config live in `lib/content-engine/src/brand/vectorize-brand-voice.ts`. Enable after jobs on CF are stable.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `D1 binding DB is not configured` | Add `d1_databases` to wrangler; set `DB_DIALECT=d1` |
| `JOBS_QUEUE binding is not configured` | Add `queues.producers` to app `wrangler.jsonc` |
| `no such table` | Run `pnpm run cf:migrate:d1` |
| Jobs never run | Deploy `goals-ac-jobs` Worker; check queue consumer + DLQ |
| Worker too large | Workers Paid; R2 cache enabled; audit server imports |
| Rate limits not shared | Ensure KV `RATE_LIMIT` binding is set |
| Brand voice slow on D1 | Expected at scale — enable Vectorize (phase 5) |

## Files

| Path | Purpose |
|---|---|
| `artifacts/cf-gateway/` | API router (`api.goals.ac`) |
| `artifacts/cf-public-worker/` | Public tools, contact, waitlist, reference GETs |
| `artifacts/cf-read-worker/` | Authenticated D1 reads + job status |
| `artifacts/cf-write-worker/` | Enqueue-only writes (202 + jobId) |
| `artifacts/marketing-pages/` | Static marketing Pages export |
| `artifacts/goals-app-ui/` | Product SPA on Pages |
| `lib/cf-edge/` | Shared CORS, JWT, KV cache, queue HTTP helpers |
| `artifacts/marketing-persona-app/wrangler.jsonc` | Legacy OpenNext Worker (local preview) |
| `artifacts/cf-jobs-worker/wrangler.jsonc` | Jobs Worker: D1, KV, Queues consumer, Cron |
| `lib/jobs/src/cf-queues.ts` | Queue producer transport (D1 path) |
| `lib/jobs/src/process-job.ts` | Shared job dispatcher |
| `lib/content-engine/src/core/kv-binding.ts` | KV adapter for cache + rate limits |
| `scripts/cf-provision.mjs` | One-shot resource provisioning |
| `scripts/cf-setup.mjs` | Setup checklist |
