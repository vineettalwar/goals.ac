# Local Development Guide

Step-by-step instructions for running the full goals.ac stack outside of Replit.

## Quick Start (Docker Compose) — Recommended

The fastest way to get the stack running. No manual Postgres setup or environment configuration required.

**Prerequisites:** [Docker](https://docs.docker.com/get-docker/) with the Compose plugin (included in Docker Desktop).

```sh
git clone https://github.com/vineettalwar/goals.ac.git
cd goals.ac
docker compose up --build
```

This starts the **default** services:

| Service | URL | Description |
|---|---|---|
| **Next.js app** | <http://localhost:3001> | Canonical product app (`marketing-persona-app`) |
| **Worker** | — | pg-boss background job consumer |
| **Postgres** | localhost:5432 | PostgreSQL 17 (`goalsac` database) |

Open <http://localhost:3001> once the app container is healthy.

### Legacy stack (optional)

The old Vite frontend and Express API are still in the repo for debugging but are **not** started by default:

```sh
docker compose --profile legacy up --build
```

| Service | URL | Description |
|---|---|---|
| Legacy Vite | <http://localhost:5173> | Redirect shell → Next.js |
| Legacy API | <http://localhost:8080/api> | Express REST (routes ported to Next) |

**Optional env vars** — create a `.env` file in the repo root to add keys for AI generation, Google OAuth, or email:

```sh
cp .env.example .env
# Edit .env and fill in GEMINI_API_KEY, GOOGLE_CLIENT_ID, etc.
```

The `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, and `GEMINI_KEY_ENCRYPTION_SECRET` are pre-configured with safe development defaults in `docker-compose.yml`; you only need to override them if you want custom values.

To stop and remove containers:
```sh
docker compose down          # keep the Postgres volume
docker compose down -v       # also remove the Postgres volume (fresh DB)
```

---

## Manual Setup

Follow the steps below if you prefer to run the services without Docker.

### Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 20+ (24 recommended) | Use [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm) |
| pnpm | 9+ | `npm install -g pnpm` |
| PostgreSQL | 14+ | Local install or Docker |

### 1. Clone the Repository

```sh
git clone https://github.com/vineettalwar/goals.ac.git
cd goals.ac
```

### 2. Install Dependencies

```sh
pnpm install
```

This installs all workspace packages. No separate `npm install` calls needed.

### 3. Set Up PostgreSQL

#### Option A — Local PostgreSQL

```sh
# macOS (Homebrew)
brew install postgresql@17
brew services start postgresql@17

# Create a database
createdb goalsac
```

#### Option B — Docker

```sh
docker run -d \
  --name goalsac-postgres \
  -e POSTGRES_DB=goalsac \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:17
```

### 4. Configure Environment Variables

Copy the example file and fill in your values:

```sh
cp .env.example .env
```

Edit `.env`:

```env
# Required
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/goalsac
AUTH_SECRET=your-random-32-char-secret-here
NEXTAUTH_URL=http://localhost:3001
GEMINI_KEY_ENCRYPTION_SECRET=another-random-32-char-secret

# Optional — AI generation
GEMINI_API_KEY=your-gemini-api-key-here

# Optional — Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Optional — Email (password reset)
RESEND_API_KEY=re_your_key_here

# Optional — Redis caching
REDIS_URL=redis://localhost:6379

# Legacy Express only (if you still run api-server manually)
JWT_SECRET=your-random-32-char-secret-here
```

To generate a secure random secret:
```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Run Database Migrations

```sh
pnpm --filter @workspace/db run migrate
```

This creates all tables. On first run it will apply all migrations.

### 6. Seed Reference Data (Optional)

```sh
pnpm --filter @workspace/db run seed
```

Seeds industries and locations. Skip this if you're connecting to an existing database.

### 7. Start the Next.js App (canonical)

In one terminal:

```sh
pnpm --filter @workspace/marketing-persona-app run dev
```

The app will be available at `http://localhost:3001`.

### 8. Start the Background Worker

In a second terminal:

```sh
pnpm --filter @workspace/worker run dev
```

### 9. Legacy stack (optional)

Only needed for debugging the old Express/Vite artifacts:

```sh
# Terminal 3 — legacy API
PORT=8080 pnpm --filter @workspace/api-server run dev

# Terminal 4 — legacy Vite (redirects to Next)
pnpm --filter @workspace/goals-ac run dev
```

### 10. Verify the Setup

1. Open `http://localhost:3001`
2. Click "Sign up" and create an account
3. Generate a roadmap — if AI is configured, it should stream back a result
4. Navigate to the Dashboard and create a website project

## Common Issues

### `Cannot find module '@workspace/db'`
The DB lib's compiled declarations are stale. Rebuild them:
```sh
cd lib/db && npx tsc --build
```

### `AUTH_SECRET is not set`
Make sure `.env` is in the repo root and includes `AUTH_SECRET` and `NEXTAUTH_URL=http://localhost:3001`.

### `GEMINI_KEY_ENCRYPTION_SECRET environment variable is not set`
Required even if you're not using user-provided Gemini keys. Set a random 32-char string.

### Database connection refused
Check PostgreSQL is running: `pg_isready -h localhost -p 5432`

### Port already in use
Change the port for the service you're running (e.g. `PORT=3002` for Next).

### Google OAuth redirect mismatch
Add `http://localhost:3001/api/auth/callback/google` to your Google OAuth app's authorized redirect URIs.

## Development Workflow

### Adding a Schema Column

1. Edit `lib/db/src/schema/<table>.ts`
2. Generate migration: `pnpm --filter @workspace/db run generate`
3. Review the generated `.sql` and snapshot in `lib/db/migrations/`
4. Apply: `pnpm --filter @workspace/db run migrate`
5. Rebuild declarations: `cd lib/db && npx tsc --build`

### Regenerating API Types

After changing `lib/api-spec/openapi.yaml`:
```sh
pnpm --filter @workspace/api-spec run codegen
```

This regenerates Zod schemas in `lib/api-zod/` and React Query hooks in `lib/api-hooks/`.

### TypeScript Check

```sh
pnpm run typecheck
```

Runs `tsc --noEmit` across all packages.

## Environment Variable Reference

See `.env.example` for the complete annotated list, or [docs/memory.md](memory.md#environment-variables) for detailed descriptions.
