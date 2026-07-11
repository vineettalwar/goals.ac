# Product Roadmap

## Shipped

### Phase 1 — Core Platform
*The foundational AI roadmap generator and public SEO directory.*

- **Roadmap generator** — AI-generated 12-month B2B growth roadmaps by industry, location, and funding stage
- **Public roadmap directory** — `/roadmaps` browsable SEO directory with filtering
- **Roadmap caching** — DB-level deduplication: same slug returns the existing row instantly
- **Lead capture** — Email/name capture form on roadmap pages (webhook integration)
- **Industry & location seeding** — Reference data tables with full seed scripts
- **SEO meta** — Per-page title, description, canonical, and OG tags

### Phase 2 — Content Strategy & Articles
*Extending roadmaps into actionable 30-day content plans and long-form articles.*

- **30-day content strategy** — AI-generated content calendar tied to roadmap phases
- **Content item status tracking** — Mark items done/in-progress within a strategy
- **SEO article generator** — Long-form articles generated from roadmap context
- **GEO audit** — Generative Engine Optimization audit for AI search visibility
- **Content strategy → SEO article link** — Articles can be linked to their source strategy

### Phase 3 — User Accounts & Projects
*Full user authentication and project management.*

- **Email/password auth** — JWT-based with bcrypt password hashing; 30-day tokens
- **Google OAuth** — Sign in with Google; account merging for existing email users
- **Dashboard** — User's website projects list with quick actions
- **Website projects** — Create and manage SEO projects per domain
- **Brand profile** — AI-powered brand profile scraping from website URL
- **Brand profile editing** — Full edit UI: company name, industry, audience, tone, keywords, competitors
- **Project-linked content** — Roadmaps, strategies, articles, and GEO audits can be associated with projects
- **Content aggregation** — Single API endpoint aggregates all content types per project
- **Password reset** — Email-based reset flow using Resend (token stored in DB)
- **Avatar URLs** — Google avatar synced on OAuth login

### Phase 4 — Content Studio
*A dedicated workspace for generating and managing any content format.*

- **Content Studio** — Per-project studio for generating 20+ content formats
- **20 content formats** — Blog posts, news articles, tutorials, guides, whitepapers, pillar pages, location pages, infographic outlines, LinkedIn posts, Twitter threads, Instagram posts, email sequences, ad copy, landing page copy, product descriptions, press releases, FAQ articles
- **Streaming generation** — Server-Sent Events stream content progressively with live section detection
- **Content piece management** — CRUD, status tracking (draft / ready / published), word count
- **Content calendar** — Drag-and-drop calendar view with planned date scheduling
- **Content repurposing** — Convert any piece into a different format with phase-by-phase progress
- **Regenerate existing pieces** — Re-run AI generation on any saved piece
- **AI cache (Redis/LRU)** — 24-hour in-memory/Redis cache for AI generation output
- **DB-level content caching** — Cache key stored per piece; same inputs return existing piece instantly
- **User Gemini API key** — Users can supply their own Gemini key; encrypted with AES-256-GCM

### Phase 5 — Brand & Content Style
*Brand profile depth and AI persona customization.*

- **Content style settings** — Tone preset, persona name, default word count, language, reading level, forbidden words — all injected into every AI prompt
- **Brand scraping** — SSRF-protected scraping of website URL + sitemap to auto-populate brand fields
- **Content style → brand profile tab** — Dedicated "Content Style" sub-tab within Project Settings

### Phase 6 — Integrations & Publishing
*Push content to external CMS platforms.*

- **WordPress publishing** — REST API with Application Passwords (credentials entered per-publish)
- **Notion publishing** — Markdown → Notion blocks; credentials stored encrypted per project
- **Webflow publishing** — Markdown → HTML → Webflow CMS item; encrypted per project
- **CMS health check** — Real-time status check for Notion and Webflow connections
- **Publishing tab** — Per-project settings tab for managing CMS connections
- **PublishDialog** — Per-piece publish flow with platform selection
- **Encrypted CMS credentials** — AES-256-GCM encryption of all third-party tokens

### Phase 7 — Admin & Polish
*Super-admin tooling, UI polish, and platform reliability.*

- **Super-admin role** — `role = 'super_admin'` on users table; admin routes require this role
- **Admin panel** — `/admin` with content strategies view and user management
- **Light/dark mode toggle** — Full dual-mode support across all pages
- **Delete button contrast fix** — Consistent `hover:text-red-600 hover:bg-red-100` in both modes
- **Repurpose progress indicator** — Phase-by-phase step tracker matching roadmap pattern
- **Repo documentation** — README, design docs, roadmap, memory, admin guide, local-dev guide

### Phase 8 — Competitive Edge (vs BabyLoveGrowth.ai)
*Humanized articles, integrations breadth, and production hardening. See [competitive-edge-prd.md](competitive-edge-prd.md).*

- **Humanization pipeline** — Second-pass AI rewrite of every generated article for human rhythm and voice; per-company intensity setting (off/light/strong) with optional writing-sample voice matching; "Humanized" badge on articles
- **Ghost publishing** — Ghost Admin API connector (JWT-signed, draft/live, tags, excerpt)
- **Webhook publishing** — Generic HMAC-signed webhook connector (unlocks Zapier/Make/n8n and custom stacks)
- **Integrations hub** — `/integrations` page listing WordPress, Notion, Webflow, Ghost, and Webhook connections with connect/test/status
- **Publish-anywhere menu** — Per-article publish dropdown across all configured connections
- **BYOK wired end-to-end** — marketing-persona-app generation uses the user's encrypted Gemini key when present
- **Usage metering** — `usage_events` table records tokens + estimated cost per generation, BYOK-flagged
- **Plan quotas** — starter/growth/scale plans with monthly article limits enforced server-side; BYOK bypasses quota
- **Usage dashboard** — Articles this month, quota remaining, estimated BYOK spend, plan badge in settings
- **Legal pages** — Substantive `/privacy` and `/terms`
- **Rate limiting** — Per-user limits on AI routes, per-IP limits on auth routes
- **Security headers** — HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy
- **Monorepo typecheck green** — Fixed pre-existing type errors in api-server and goals-ac

---

## In Progress

- **Onboarding wizard** — Step-by-step new-user onboarding flow (Task #43)

---

## Planned

The following features are in the backlog and prioritized roughly in order:

| Feature | Description |
|---|---|
| Password recovery | Let users who signed up with Google set an email/password |
| Soften glass shadows | Light mode glass card shadow refinement |
| GitHub auto-sync | Automatically push to GitHub after every task merge |
| API key usage badge | Show a badge on content generated with the user's own Gemini key |
| Usage dashboard | Show total AI generations run per user and per project |
| Quota exhaustion prompt | Friendly upgrade prompt when platform AI quota is hit |
| Content style preview badge | Preview badge inside each generated article showing active style settings |
| AI persona preview | Let users hear how their persona and tone sounds before saving |
| Notion/Webflow integration testing | End-to-end integration tests with real credentials |
| CMS platform labels | Show which CMS a piece was published to (not just "Published") |
| Onboarding wizard | New-user step-by-step setup flow (in progress) |
| Admin section in nav | Super-admin nav link visible only to admins |
| Link content on login | Auto-associate guest-generated content with account on login |
| Content style in articles | Inject style settings into SEO article generator (currently content-studio only) |
