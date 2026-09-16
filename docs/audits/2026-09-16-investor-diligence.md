# Investor diligence memo — 2026-09-16

Internal engineering audit. Not a certified pentest, SOC 2, or legal opinion. Counsel must review privacy/DPA before a data room send.

## Verdict

Real B2B SEO/CMS product. Encryption, SSRF guard, credit ledger, dual Drizzle schema, CMS connectors are craft, not generated slop. Seed-mature as an engine. Not Series-A mature as ops (founder Cloudflare, dual Next/worker APIs).

## Wave 1 closed in this session

- Authenticated GET by id now requires a bound `websiteProjectId` the caller can access (strategies, GEO audits, SEO articles, competitor/keyword analyses). Null/orphaned rows 404.
- GEO audit lists no longer mix in `websiteProjectId IS NULL` rows.
- Unscoped `GET/DELETE /api/conversations` returns 404 (product chat is SEO chat).
- Persona PATCH/DELETE scoped on the write as well as the check.
- Org `maxSessionAgeHours` enforced (JWT `iat`). IP allowlist uses real IPv4 CIDR.
- Gateway/worker responses get HSTS, XFO, nosniff, Referrer-Policy, Permissions-Policy via `withCors`.
- `scrapeCompetitorText` calls the SSRF guard inside the library.

## Residual (honest)

- Dual runtime remains: Next is local reference; production is Edge Mesh. Feature cost is still 2× until Next is archived.
- No GitHub Actions (policy). Quality is `pnpm run typecheck`, `test:unit`, `parity:gate`.
- DPA is a counsel draft (`docs/legal/dpa-template.md`), not a signed AVV.
- D1 is not EU-pinned in wrangler. Say that out loud.
- Observability is email + optional `PUBLISH_ALERT_WEBHOOK_URL` + `wrangler tail`, not Sentry.
- SSO is not implemented. MFA + invite-only are.

## Scorecard

| Area | Score |
|---|---|
| Craft / anti-slop | Pass |
| Authn | Pass (invite-only, MFA, rate limits) |
| Authz | Pass after Wave 1 (was Fail) |
| Compliance artifacts | Partial (pages + draft DPA; counsel) |
| Ops | Partial (paging webhook; still no APM) |
