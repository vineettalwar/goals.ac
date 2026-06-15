# AGENTS.md

## Cursor Cloud specific instructions

This is a **pnpm-workspace monorepo** for **goals.ac** (React 19 + Vite frontend, Express 5 API, PostgreSQL via Drizzle). See `README.md` and `docs/local-dev.md` for the canonical setup; the notes below only capture non-obvious caveats for running it in the Cursor Cloud VM.

### Services & how to run them
The end-to-end product = **Postgres + API server + frontend**. Run each (do not use `docker compose` here — Docker is not installed; we run services natively):

- **PostgreSQL 16** (installed via apt; satisfies the repo's "14+" requirement). Start it if not already running:
  `sudo pg_ctlcluster 16 main start`. DB `goalsac`, user `postgres`/`postgres` on `localhost:5432`.
- **API server** (port 8080): `PORT=8080 pnpm --filter @workspace/api-server run dev` — builds with esbuild then starts; it **auto-runs DB migrations on boot**.
- **Frontend** (port 5173): `PORT=5173 BASE_PATH=/ VITE_API_PROXY_TARGET=http://localhost:8080 pnpm --filter @workspace/goals-ac run dev`.

Other workspace apps (`marketing-persona-app`, `mockup-sandbox`) are independent and not needed to test goals.ac.

### Non-obvious gotchas
- **pnpm version matters.** Use **pnpm 10.x** (corepack is pinned to `10.33.3`). pnpm 11 does **not** honor the repo's `onlyBuiltDependencies` correctly and skips building `esbuild`, which breaks the API server build. If `pnpm --version` reports 11.x, run `corepack prepare pnpm@10.33.3 --activate`.
- **`.env` is required and is NOT git-ignored** — never commit it. It needs `DATABASE_URL`, `JWT_SECRET`, and `GEMINI_KEY_ENCRYPTION_SECRET` (the API hard-fails on boot without all three). A dev `.env` with random secrets is already created in the VM.
- **Env loading for scripts:** `lib/db` scripts (`migrate`/`seed`) read `process.env` directly and do **not** auto-load `.env`. Export it first, e.g. `set -a && . ./.env && set +a` before running `pnpm --filter @workspace/db run migrate`.
- **AI features need a key.** Roadmap/content generation needs `GEMINI_API_KEY` (or a user-supplied key at runtime). Without it the UI shows "Roadmap generation temporarily unavailable" — auth, onboarding, projects, and all non-AI flows still work.
- **`pnpm run typecheck` / `pnpm run build` currently FAIL** on `main` due to two pre-existing TypeScript errors in `artifacts/api-server/src/routes/chat.ts` and `competitorAnalysis.ts`. This is unrelated to environment setup. The dev servers run fine because the API builds via esbuild (no `tsc` typecheck) and Vite does not typecheck.
- **Lint:** there is no repo-wide ESLint/test setup. The de-facto quality gate is `pnpm run typecheck`; the only `lint` script is `pnpm --filter @workspace/marketing-persona-app run lint`. There is no automated test suite — E2E verification is manual (sign up → onboard → create project).
