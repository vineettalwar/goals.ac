<p align="center">
  <img src="artifacts/goals-ac/public/og-image.png" alt="goals.ac" width="600" />
</p>

# goals.ac

**AI-powered programmatic SEO platform for B2B startup growth roadmaps.**

Generate tailored 12-month growth roadmaps, SEO content strategies, article drafts, GEO audits, and a full content studio — all personalized to your company's brand, industry, and stage.

---

## Features

- **Growth Roadmap Generator** — AI-generated 12-month roadmaps by industry, location, and funding stage; public SEO directory
- **Content Studio** — Generate 20+ content formats (blog posts, LinkedIn threads, whitepapers, FAQs, etc.) with streaming progress
- **Content Repurposing** — Convert any content piece into a different format with phase-by-phase AI progress
- **Brand Profile** — Auto-scrape your website to populate company info, keywords, and audience; fine-tune voice, tone, and content style
- **Content Style Settings** — Persona name, tone preset, word count, language, reading level, forbidden words — injected into every AI prompt
- **SEO Article Generator** — Long-form SEO articles tied to specific roadmap phases
- **GEO Audit** — Generative Engine Optimization audit for AI search visibility
- **CMS Publishing** — Publish content directly to WordPress, Notion, or Webflow; encrypted credential storage
- **User Accounts** — Email/password and Google OAuth; bring-your-own Gemini API key
- **DB-Level Content Caching** — Repeated generation requests return instantly for the same project + format + keyword combination
- **Admin Panel** — Super-admin role with user management and content strategy views

## Tech Stack

![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-24-green?logo=node.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-7-purple?logo=vite)
![Express](https://img.shields.io/badge/Express-5-black?logo=express)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791?logo=postgresql)
![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-C5F74F)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss)
![Gemini AI](https://img.shields.io/badge/Gemini-2.5_Flash-4285F4?logo=google)

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, Tailwind CSS 4, shadcn/ui |
| Backend | Express 5, Node 24, TypeScript 5.9 |
| Database | PostgreSQL + Drizzle ORM + Zod validation |
| AI | Google Gemini 2.5 Flash (streaming + thinking budget) |
| Auth | JWT (30-day), bcrypt, Google OAuth 2.0 |
| CMS | Notion API, Webflow CMS API, WordPress REST API (Application Passwords) |
| Monorepo | pnpm workspaces |

## Quick Start

For full local setup instructions (PostgreSQL, env vars, ports), see **[docs/local-dev.md](docs/local-dev.md)**.

```sh
git clone https://github.com/vineettalwar/goals.ac.git
cd goals.ac
pnpm install
cp .env.example .env   # fill in your values
pnpm --filter @workspace/db run migrate
pnpm --filter @workspace/api-server run dev   # API on :8080
pnpm --filter @workspace/goals-ac run dev     # UI on :5173
```

## Documentation

| Document | Description |
|---|---|
| [docs/local-dev.md](docs/local-dev.md) | Full local development setup guide |
| [docs/design.md](docs/design.md) | Design system: tokens, dark/light mode, glass cards, typography |
| [docs/roadmap.md](docs/roadmap.md) | Product roadmap: shipped phases and upcoming work |
| [docs/memory.md](docs/memory.md) | Architectural decisions, gotchas, and historical context |
| [docs/admin.md](docs/admin.md) | Admin panel guide: super-admin role, user promotion, quota |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Database migration workflow and contribution guidelines |

## Project Structure

```
goals.ac/
├── artifacts/
│   ├── api-server/        # Express REST API (port 8080)
│   └── goals-ac/          # React + Vite frontend
├── lib/
│   ├── db/                # Drizzle schema, migrations, migrate runner
│   ├── api-spec/          # OpenAPI spec + Orval codegen
│   ├── api-zod/           # Generated Zod schemas
│   └── api-hooks/         # Generated React Query hooks
├── docs/                  # Project documentation
├── .env.example           # Required environment variables
├── CONTRIBUTING.md        # Migration workflow
└── replit.md              # Replit developer reference
```

## Contributing

1. Never write migration SQL by hand — always use `pnpm --filter @workspace/db run generate` after schema changes. See [CONTRIBUTING.md](CONTRIBUTING.md).
2. All new routes must use `requireAuth` or `optionalAuth` middleware from `lib/auth.ts`.
3. Run `pnpm run typecheck` before pushing.

## License

Private. All rights reserved.
