# Admin Guide

## Overview

goals.ac has a super-admin role that grants access to the `/admin` panel. This panel provides read-only visibility into platform content and basic user management.

## Accessing the Admin Panel

Navigate to `/admin` when logged in as a super-admin. Regular users are redirected away from this route.

The admin panel currently has two sections:
- **Content Strategies** — view all AI-generated content strategies across all users
- **Users** — view all registered users and their metadata

## What Super-Admins Can Do

| Capability | Notes |
|---|---|
| View all content strategies | Read-only; shows strategy ID, roadmap context, created date |
| View all users | Shows email, name, role, created date |
| Access admin API endpoints | `GET /api/admin/content-strategies`, `GET /api/admin/users` |

Super-admins cannot (yet):
- Delete user accounts via the UI
- Manage content pieces or roadmaps
- Reset other users' passwords
- View CMS credentials (encrypted)

## Promoting a User to Super-Admin

Connect to the PostgreSQL database and run:

```sql
UPDATE users SET role = 'super_admin' WHERE email = 'user@example.com';
```

On Replit, you can use the built-in database query tool or connect via `psql "$DATABASE_URL"`.

To check current admins:
```sql
SELECT id, email, name, role, created_at FROM users WHERE role = 'super_admin';
```

To demote a super-admin back to regular user:
```sql
UPDATE users SET role = 'user' WHERE email = 'user@example.com';
```

## API Key & Quota Management

**Platform Gemini Key**: Set `GEMINI_API_KEY` in Replit Secrets. This is the fallback key used when no user has provided their own.

**Priority order for AI key selection:**
1. User's own encrypted Gemini key (stored in `users.encrypted_gemini_key`)
2. Replit AI Integrations proxy (`AI_INTEGRATIONS_GEMINI_API_KEY`)
3. Platform `GEMINI_API_KEY` environment variable

**User API Keys**: Users manage their own Gemini API keys from their account settings. Keys are encrypted with AES-256-GCM before storage. There is no admin UI to view or reset user API keys — they are end-to-end encrypted.

## Admin API Endpoints

All admin endpoints require a valid JWT for a user with `role = 'super_admin'`. Requests from regular users return `403 Forbidden`.

```
GET /api/admin/content-strategies
GET /api/admin/users
```

Both return JSON arrays. No pagination is implemented — for large datasets, query the database directly.

## Database Access

For operational queries, connect directly to PostgreSQL:

```sh
psql "$DATABASE_URL"
```

Useful admin queries:

```sql
-- Count users by role
SELECT role, count(*) FROM users GROUP BY role;

-- Most recent content pieces
SELECT id, title, format_type, status, created_at 
FROM content_pieces 
ORDER BY created_at DESC 
LIMIT 20;

-- Content pieces by format
SELECT format_type, count(*) 
FROM content_pieces 
GROUP BY format_type 
ORDER BY count DESC;

-- Projects per user
SELECT u.email, count(wp.id) as project_count
FROM users u
LEFT JOIN website_projects wp ON wp.user_id = u.id
GROUP BY u.email
ORDER BY project_count DESC;

-- Active CMS integrations
SELECT id, name, url, cms_integrations
FROM website_projects
WHERE cms_integrations IS NOT NULL;
```

## Security Notes

- The admin panel has no IP allowlisting — any super-admin with a valid JWT can access it from anywhere.
- CMS credentials (Notion/Webflow tokens) are stored encrypted and are not visible via the admin panel.
- JWT tokens are not invalidatable server-side. If a super-admin account is compromised, update their password and revoke sessions by changing `JWT_SECRET` (this invalidates **all** sessions platform-wide).
