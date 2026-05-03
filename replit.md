# Workspace — Replit Developer Reference

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies. The app runs as three separate artifacts: the React frontend, the Express API, and a design canvas (mockup sandbox).

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- **Build**: esbuild (via `build.mjs` in api-server)
- **Frontend build**: Vite 7 + Tailwind CSS 4

---

## Key Commands

### TypeScript & Build
- `pnpm run typecheck` — full typecheck across all packages (uses project references)
- `pnpm run build` — typecheck + build all packages

### Database
- `pnpm --filter @workspace/db run generate` — generate a new migration + snapshot after schema changes (**always run this; never write migrations by hand**)
- `pnpm --filter @workspace/db run migrate` — apply pending migrations to the database
- `pnpm --filter @workspace/db run push` — push schema directly to DB (dev only, skips migration files — use sparingly)
- `pnpm --filter @workspace/db run seed` — seed reference data (industries + locations)

### API Codegen
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks (`lib/api-hooks/`) and Zod schemas (`lib/api-zod/`) from `lib/api-spec/openapi.yaml`

### Running Services
- `pnpm --filter @workspace/api-server run dev` — start API server (builds then starts; auto-runs migrations)
- `pnpm --filter @workspace/goals-ac run dev` — start Vite frontend dev server

### DB Declarations (after schema changes)
- `cd lib/db && npx tsc --build` — regenerate `.d.ts` files in `lib/db/dist/` so TypeScript sees new columns

---

## Environment Variables

All secrets are set in **Replit Secrets** (not `.env` — Replit auto-injects them). For local dev, use `.env.example` as a template.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (auto-set by Replit DB) |
| `JWT_SECRET` | Yes | Signs JWT tokens — 30-day expiry; changing it logs everyone out |
| `GEMINI_KEY_ENCRYPTION_SECRET` | Yes | AES-256-GCM key for encrypting user Gemini keys + CMS tokens |
| `GEMINI_API_KEY` | Optional | Platform-level Gemini fallback |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth app client ID |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth app client secret |
| `RESEND_API_KEY` | Optional | Resend email API for password reset |
| `LEADSH_WEBHOOK_URL` | Optional | Webhook for lead capture events |
| `REDIS_URL` | Optional | Redis for AI output caching (falls back to in-memory LRU) |
| `AI_INTEGRATIONS_GEMINI_API_KEY` | Auto | Replit AI Integrations proxy key (auto-injected) |
| `AI_INTEGRATIONS_GEMINI_BASE_URL` | Auto | Replit AI Integrations proxy URL (auto-injected) |
| `RESEND_FROM_EMAIL` | Optional | From address for emails (default: noreply@goals.ac) |

---

## Workflows

Replit workflows auto-start on every session. Each workflow maps a name to a shell command:

| Workflow Name | Command | Port |
|---|---|---|
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` | 8080 |
| `artifacts/goals-ac: web` | `pnpm --filter @workspace/goals-ac run dev` | env `PORT` |
| `artifacts/mockup-sandbox: Component Preview Server` | `pnpm --filter @workspace/mockup-sandbox run dev` | env `PORT` |

The API server workflow runs `pnpm run build` (esbuild) then `node ./dist/index.mjs` and **automatically runs migrations** on every start via `src/run-migrate.ts`.

---

## Architecture

### Artifacts
- **goals-ac** (`/`) — React + Vite frontend
- **api-server** (`/api`) — Express REST API backend
- **mockup-sandbox** (`/__mockup`) — Design canvas for component exploration

### Auth System
- **bcryptjs** for password hashing
- **jsonwebtoken** for JWT tokens (30-day expiry, stored in `localStorage` as `goals_ac_token`)
- `lib/auth.ts` in api-server: `requireAuth`, `optionalAuth`, `requireSuperAdmin` middleware
- `AuthProvider` + `useAuth` in `artifacts/goals-ac/src/context/auth.tsx`
- Google OAuth via Passport.js — merges with existing email accounts

### AI Generation
- Model: `gemini-2.5-flash` with `thinkingConfig: { thinkingBudget: 0 }` (no extended thinking, low latency)
- Key priority: user's encrypted key → Replit AI Integrations proxy → `GEMINI_API_KEY`
- Streaming: Server-Sent Events (SSE) — `event: chunk`, `event: done`, `event: cached`, `event: error`
- AI output cache: 24h TTL, Redis or in-memory LRU (max 500 entries)
- DB-level content cache: `cache_key` on `content_pieces` — same inputs → return existing row instantly

### Database Tables
- `users` — email, password_hash (nullable for OAuth-only), google_id, name, role, avatar_url, encrypted_gemini_key, password_reset_token
- `website_projects` — user_id (FK), name, url, sitemap_url, page_count, crawl_status, crawl_data, scrape_status, scrape_data, cms_integrations (JSONB encrypted), content_style (JSONB)
- `brand_profiles` — website_project_id (FK, unique), company_name, industry, target_audience, voice_tone, primary_keywords[], competitor_urls[]
- `content_pieces` — AI-generated content (all 20 formats), status (draft/ready/published), word_count, planned_date, published_url, cache_key
- `roadmaps` — AI-generated 12-month growth roadmaps (slug-keyed for SEO)
- `project_roadmaps` — link table: website_project_id → roadmap_id
- `content_strategies` / `content_items` — 30-day content plans
- `seo_articles` — long-form SEO articles
- `geo_audits` — GEO optimization audit results
- `lead_captures` — legacy lead data
- `industries` / `locations` — reference data (seeded)

### Key Frontend Routes
- `/` — Home / roadmap generator (guest accessible)
- `/login`, `/signup` — Auth pages
- `/dashboard` — User's website projects (auth required)
- `/projects/:id` — Project detail, brand profile, settings (auth required)
- `/projects/:id/content-studio` — Content studio (auth required)
- `/content-piece/:id` — Individual content piece view/edit (auth required)
- `/roadmaps` — Public roadmap directory (SEO)
- `/roadmap/:slug` — Individual roadmap (SEO)
- `/geo-audit` — GEO audit form
- `/content-strategy/:id` — Content strategy detail
- `/seo-article/:id` — SEO article view
- `/admin` — Admin panel (super-admin only)

### Key API Endpoints
- `POST /api/auth/signup` — Create account, returns JWT
- `POST /api/auth/login` — Returns JWT
- `GET /api/auth/me` — Get current user
- `GET/POST /api/website-projects` — List/create projects
- `PUT /api/website-projects/:id/brand-profile` — Upsert brand profile
- `POST /api/website-projects/:id/brand-profile/scrape` — Auto-scrape brand info from URL
- `GET /api/website-projects/:id/content` — Aggregated content (all types)
- `GET /api/website-projects/:id/content-pieces` — List content pieces
- `POST /api/website-projects/:id/content-pieces/generate` — Non-streaming generation (DB cache check first)
- `POST /api/website-projects/:id/content-pieces/generate/stream` — SSE streaming generation (DB cache → AI cache → generate)
- `POST /api/content-pieces/:id/repurpose/stream` — SSE repurpose with phase-by-phase progress
- `PATCH /api/website-projects/:id/cms-integrations` — Save/update encrypted CMS credentials
- `POST /api/content-pieces/:id/publish` — Publish to WordPress
- `POST /api/content-pieces/:id/publish/notion` — Publish to connected Notion
- `POST /api/content-pieces/:id/publish/webflow` — Publish to connected Webflow
- `GET /api/admin/content-strategies` — Admin: all strategies (super-admin only)
- `GET /api/admin/users` — Admin: all users (super-admin only)

### CMS Integration Architecture
- Notion/Webflow tokens stored encrypted in `website_projects.cms_integrations` JSONB
- Encryption: AES-256-GCM via `artifacts/api-server/src/lib/encryption.ts`
- Same `GEMINI_KEY_ENCRYPTION_SECRET` key encrypts both user Gemini keys and CMS tokens
- SSRF guard (`assertPublicUrl`) blocks private IPs on all external HTTP requests

---

## Migration Workflow

**Always use drizzle-kit — never write SQL by hand.** See `CONTRIBUTING.md` for the full explanation.

```sh
# 1. Edit schema
vim lib/db/src/schema/content_pieces.ts

# 2. Generate migration + snapshot
pnpm --filter @workspace/db run generate

# 3. Review generated files
ls lib/db/migrations/       # new .sql file
ls lib/db/migrations/meta/  # new _snapshot.json

# 4. Apply to database
pnpm --filter @workspace/db run migrate

# 5. Rebuild TypeScript declarations (important!)
cd lib/db && npx tsc --build
```

Migrations run automatically when the API server starts (the `dev` workflow runs `migrate` before serving).

The full snapshot chain (0000–0019) is intact. Running `drizzle-kit generate` after a schema change should produce only the new diff with no re-detection of old migrations.

---

## API Codegen Workflow

The OpenAPI spec (`lib/api-spec/openapi.yaml`) is the source of truth for the API contract:

```sh
# After editing openapi.yaml:
pnpm --filter @workspace/api-spec run codegen
```

This regenerates:
- `lib/api-zod/` — Zod request/response schemas
- `lib/api-hooks/` — React Query hooks

---

## Troubleshooting

### API server won't start
Check the workflow log. Common causes:
- `DATABASE_URL` not set
- `JWT_SECRET` not set
- `GEMINI_KEY_ENCRYPTION_SECRET` not set
- Port collision (another process on 8080)

### "Property X does not exist" TypeScript errors after schema change
The DB lib's compiled declarations are stale:
```sh
cd lib/db && npx tsc --build
```

### Frontend shows blank page / can't connect to API
1. Check the API server workflow is running (green in Replit)
2. Verify `BASE_URL` is correct — frontend uses `import.meta.env.BASE_URL.replace(/\/$/, "")` as API prefix
3. Check browser console for CORS errors
4. Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R)

### Migrations fail on startup
Usually means a migration file references a column that already exists (or was dropped). Check the error in the API server log. For "column already exists" errors, the migration file may need `IF NOT EXISTS`.

### Google OAuth redirect mismatch
Add the Replit preview URL to your Google OAuth app's authorized redirect URIs. Format: `https://<your-repl-domain>/api/auth/google/callback`

### Content generation fails immediately
- Check if `GEMINI_API_KEY` or Replit AI Integration is configured
- Check the API server log for `AI generation failed` errors
- User can add their own Gemini key in Account Settings as a fallback

### Cache not returning existing pieces
The `cache_key` column was added via migration 0018 (hand-written) and reconciled into the snapshot chain in migration 0019. If pieces generated before 0018 don't have a `cache_key`, they won't be returned from cache. New pieces are automatically cached.
