# Auth and avatars

**Audience:** anyone changing login, session, or profile photo.  
**Status (2026-09-15):** dual-path auth — production Edge Mesh (JWT cookie) vs Next Auth.js (local). Google invite-only login and avatar upload are on both. MFA TOTP is enrolled on both; production sessions carry `mfaVerified` on the cookie.

## Two auth stacks (do not mix blindly)

| Surface | Mechanism | Session | Where |
|---|---|---|---|
| **Production** `app.goals.ac` | Email/password + Google OAuth on `api.goals.ac` | HMAC session JWT cookie (`@workspace/cf-edge/session-cookie`) | `cf-public-worker`, `goals-app-ui` |
| **Dev** `marketing-persona-app` `:3001` | NextAuth / Auth.js | Auth.js session (JWT strategy) | `src/auth.ts`, route handlers |

A feature is not production-complete when it only works in NextAuth.

## Google sign-in (production / Edge Mesh)

**Entry (UI):** `goals-app-ui` `LoginPage` builds  
`{apiBase}/api/auth/google?returnUrl={appOrigin}/…`

**Worker:** `artifacts/cf-public-worker/src/auth-google.ts`

| Step | Route / helper | Notes |
|---|---|---|
| Start | `GET /api/auth/google` | Signed OAuth `state` (returnUrl + nonce); redirects to Google |
| Callback | `GET /api/auth/google/callback` | Token exchange → userinfo → session cookie → redirect to `returnUrl` |
| Redirect URI | Local: `{workerOrigin}/api/auth/google/callback`; prod: `https://api.goals.ac/api/auth/google/callback` | Must match Google Cloud console |
| App origin | `APP_URL` wrangler var, else `https://app.goals.ac` (local → `:5174`) | Also allows `*.goals-ac-app.pages.dev` |

**Invite-only rule:** `googleSignInAllowed` — existing `googleId` or existing email may sign in; unknown emails get `?error=no_account`. No auto-signup.

**Secrets (public worker):** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`. Optional: `APP_URL`.

**Self-check:** `node artifacts/cf-public-worker/scripts/google-signin-selfcheck.mjs`

**Gateway:** `/api/auth/google` is routed to the public worker (`cf-gateway`).

## MFA (production / Edge Mesh)

Session cookies include `mfaVerified`. Login/Google set it `true` when TOTP is off. `POST /api/auth/mfa/confirm` and `POST /api/auth/mfa/verify` re-issue the cookie with `mfaVerified: true`. Read/write workers run `requireWorkerSession` (org suspend → IP allowlist → MFA). Exempt: `/api/auth/mfa/*` and `GET /api/auth/me`. SPA `MfaComplianceGate` blocks the app until setup/verify.

## Google sign-in (Next / local)

- UI: `signInWithGoogle` → Auth.js `signIn("google", { redirectTo })`
- Policy: existing accounts only — enforced in `marketing-persona-app/src/auth.ts` `signIn` callback
- On success: links `googleId`, may set `avatarUrl` from Google `picture`

## Avatars

### Display resolution

| Layer | Behavior |
|---|---|
| Next session image | `resolveSessionImage(avatarUrl, email)` — HTTPS avatar, else Gravatar SHA-256 |
| App-shell / SPA | Gravatar helper in `lib/app-shell/src/settings/gravatar.ts` (Web Crypto) |
| Next server | `avatar-display.ts` (Node `crypto`) |

### Storage

- DB column: `users.avatar_url` — **public HTTPS URL only** (Google picture or R2), not raw data URIs long-term
- Upload path: client sends resized JPEG/PNG data URI → `resolveAvatarForStorage` → R2 via `@workspace/media` → store returned HTTPS URL
- Clear: empty / null clears `avatar_url`

| Runtime | Write path |
|---|---|
| Edge Mesh | `cf-write-worker` `PATCH /api/auth/me` (`auth-me.ts`) |
| Next | Settings / `auth` profile flows using `lib/auth/avatar.ts` |

**Requires:** content media (R2) configured for uploads; Google OAuth picture URLs work without R2.

### UI

- Shared settings chrome: `lib/app-shell` settings UI + `read-avatar-file.ts`
- SPA: `goals-app-ui` `SettingsPage`
- Next: `settings-profile-panel` / settings page client

## Related (not login)

Google OAuth for **integrations** (GSC, GA4, Sheets) uses separate routes (`/api/auth/google-search-console`, etc.) — do not confuse with login.

## Verify

```sh
node artifacts/cf-public-worker/scripts/google-signin-selfcheck.mjs
# Optional: avatar-selfcheck if present
node artifacts/marketing-persona-app/scripts/avatar-selfcheck.mjs
```

Manual: login with invited Google account → lands on dashboard with cookie; Settings → upload avatar → `GET /api/auth/me` shows HTTPS `avatarUrl`.

## Provenance

2026-09-15 — Edge Mesh MFA cookie + `requireWorkerSession`; Google invite-only; avatar PATCH on write worker.
