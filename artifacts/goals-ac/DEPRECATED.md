# Deprecated — redirect shell only

The Vite SPA (`artifacts/goals-ac`) is **retired**. It now redirects all routes to the canonical Next.js product:

- **Next.js app:** `artifacts/marketing-persona-app` (http://localhost:3001)
- **Docker default:** `docker compose up` starts Next + Postgres + worker only

## What this package does

`App.tsx` immediately redirects the browser to `VITE_MARKETING_URL` (default `http://localhost:3001`), preserving path, query, and hash. Legacy pages under `src/pages/` are **not imported** and remain for reference only.

## Local use

```sh
# Canonical dev (recommended)
pnpm dev

# Legacy redirect shell only — prints a deprecation warning
pnpm --filter @workspace/goals-ac run dev
# Opens http://localhost:5173 → redirects to :3001
```

Docker: `docker compose --profile legacy up` still serves the redirect shell on :5173 (optional).

Do **not** add features here. Port UI and API work to `marketing-persona-app`.
