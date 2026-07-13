# PRD: Platform Operations & Org Security

**Status:** Implemented (2026-07-13) — retroactive PRD for audit trail.

## Problem

Operations need to pause public access or AI generation during incidents or maintenance without redeploying. Enterprise customers need org-level suspension, audit logging, and role-based access without engineering intervention.

## User Stories

- As a **super-admin**, I can disable public app access and show a maintenance message so incidents are contained quickly.
- As a **super-admin**, I can pause AI generation independently so content APIs stop while the app stays readable.
- As a **super-admin**, I can suspend an organization with a reason so abusive or billing-delinquent accounts are blocked.
- As an **org owner**, I can assign roles (owner, site admin, editor, viewer) so my team has least privilege.
- As an **org owner**, I can configure IP allowlists and session policies (scaffold) from Settings → Security.

## Success Criteria

- Platform off → non–super-admin users see `/maintenance` with optional custom message within one request.
- AI off → generation endpoints return a clear user-facing error; reads still work.
- Org suspended → members receive 403 on authenticated APIs; super-admin bypass works.
- Sensitive admin actions write to `org_audit_log`.
- No internal ops terminology in user-facing UI.

## Scope In

- `platform_settings` singleton + super-admin UI
- Middleware gating + `assertAiGenerationEnabled()` in content engine
- Org suspend fields + admin UI + audit log
- RBAC migration and `hasOrgPermission()` centralization
- Public status endpoint (minimal payload)
- Org security settings API (IP allowlist, MFA flags scaffold)

## Scope Out

- Full TOTP enrollment and login-time MFA enforcement
- SSO/OIDC provider integration
- Redis-backed distributed rate limiting
- Per-region platform toggles

## Technical Approach

- Drizzle tables: `platform_settings`, `org_audit_log`; org columns `suspended_at`, `security_settings`
- `getPlatformSettings()` / `updatePlatformSettings()` in `lib/platform-settings.ts`
- `requireAuth()` enforces suspend + IP allowlist
- Middleware: super-admin `/admin` gate; platform status check via `/api/platform/status`
- AI guard: `lib/content-engine/src/support/platform-guard.ts`

## Edge Cases

- DB unreachable → middleware fails open (platform treated as enabled)
- Super-admin during maintenance → full access to `/admin` and app
- User with no org membership → IP allowlist skipped
- Legacy `member` role → migrated to `editor`

## Open Questions

- MFA enforcement timing: org-level `requireMfa` vs global policy
- Production super-admin assignment process
