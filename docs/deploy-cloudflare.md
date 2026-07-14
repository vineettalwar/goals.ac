# Deploy goals.ac to Cloudflare

Production target: **Next.js app** (`artifacts/marketing-persona-app`) on **Cloudflare Workers** via [OpenNext](https://opennext.js.org/cloudflare), with **D1** as the primary database. Background jobs run on a dedicated **`goals-ac-jobs` Worker** via **Cloudflare Queues** and **Cron Triggers**.

> **Postgres alternative:** Hyperdrive + Neon/pgvector is still supported — set `DB_DIALECT=postgres` and `DATABASE_URL` instead of D1. See [Hyperdrive (optional)](#hyperdrive-postgres-alternative).

## Architecture

```mermaid
flowchart LR
  subgraph GitHub
    Repo[goals.ac monorepo]
  end
  subgraph CF [Cloudflare]
    Builds[Workers Builds]
    AppWorker[goals-ac Worker]
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
| Next.js app + API routes | Workers + OpenNext | `wrangler.jsonc`, `cf:deploy` |
| GitHub → deploy | **Workers Builds** | Native Git integration (no GitHub Actions) |
| App database | **D1** | `DB` binding, `lib/db/migrations-d1/` |
| Static assets | Workers Assets | `.open-next/assets` |
| Next.js ISR/cache | **R2** | `NEXT_INC_CACHE_R2_BUCKET` + `r2IncrementalCache` |
| AI cache + rate limits | **KV** | `AI_CACHE`, `RATE_LIMIT` bindings (replaces `REDIS_URL` on CF) |
| Image optimization | **Cloudflare Images** | `IMAGES` binding |
| Background jobs | **Queues** | Single `goals-ac-jobs` queue with typed envelopes |
| Job consumer + sweeps | **goals-ac-jobs Worker** | `artifacts/cf-jobs-worker` |
| Scheduled sweeps | **Cron Triggers** | On jobs Worker (not external HTTP cron) |
| Brand voice at scale | **Vectorize** (phase 5) | See [Vectorize brand voice](#vectorize-brand-voice) |

## Prerequisites

1. **Cloudflare account** with Workers Paid plan (bundle size + Queues + Cron).
2. **Wrangler auth:** `pnpm exec wrangler login`
3. **Provision resources:**
   ```sh
   node scripts/cf-provision.mjs
   ```
   Paste returned IDs into:
   - `artifacts/marketing-persona-app/wrangler.jsonc`
   - `artifacts/cf-jobs-worker/wrangler.jsonc`
4. **Domain:** Workers → goals-ac → Domains → attach `goals.ac`

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

### 3. Deploy both Workers

```sh
pnpm run cf:build
pnpm run cf:deploy -- --env production
pnpm run cf:deploy:jobs -- --env production
```

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

Connect repo: **Workers & Pages → goals-ac → Settings → Builds → Connect GitHub**.

| Setting | Value |
|---|---|
| Root directory | `/` (pnpm monorepo root) |
| Build command | `pnpm install --frozen-lockfile && pnpm run cf:build` |
| Deploy command | `pnpm --filter @workspace/marketing-persona-app exec opennextjs-cloudflare deploy -- --env production --keep-vars --skipNextBuild` |
| Non-prod branch | Same with `--env staging` |
| Build watch paths | `artifacts/marketing-persona-app/**`, `lib/**`, `scripts/patch-turbopack-externals.mjs`, `pnpm-lock.yaml` |
| Build caching | Enable |

**Build variables:** `CF_BUILD=1`, all `NEXT_PUBLIC_*` needed at build time.

Deploy the jobs Worker separately (or add a second Workers Builds project pointing at `artifacts/cf-jobs-worker`).

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
| `pnpm run cf:build` | OpenNext build (validates bundle) |
| `pnpm run cf:deploy` | Deploy app Worker |
| `pnpm run cf:deploy:jobs` | Deploy jobs consumer Worker |
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
| `artifacts/marketing-persona-app/wrangler.jsonc` | App Worker: D1, R2, KV, Images, Queues producer |
| `artifacts/cf-jobs-worker/wrangler.jsonc` | Jobs Worker: D1, KV, Queues consumer, Cron |
| `lib/jobs/src/cf-queues.ts` | Queue producer transport (D1 path) |
| `lib/jobs/src/process-job.ts` | Shared job dispatcher |
| `lib/content-engine/src/core/kv-binding.ts` | KV adapter for cache + rate limits |
| `scripts/cf-provision.mjs` | One-shot resource provisioning |
| `scripts/cf-setup.mjs` | Setup checklist |
