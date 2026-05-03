# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run generate` — generate a new migration + snapshot after schema changes (**always run this; never write migrations by hand**)
- `pnpm --filter @workspace/db run migrate` — apply pending migrations to the database
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only, skips migration files)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Architecture

### Artifacts
- **goals-ac** (`/`) — React + Vite frontend
- **api-server** (`/api`) — Express REST API backend
- **mockup-sandbox** (`/__mockup`) — Design canvas

### Auth System
Email/password authentication using:
- **bcryptjs** for password hashing
- **jsonwebtoken** for JWT tokens (30-day expiry, stored in localStorage as `goals_ac_token`)
- `lib/auth.ts` in api-server provides `requireAuth` and `optionalAuth` middleware
- `AuthProvider` + `useAuth` in `artifacts/goals-ac/src/context/auth.tsx`

### Database Tables
- `users` — email, password_hash, name
- `website_projects` — user_id (FK), name, url, sitemap_url, page_count, crawl_status, cms_integrations (JSONB, encrypted tokens for Notion/Webflow)
- `brand_profiles` — website_project_id (FK, unique), company_name, industry, target_audience, voice_tone, primary_keywords[], competitor_urls[]
- `roadmaps` — AI-generated growth roadmaps
- `content_strategies` / `content_items` — 30-day content plans (optional website_project_id)
- `seo_articles` — AI-generated SEO content (optional website_project_id)
- `geo_audits` — technical GEO audit results (optional website_project_id)
- `lead_captures` — legacy lead data (webhook disabled from core flow)
- `content_pieces` — AI-generated content pieces (blog posts, guides, etc.) with publishing support

### Key Routes (Frontend)
- `/` — Home / roadmap generator (guest accessible)
- `/login` — Login page
- `/signup` — Signup page
- `/dashboard` — User's website projects (auth required)
- `/projects/:id` — Project detail + brand profile + associated content (auth required)
- `/roadmaps` — Public roadmap directory
- `/roadmap/:slug` — Individual roadmap page
- `/geo-audit` — GEO audit form
- `/content-strategy/:id` — Content strategy detail
- `/seo-article/:id` — SEO article view

### Key API Endpoints
- `POST /api/auth/signup` — Create account, returns JWT
- `POST /api/auth/login` — Returns JWT
- `GET /api/auth/me` — Get current user (requires auth)
- `GET/POST /api/website-projects` — List/create projects (requires auth)
- `GET /api/website-projects/:id` — Project detail + brand profile (requires auth)
- `PUT /api/website-projects/:id/brand-profile` — Upsert brand profile (requires auth)
- `DELETE /api/website-projects/:id` — Delete project (requires auth)
- `GET /api/website-projects/:id/content` — Aggregated content for a project (requires auth)
- `GET /api/website-projects/:id/cms-integrations` — Get masked CMS credentials (Notion/Webflow)
- `PATCH /api/website-projects/:id/cms-integrations` — Save/update CMS credentials (encrypted)
- `DELETE /api/website-projects/:id/cms-integrations/:platform` — Disconnect a CMS (notion|webflow)
- `POST /api/content-pieces/:id/publish` — Publish to WordPress (credentials in body)
- `POST /api/content-pieces/:id/publish/notion` — Publish to connected Notion database
- `POST /api/content-pieces/:id/publish/webflow` — Publish as draft to connected Webflow collection

### CMS Integration Architecture
- Notion/Webflow credentials stored encrypted in `website_projects.cms_integrations` JSONB column
- Encryption uses AES-256-GCM via `artifacts/api-server/src/lib/encryption.ts` (same key as Gemini API key)
- Notion publisher: `artifacts/api-server/src/services/notionPublisher.ts` (markdown→Notion blocks)
- Webflow publisher: `artifacts/api-server/src/services/webflowPublisher.ts` (markdown→HTML→CMS item)
- Project Settings → Publishing tab shows connection status and connect/disconnect forms
- PublishDialog in content-piece.tsx lets users pick WordPress / Notion / Webflow per-publish
