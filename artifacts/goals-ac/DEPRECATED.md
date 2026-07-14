# Deprecated — use marketing-persona-app

The Vite SPA (`artifacts/goals-ac`) is **legacy**. The canonical product is:

- **Next.js app:** `artifacts/marketing-persona-app` (http://localhost:3001)
- **Docker default:** `docker compose up` starts Next + Postgres + worker only

This app remains available under `docker compose --profile legacy` for redirect-shell debugging. Do not add new features here — port UI to the Next app instead.
