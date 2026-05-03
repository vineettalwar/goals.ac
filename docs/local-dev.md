# Local Development Guide

Step-by-step instructions for running the full goals.ac stack outside of Replit.

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 20+ (24 recommended) | Use [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm) |
| pnpm | 9+ | `npm install -g pnpm` |
| PostgreSQL | 14+ | Local install or Docker |

## 1. Clone the Repository

```sh
git clone https://github.com/vineettalwar/goals.ac.git
cd goals.ac
```

## 2. Install Dependencies

```sh
pnpm install
```

This installs all workspace packages. No separate `npm install` calls needed.

## 3. Set Up PostgreSQL

### Option A — Local PostgreSQL

```sh
# macOS (Homebrew)
brew install postgresql@17
brew services start postgresql@17

# Create a database
createdb goalsac
```

### Option B — Docker

```sh
docker run -d \
  --name goalsac-postgres \
  -e POSTGRES_DB=goalsac \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:17
```

## 4. Configure Environment Variables

Copy the example file and fill in your values:

```sh
cp .env.example .env
```

Edit `.env`:

```env
# Required
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/goalsac
JWT_SECRET=your-random-32-char-secret-here
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
```

To generate a secure random secret:
```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 5. Run Database Migrations

```sh
pnpm --filter @workspace/db run migrate
```

This creates all tables. On first run it will apply all 19 migrations (0000–0018).

## 6. Seed Reference Data (Optional)

```sh
pnpm --filter @workspace/db run seed
```

Seeds industries and locations. Skip this if you're connecting to an existing database.

## 7. Start the API Server

In one terminal:

```sh
PORT=8080 pnpm --filter @workspace/api-server run dev
```

The API server will be available at `http://localhost:8080/api`.

Verify it's running:
```sh
curl http://localhost:8080/api/healthz
# → {"status":"ok"}
```

## 8. Start the Frontend

In a second terminal:

```sh
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/goals-ac run dev
```

Open `http://localhost:5173` in your browser.

**Important**: The frontend proxies `/api` requests to the API server via Vite. If the API is on a different port, update the `proxy` config in `artifacts/goals-ac/vite.config.ts`.

## 9. Running Both Together (Optional)

Add a root-level dev script if you want to run both simultaneously:

```sh
# In package.json root (not currently set up — run in separate terminals)
pnpm run dev:api &
pnpm run dev:web
```

Or use `concurrently`:
```sh
npx concurrently \
  "PORT=8080 pnpm --filter @workspace/api-server run dev" \
  "PORT=5173 pnpm --filter @workspace/goals-ac run dev"
```

## 10. Verify the Setup

1. Open `http://localhost:5173`
2. Click "Sign up" and create an account
3. Generate a roadmap — if AI is configured, it should stream back a result
4. Navigate to the Dashboard and create a website project

## Common Issues

### `Cannot find module '@workspace/db'`
The DB lib's compiled declarations are stale. Rebuild them:
```sh
cd lib/db && npx tsc --build
```

### `JWT_SECRET is not set`
Make sure `.env` is in the repo root and the API server is started from the project root (or exports the env).

### `GEMINI_KEY_ENCRYPTION_SECRET environment variable is not set`
Required even if you're not using user-provided Gemini keys. Set a random 32-char string.

### Database connection refused
Check PostgreSQL is running: `pg_isready -h localhost -p 5432`

### Port already in use
Change the PORT for either service. If you change the API port, update the Vite proxy config.

### Google OAuth redirect mismatch
Add `http://localhost:5173/auth/callback/google` (or whichever port) to your Google OAuth app's authorized redirect URIs.

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
