# Project Memory

Living document capturing architectural decisions, historical context, and lessons learned across the goals.ac build. Updated continuously as the project evolves.

---

## Why JWT over Sessions

**Decision**: Auth uses stateless JWTs stored in `localStorage`, not server-side sessions or cookies.

**Reasoning**: The API server is a stateless Express service that may run multiple instances. Sessions would require a shared session store (Redis), adding infrastructure complexity. JWTs are self-contained, simplify horizontal scaling, and work naturally with the monorepo's separate frontend + backend. The 30-day expiry trades security for UX convenience — this is a SaaS tool, not a banking app.

**Trade-off**: JWTs cannot be invalidated server-side without a blocklist. Password changes do not invalidate existing tokens. Acceptable for this use case.

**File**: `artifacts/api-server/src/lib/auth.ts`

---

## Why Drizzle ORM over Prisma

**Decision**: Drizzle ORM with PostgreSQL.

**Reasoning**: Drizzle has a lightweight query builder that compiles directly to SQL with zero runtime magic. Prisma's generated client is a black box; Drizzle lets you see exactly what query is being sent. Drizzle's schema-as-code approach (TypeScript) integrates cleanly with Zod via `drizzle-zod`. The generated Zod insert schemas are used directly in API validation.

**Gotcha**: The migration system uses `drizzle-kit generate` to track a snapshot chain. **Never write SQL migrations by hand without also running `generate` to update the snapshot.** Several early migrations (0010–0017) were written by hand, breaking the snapshot chain — 0012–0015 and 0017–0018 have no matching snapshot files. The migration runner still applies them in order, but drizzle-kit `generate` may re-detect these changes. See `CONTRIBUTING.md`.

**Files**: `lib/db/src/schema/`, `lib/db/migrations/`

---

## Why Gemini AI (not OpenAI)

**Decision**: Google Gemini 2.5 Flash as the primary AI model.

**Reasoning**: Gemini 2.5 Flash offers a generous free tier for development, native streaming, and competitive quality for long-form content generation. The platform integrates via `@google/genai` SDK. `thinkingConfig: { thinkingBudget: 0 }` disables extended thinking to reduce latency for streaming responses.

**Bring-your-own-key**: Users can supply their own Gemini API key, stored encrypted with AES-256-GCM. The platform first checks for a user key, falls back to the Replit AI Integration proxy, then falls back to the environment `GEMINI_API_KEY`.

**Encryption**: `GEMINI_KEY_ENCRYPTION_SECRET` is used to derive a 256-bit key via SHA-256. The same key encrypts CMS credentials (Notion/Webflow tokens). **If this secret changes, all stored encrypted values become unreadable.**

**Files**: `artifacts/api-server/src/services/contentStudioGenerator.ts`, `artifacts/api-server/src/lib/encryption.ts`

---

## The Glass UI Design Direction

**Decision**: Dark "glass" aesthetic with `backdrop-filter: blur()` on dark backgrounds; clean borders + shadow on light backgrounds.

**Reasoning**: The target audience (B2B SaaS founders) expect a modern, premium-feeling tool. The glass cards (`glass-card`, `glass-card-md`) achieve this on dark pages (home, roadmap detail) without looking gimmicky on light pages (forms, dashboards).

**Rule**: Glass cards have zero light-mode blur — they render as standard white cards with `border` and `shadow-xl`. This avoids the "frosted glass on a white page" look that doesn't work visually.

**Files**: `artifacts/goals-ac/src/index.css`

---

## Content Studio Architecture

**How it works:**
1. User picks a content format and enters a target keyword + optional angle hint
2. Frontend calls `POST /api/website-projects/:id/content-pieces/generate/stream`
3. API builds a `BrandContext` from the project's brand profile + content style settings
4. A 16-character cache key is derived: SHA-256 of `format + keyword + brand fields + style fields`
5. DB-level cache check: if a piece with the same `(websiteProjectId, cacheKey)` exists, return it immediately via `event: cached` — no AI call, no new row
6. AI-level cache check: if the AI output is cached in Redis/in-memory LRU (24h TTL), stream it and insert a new row with the cache key
7. Otherwise: call Gemini with the full prompt, stream chunks as SSE `event: chunk`, save to DB, set AI cache
8. Frontend streams chunks into a live section detector (detects H2/H3 headings to show progress)

**Repurpose flow**: Separate endpoint `POST /api/content-pieces/:id/repurpose/stream` — takes existing content, calls Gemini to convert it to a new format, streams SSE events with phase-by-phase progress (analyzing → generating → saving).

**Files**: 
- `artifacts/api-server/src/services/contentStudioGenerator.ts` — AI generation, cache
- `artifacts/api-server/src/routes/contentPieces.ts` — all content piece routes
- `artifacts/goals-ac/src/pages/content-studio.tsx` — frontend

---

## Brand Profile Scraping

**How it works:**
1. User enters their website URL when creating a project
2. Hitting "Auto-fill from website" calls `POST /api/website-projects/:id/brand-profile/scrape`
3. The API fetches the URL (with SSRF guard — `assertPublicUrl` blocks private IPs), extracts text content
4. Gemini analyzes the page and returns structured brand data: company name, industry, target audience, voice/tone, primary keywords, competitor URLs
5. The result is saved to the `brand_profiles` table and returned to the frontend

**SSRF Guard**: `assertPublicUrl` resolves the hostname and blocks RFC-1918 addresses, localhost, and link-local ranges. All external fetches go through this guard.

**Files**: `artifacts/api-server/src/routes/websiteProjects.ts` (scrape endpoint), `artifacts/api-server/src/lib/ssrf.ts`

---

## Super-Admin Role

**How it works**: The `users.role` column defaults to `'user'`. Setting it to `'super_admin'` grants access to admin routes.

**Promotion**: Promote a user via direct SQL:
```sql
UPDATE users SET role = 'super_admin' WHERE email = 'user@example.com';
```

**Guard**: Admin routes use `requireSuperAdmin` middleware which checks `req.user.role === 'super_admin'`.

**Admin panel routes**: `GET /api/admin/content-strategies`, `GET /api/admin/users` — both require super-admin.

**Files**: `artifacts/api-server/src/lib/auth.ts` (middleware), `artifacts/api-server/src/routes/auth.ts` (admin routes)

---

## CMS Publishing Architecture

All three CMS platforms are supported from the same `PublishDialog` in `content-piece.tsx`:

| Platform | Credential storage | Publish mechanism |
|---|---|---|
| WordPress | Per-publish (not stored) | XML-RPC `metaWeblog.newPost` |
| Notion | Encrypted in `website_projects.cms_integrations` JSONB | Markdown → Notion blocks |
| Webflow | Encrypted in `website_projects.cms_integrations` JSONB | Markdown → HTML → CMS item |

The `cms_integrations` JSONB column stores an object like:
```json
{
  "notion": { "token": "<encrypted>", "databaseId": "...", "status": "connected" },
  "webflow": { "token": "<encrypted>", "collectionId": "...", "siteId": "...", "status": "connected" }
}
```

**Encryption**: AES-256-GCM, same key as Gemini key encryption (`GEMINI_KEY_ENCRYPTION_SECRET`).

**Files**: `artifacts/api-server/src/services/notionPublisher.ts`, `artifacts/api-server/src/services/webflowPublisher.ts`

---

## Monorepo Structure & Package References

The monorepo uses pnpm workspaces with TypeScript project references:

- `lib/db` — Drizzle schema + migrations; exports `.d.ts` declaration files from `dist/`
- `lib/api-spec` — OpenAPI YAML; source of truth for API contracts
- `lib/api-zod` — Generated Zod schemas from OpenAPI spec (via Orval)
- `lib/api-hooks` — Generated React Query hooks from OpenAPI spec (via Orval)

**Important**: After editing `lib/db/src/schema/`, run `npx tsc --build` inside `lib/db/` to regenerate the `.d.ts` files in `dist/`. Without this, the API server's TypeScript compiler won't see the new column types.

---

## Content Style Injection

The `content_style` JSONB column on `website_projects` stores a `ContentStyle` object:
```typescript
interface ContentStyle {
  tonePreset?: "professional" | "casual" | "technical" | "conversational";
  personaName?: string;
  defaultWordCount?: number;
  primaryLanguage?: string;
  forbiddenWords?: string[];
  readingLevel?: "general" | "intermediate" | "expert";
}
```

The `buildContentStyleContext(style)` function in `contentStudioGenerator.ts` turns this into a prompt fragment injected into every AI generation call. If no style is set, the function returns an empty string.

---

## Environment Variables

| Variable | Purpose | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Signs JWT tokens — keep secret, never rotate without invalidating all sessions | Yes |
| `GEMINI_KEY_ENCRYPTION_SECRET` | AES-256-GCM key derivation for user Gemini keys + CMS tokens | Yes |
| `GEMINI_API_KEY` | Platform-level Gemini key fallback | Optional |
| `GOOGLE_CLIENT_ID` | Google OAuth app client ID | Optional |
| `GOOGLE_CLIENT_SECRET` | Google OAuth app client secret | Optional |
| `RESEND_API_KEY` | Resend email API key for password resets | Optional |
| `LEADSH_WEBHOOK_URL` | Webhook URL for lead capture events | Optional |
| `REDIS_URL` | Redis connection URL for AI output caching | Optional |
| `AI_INTEGRATIONS_GEMINI_API_KEY` | Replit AI Integrations proxy key | Auto-injected on Replit |
| `AI_INTEGRATIONS_GEMINI_BASE_URL` | Replit AI Integrations proxy base URL | Auto-injected on Replit |
| `RESEND_FROM_EMAIL` | From address for transactional emails | Optional (default: noreply@goals.ac) |

---

## Historical Gotchas

- **Double migration 0008**: There are two files named `0008_aspiring_firebrand.sql` and `0008_condemned_rocket_racer.sql`. This happened because an early migration was renamed. The journal references `0008_condemned_rocket_racer` — the other file is a stale artifact that should not be applied.
- **Snapshot gaps**: Migrations 0012–0015, 0017, 0018 have no matching snapshot files in `meta/`. The runner applies them fine, but `drizzle-kit generate` may try to re-include them. Always review generated SQL before applying.
- **`contentStyle` TS errors**: The `@workspace/db` compiled declarations in `lib/db/dist/` can go stale. If you see "Property 'contentStyle' does not exist" errors after a schema change, run `cd lib/db && npx tsc --build` to regenerate.
- **Port collisions**: Vite will increment the port if the default is in use. The API server always binds to the `PORT` env var; Vite uses `PORT` too. Ensure the artifact `PORT` assignments don't collide.
