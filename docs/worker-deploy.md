# Deploy goals.ac background worker

The Next.js app enqueues jobs via pg-boss (`@workspace/jobs`). A **long-running worker** must consume those queues. Cloudflare Workers cannot run pg-boss consumers.

## Docker Compose (local / VPS)

```sh
docker compose up worker --build
```

Health check: `GET http://localhost:8090/healthz` (set `WORKER_HEALTH_PORT=8090`).

## Fly.io (example)

```sh
cd artifacts/worker
fly launch --name goals-ac-worker --no-deploy
fly secrets set DATABASE_URL="postgresql://..." GEMINI_KEY_ENCRYPTION_SECRET="..." GEMINI_API_KEY="..."
fly deploy
```

Use the same `DATABASE_URL` as the Next app (Postgres path). On D1-only Cloudflare deploy, run worker against a Postgres instance or migrate jobs to Cloudflare Queues.

## Railway / Render

1. Connect repo; set root directory to `artifacts/worker` or use monorepo build with `artifacts/worker/Dockerfile`
2. Set env: `DATABASE_URL`, `GEMINI_KEY_ENCRYPTION_SECRET`, `GEMINI_API_KEY` (recommended)
3. Optional: `WORKER_HEALTH_PORT=8090` for platform health checks

## Required environment

| Variable | Required |
|---|---|
| `DATABASE_URL` | Yes — same Postgres as app (pg-boss schema) |
| `GEMINI_KEY_ENCRYPTION_SECRET` | Yes — BYOK decryption in jobs |
| `GEMINI_API_KEY` | Recommended — platform AI fallback in generation jobs |
| `WORKER_HEALTH_PORT` | Optional — HTTP `/healthz` (default `8090`) |

## Cron (HTTP backup)

The worker schedules `contentGenerateSweep` hourly. For redundancy, call the Next route from an external scheduler:

```sh
export CRON_SECRET=...
export GOALS_AC_URL=https://goals.ac
./scripts/cron-autopilot.example.sh
```

See `docs/deploy-cloudflare.md` for schedule (`0 */6 * * *`).

## Verify jobs drain

1. Trigger an action that enqueues (e.g. autopilot, content generate)
2. Check worker logs: `docker compose logs -f worker` or `fly logs`
3. Confirm pg-boss job completes in Postgres (`pgboss.job` table)
