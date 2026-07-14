# Deploy goals.ac to Cloudflare

Production target: **Next.js app** (`artifacts/marketing-persona-app`) on **Cloudflare Workers** via [OpenNext](https://opennext.js.org/cloudflare), with **D1** (SQLite at the edge) as the primary database. Docker Compose + Postgres remain the local dev stack.

> **Postgres alternative:** Hyperdrive + Neon/pgvector is still supported — set `DB_DIALECT=postgres` and `DATABASE_URL` instead of D1. See [Hyperdrive (optional)](#hyperdrive-postgres-alternative).

## Architecture

```mermaid
flowchart LR
  subgraph CF [Cloudflare]
    Worker[goals-ac Worker\nOpenNext + Next.js 16]
    D1[(D1 — goals-ac)]
    R2[(R2 — optional\nNext.js cache)]
    Queues[Queues — optional\njob offload]
  end
  subgraph External [External services]
    Jobs[pg-boss worker\noptional / legacy]
    Redis[(Redis — optional)]
  end
  Users --> Worker
  Worker --> D1
  Worker --> R2
  Worker --> Queues
  Worker --> Redis
  Jobs -.->|postgres path only| D1
```

| Component | Cloudflare product | Notes |
|---|---|---|
| Next.js app + API routes | Workers + OpenNext | `@opennextjs/cloudflare`, `wrangler.jsonc` |
| App database | **D1** | `DB` binding, migrations in `lib/db/migrations-d1/` |
| Static assets | Workers Assets | `.open-next/assets` |
| Next.js ISR/cache | **R2** (optional) | Uncomment R2 binding in `wrangler.jsonc` + `open-next.config.ts` |
| Background jobs | **Queues / Containers** | pg-boss requires Postgres — migrate to Queues or run worker against Postgres |
| Cron (`/api/cron/*`) | External scheduler | HTTP trigger with `Authorization: Bearer $CRON_SECRET` |
| AI output cache | Upstash Redis or skip | `REDIS_URL`; in-memory fallback (single instance) |
| Brand voice vectors | In-app cosine (D1) | Embeddings stored as JSON in D1; pgvector path on Postgres |

## Prerequisites

1. **Cloudflare account** with Workers enabled (Paid plan recommended).
2. **Wrangler auth:** `pnpm exec wrangler login`
3. **D1 database** (one-time):
   ```sh
   cd artifacts/marketing-persona-app
   pnpm exec wrangler d1 create goals-ac
   ```
   Copy the returned `database_id` into `wrangler.jsonc` (`d1_databases[0].database_id`).
4. **Domain** (optional): route `goals.ac` to the Worker in Cloudflare DNS.

## One-time Cloudflare setup

### 1. D1 database + migrations

`@workspace/db` ships a SQLite schema (`lib/db/src/schema-sqlite/`) and initial migration (`lib/db/migrations-d1/`).

**Apply migrations (remote):**
```sh
pnpm run cf:migrate:d1
```

**Apply migrations (local Wrangler preview DB):**
```sh
pnpm run cf:migrate:d1:local
```

**Regenerate migrations after schema changes:**
```sh
# 1. Edit lib/db/src/schema/*.ts (Postgres source of truth)
# 2. Regenerate SQLite mirror + D1 migration:
pnpm --filter @workspace/db run generate:d1
# 3. Apply:
pnpm run cf:migrate:d1
```

Set Worker variable **`DB_DIALECT=d1`** (dashboard → Settings → Variables, or `.dev.vars` for preview). When `DB_DIALECT=d1`, the app uses the `DB` D1 binding via `@workspace/db` — no `DATABASE_URL` required.

### 2. R2 incremental cache (optional)

```sh
pnpm exec wrangler r2 bucket create goals-ac-next-cache
```

Uncomment in `wrangler.jsonc` and `open-next.config.ts`, then redeploy.

### 3. Worker secrets (runtime)

| Secret / var | Required (D1) | Required (Postgres) |
|---|---|---|
| `DB_DIALECT` | `d1` | `postgres` (or omit) |
| `DATABASE_URL` | No | Yes (Hyperdrive string) |
| `AUTH_SECRET` | Yes | Yes |
| `NEXTAUTH_URL` | Yes | Yes |
| `GEMINI_KEY_ENCRYPTION_SECRET` | Yes | Yes |
| `GEMINI_API_KEY` | Recommended | Recommended |
| `CRON_SECRET` | If using cron HTTP | If using cron HTTP |
| `STRIPE_*` | If billing | If billing |
| `GOOGLE_CLIENT_*` | If OAuth | If OAuth |
| `RESEND_API_KEY` | If email | If email |
| `REDIS_URL` | Optional | Optional |

Use `pnpm exec wrangler secret put AUTH_SECRET` from `artifacts/marketing-persona-app`. Deploy with `--keep-vars` (in `cf:deploy`).

### 4. Cron trigger (autopilot sweep)

Use an external scheduler to call:

```
GET https://goals.ac/api/cron/generate-articles
Authorization: Bearer <CRON_SECRET>
```

Suggested schedule: every 6 hours (`0 */6 * * *`).

### 5. Background jobs

pg-boss is Postgres-native. When `DB_DIALECT=d1`, `@workspace/jobs` throws **`JobsUnavailableError`** on `enqueue()` / `getBoss()` — cron routes and APIs that enqueue background work will fail until migrated.

| Approach | Notes |
|---|---|
| **Cloudflare Queues** | Recommended — replace pg-boss enqueue/consume |
| **Hybrid worker** | `artifacts/worker` on Fly/Railway with Postgres while app uses D1 (split-brain — use only for isolated job types) |
| **Postgres path** | `DB_DIALECT=postgres` + Hyperdrive until Queues ships |

See **[worker-deploy.md](./worker-deploy.md)** for Fly/Railway/Docker instructions, health checks, and cron backup.

## Hyperdrive (Postgres alternative)

If you prefer Postgres + pgvector (brand voice IVFFlat indexes, pg-boss):

```sh
pnpm exec wrangler hyperdrive create goals-ac-db \
  --connection-string="postgresql://USER:PASS@HOST:5432/goalsac"
```

Add to `wrangler.jsonc`:
```jsonc
"hyperdrive": [{ "binding": "HYPERDRIVE", "id": "<hyperdrive-id>" }]
```

Set `DB_DIALECT=postgres` and `DATABASE_URL` to the Hyperdrive connection string. Run Postgres migrations:
```sh
DATABASE_URL="postgresql://..." pnpm --filter @workspace/db run migrate
```

## Local preview (Workers runtime)

```sh
pnpm install
cp artifacts/marketing-persona-app/.dev.vars.example \
   artifacts/marketing-persona-app/.dev.vars
# Set AUTH_SECRET, NEXTAUTH_URL=http://localhost:8787, GEMINI_KEY_ENCRYPTION_SECRET
# DB_DIALECT=d1 is already in the example

pnpm run cf:migrate:d1:local
pnpm run cf:seed:d1:local
pnpm run cf:preview   # http://localhost:8787
```

Day-to-day UI work: `pnpm --filter @workspace/marketing-persona-app run dev` (:3001) with repo-root `.env` and Docker Postgres (`DB_DIALECT` unset).

## Deploy

```sh
pnpm install --frozen-lockfile
pnpm run cf:migrate:d1    # before first deploy / after schema changes
pnpm run cf:seed:d1       # industries + locations (first deploy)
pnpm run cf:build         # validates OpenNext worker bundle
pnpm run cf:deploy
```

Cloudflare builds use `CF_BUILD=1` (unoptimized images, `sharp-stub.js`) and `scripts/patch-turbopack-externals.mjs`. Auth runs via edge `src/middleware.ts` (not Node `proxy.ts`) until OpenNext supports proxy.

With environment:
```sh
pnpm run cf:deploy -- --env production
```

## Validate after deploy

```sh
curl -sS https://goals.ac/api/platform/status | jq .
pnpm exec wrangler tail --env production
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| `D1 binding DB is not configured` | Add `d1_databases` to `wrangler.jsonc`; set `DB_DIALECT=d1` |
| `no such table` | Run `pnpm run cf:migrate:d1` |
| `DATABASE_URL must be set` | On D1: set `DB_DIALECT=d1`. On Postgres: set `DATABASE_URL` |
| Worker too large | Workers Paid; enable R2 cache; audit server-only imports |
| Jobs never run | pg-boss needs Postgres — use Queues or hybrid worker ([worker-deploy.md](./worker-deploy.md)) |
| `Node.js middleware is not supported` on cf:build | Use `src/middleware.ts` with `runtime = "edge"` — `proxy.ts` is Node-only until OpenNext adapter API |
| Brand voice slow on D1 | Expected at scale — consider Vectorize or Postgres path |

## Files (D1)

| Path | Purpose |
|---|---|
| `lib/db/src/schema-sqlite/` | SQLite/D1 Drizzle schema (generated from Postgres) |
| `lib/db/migrations-d1/` | D1 SQL migrations |
| `lib/db/drizzle.d1.config.ts` | Drizzle Kit config for D1 |
| `lib/db/scripts/convert-pg-schema-to-sqlite.mjs` | Schema sync script |
| `lib/db/src/dialect.ts` | `DB_DIALECT` detection |
| `lib/db/src/d1.ts` | D1 Drizzle client factory |
| `artifacts/marketing-persona-app/wrangler.jsonc` | `DB` D1 binding |
| Root `cf:migrate:d1` / `cf:migrate:d1:local` | Apply D1 migrations |
