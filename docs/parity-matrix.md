# API parity matrix (local Next.js vs Cloudflare edge)

Generated: 2026-07-15T15:20:06.179Z

| Metric | Count |
|---|---|
| Local route files | 205 |
| Worker path patterns | 209 |
| Routes missing in prod scan | 0 |

## Missing routes by phase

| Phase | Missing count |
|---|---|

## Behavioral diffs (intentional)

| Local | Prod |
|---|---|
| SSE streaming on generate/repurpose | 202 + poll GET /api/jobs/:id |
| Inline AI writes | Queued via CF Queues |
| NextAuth sessions | JWT httpOnly cookies |
| pg-boss jobs | CF Queues + KV job status |

## Full route inventory

| Method | Path | Local file | Prod status | Phase |
|---|---|---|---|---|
| GET | `/api/admin/content-strategies` | `artifacts/marketing-persona-app/src/app/api/admin/content-strategies/route.ts` | partial+ | 1-admin |
| GET | `/api/admin/content-strategies/:id` | `artifacts/marketing-persona-app/src/app/api/admin/content-strategies/[id]/route.ts` | partial+ | 1-admin |
| POST | `/api/admin/impersonate` | `artifacts/marketing-persona-app/src/app/api/admin/impersonate/route.ts` | partial+ | 1-admin |
| DELETE | `/api/admin/impersonate` | `artifacts/marketing-persona-app/src/app/api/admin/impersonate/route.ts` | partial+ | 1-admin |
| GET | `/api/admin/invites` | `artifacts/marketing-persona-app/src/app/api/admin/invites/route.ts` | partial+ | 1-admin |
| POST | `/api/admin/invites` | `artifacts/marketing-persona-app/src/app/api/admin/invites/route.ts` | partial+ | 1-admin |
| DELETE | `/api/admin/invites/:id` | `artifacts/marketing-persona-app/src/app/api/admin/invites/[id]/route.ts` | partial+ | 1-admin |
| GET | `/api/admin/organizations` | `artifacts/marketing-persona-app/src/app/api/admin/organizations/route.ts` | partial+ | 1-admin |
| POST | `/api/admin/organizations` | `artifacts/marketing-persona-app/src/app/api/admin/organizations/route.ts` | partial+ | 1-admin |
| GET | `/api/admin/organizations/:id` | `artifacts/marketing-persona-app/src/app/api/admin/organizations/[id]/route.ts` | partial+ | 1-admin |
| PATCH | `/api/admin/organizations/plan` | `artifacts/marketing-persona-app/src/app/api/admin/organizations/plan/route.ts` | partial+ | 1-admin |
| POST | `/api/admin/organizations/suspend` | `artifacts/marketing-persona-app/src/app/api/admin/organizations/suspend/route.ts` | partial+ | 1-admin |
| DELETE | `/api/admin/organizations/suspend` | `artifacts/marketing-persona-app/src/app/api/admin/organizations/suspend/route.ts` | partial+ | 1-admin |
| GET | `/api/admin/overview` | `artifacts/marketing-persona-app/src/app/api/admin/overview/route.ts` | partial+ | 1-admin |
| GET | `/api/admin/plan-quotas` | `artifacts/marketing-persona-app/src/app/api/admin/plan-quotas/route.ts` | partial+ | 1-admin |
| PATCH | `/api/admin/plan-quotas` | `artifacts/marketing-persona-app/src/app/api/admin/plan-quotas/route.ts` | partial+ | 1-admin |
| GET | `/api/admin/platform-integrations` | `artifacts/marketing-persona-app/src/app/api/admin/platform-integrations/route.ts` | partial+ | 1-admin |
| PATCH | `/api/admin/platform-integrations` | `artifacts/marketing-persona-app/src/app/api/admin/platform-integrations/route.ts` | partial+ | 1-admin |
| DELETE | `/api/admin/platform-integrations` | `artifacts/marketing-persona-app/src/app/api/admin/platform-integrations/route.ts` | partial+ | 1-admin |
| GET | `/api/admin/platform-settings` | `artifacts/marketing-persona-app/src/app/api/admin/platform-settings/route.ts` | partial+ | 1-admin |
| PATCH | `/api/admin/platform-settings` | `artifacts/marketing-persona-app/src/app/api/admin/platform-settings/route.ts` | partial+ | 1-admin |
| GET | `/api/admin/stats` | `artifacts/marketing-persona-app/src/app/api/admin/stats/route.ts` | partial+ | 1-admin |
| GET | `/api/admin/stripe-connect` | `artifacts/marketing-persona-app/src/app/api/admin/stripe-connect/route.ts` | partial+ | 1-admin |
| DELETE | `/api/admin/stripe-connect` | `artifacts/marketing-persona-app/src/app/api/admin/stripe-connect/route.ts` | partial+ | 1-admin |
| GET | `/api/admin/stripe-connect/callback` | `artifacts/marketing-persona-app/src/app/api/admin/stripe-connect/callback/route.ts` | partial+ | 1-admin |
| GET | `/api/admin/users` | `artifacts/marketing-persona-app/src/app/api/admin/users/route.ts` | partial+ | 1-admin |
| GET | `/api/ai-providers/settings` | `artifacts/marketing-persona-app/src/app/api/ai-providers/settings/route.ts` | partial+ | core |
| PATCH | `/api/ai-providers/settings` | `artifacts/marketing-persona-app/src/app/api/ai-providers/settings/route.ts` | partial+ | core |
| GET | `/api/ai-providers/status` | `artifacts/marketing-persona-app/src/app/api/ai-providers/status/route.ts` | partial+ | core |
| POST | `/api/analytics/vitals` | `artifacts/marketing-persona-app/src/app/api/analytics/vitals/route.ts` | partial+ | core |
| GET | `/api/auth/anthropic-credentials` | `artifacts/marketing-persona-app/src/app/api/auth/anthropic-credentials/route.ts` | partial+ | core |
| PATCH | `/api/auth/anthropic-credentials` | `artifacts/marketing-persona-app/src/app/api/auth/anthropic-credentials/route.ts` | partial+ | core |
| DELETE | `/api/auth/anthropic-credentials` | `artifacts/marketing-persona-app/src/app/api/auth/anthropic-credentials/route.ts` | partial+ | core |
| POST | `/api/auth/anthropic-credentials/test` | `artifacts/marketing-persona-app/src/app/api/auth/anthropic-credentials/test/route.ts` | partial+ | core |
| GET | `/api/auth/api-key` | `artifacts/marketing-persona-app/src/app/api/auth/api-key/route.ts` | partial+ | core |
| PATCH | `/api/auth/api-key` | `artifacts/marketing-persona-app/src/app/api/auth/api-key/route.ts` | partial+ | core |
| DELETE | `/api/auth/api-key` | `artifacts/marketing-persona-app/src/app/api/auth/api-key/route.ts` | partial+ | core |
| POST | `/api/auth/api-key/test` | `artifacts/marketing-persona-app/src/app/api/auth/api-key/test/route.ts` | partial+ | core |
| GET | `/api/auth/bedrock-credentials` | `artifacts/marketing-persona-app/src/app/api/auth/bedrock-credentials/route.ts` | partial+ | core |
| PATCH | `/api/auth/bedrock-credentials` | `artifacts/marketing-persona-app/src/app/api/auth/bedrock-credentials/route.ts` | partial+ | core |
| DELETE | `/api/auth/bedrock-credentials` | `artifacts/marketing-persona-app/src/app/api/auth/bedrock-credentials/route.ts` | partial+ | core |
| POST | `/api/auth/bedrock-credentials/test` | `artifacts/marketing-persona-app/src/app/api/auth/bedrock-credentials/test/route.ts` | partial+ | core |
| GET | `/api/auth/bing-webmaster` | `artifacts/marketing-persona-app/src/app/api/auth/bing-webmaster/route.ts` | partial+ | core |
| GET | `/api/auth/bing-webmaster/callback` | `artifacts/marketing-persona-app/src/app/api/auth/bing-webmaster/callback/route.ts` | partial+ | core |
| GET | `/api/auth/bluesky` | `artifacts/marketing-persona-app/src/app/api/auth/bluesky/route.ts` | partial+ | core |
| GET | `/api/auth/bluesky/callback` | `artifacts/marketing-persona-app/src/app/api/auth/bluesky/callback/route.ts` | partial+ | core |
| POST | `/api/auth/change-password` | `artifacts/marketing-persona-app/src/app/api/auth/change-password/route.ts` | partial+ | core |
| GET | `/api/auth/deepl-credentials` | `artifacts/marketing-persona-app/src/app/api/auth/deepl-credentials/route.ts` | partial+ | core |
| PATCH | `/api/auth/deepl-credentials` | `artifacts/marketing-persona-app/src/app/api/auth/deepl-credentials/route.ts` | partial+ | core |
| DELETE | `/api/auth/deepl-credentials` | `artifacts/marketing-persona-app/src/app/api/auth/deepl-credentials/route.ts` | partial+ | core |
| POST | `/api/auth/deepl-credentials/test` | `artifacts/marketing-persona-app/src/app/api/auth/deepl-credentials/test/route.ts` | partial+ | core |
| POST | `/api/auth/forgot-password` | `artifacts/marketing-persona-app/src/app/api/auth/forgot-password/route.ts` | partial+ | core |
| GET | `/api/auth/gemini-key` | `artifacts/marketing-persona-app/src/app/api/auth/gemini-key/route.ts` | partial+ | core |
| POST | `/api/auth/gemini-key` | `artifacts/marketing-persona-app/src/app/api/auth/gemini-key/route.ts` | partial+ | core |
| DELETE | `/api/auth/gemini-key` | `artifacts/marketing-persona-app/src/app/api/auth/gemini-key/route.ts` | partial+ | core |
| GET | `/api/auth/google-analytics` | `artifacts/marketing-persona-app/src/app/api/auth/google-analytics/route.ts` | partial+ | core |
| GET | `/api/auth/google-analytics/callback` | `artifacts/marketing-persona-app/src/app/api/auth/google-analytics/callback/route.ts` | partial+ | core |
| GET | `/api/auth/google-search-console` | `artifacts/marketing-persona-app/src/app/api/auth/google-search-console/route.ts` | partial+ | core |
| GET | `/api/auth/google-search-console/callback` | `artifacts/marketing-persona-app/src/app/api/auth/google-search-console/callback/route.ts` | partial+ | core |
| GET | `/api/auth/google-sheets` | `artifacts/marketing-persona-app/src/app/api/auth/google-sheets/route.ts` | partial+ | core |
| GET | `/api/auth/google-sheets/callback` | `artifacts/marketing-persona-app/src/app/api/auth/google-sheets/callback/route.ts` | partial+ | core |
| GET | `/api/auth/linkedin` | `artifacts/marketing-persona-app/src/app/api/auth/linkedin/route.ts` | partial+ | core |
| GET | `/api/auth/linkedin/callback` | `artifacts/marketing-persona-app/src/app/api/auth/linkedin/callback/route.ts` | partial+ | core |
| GET | `/api/auth/mastodon` | `artifacts/marketing-persona-app/src/app/api/auth/mastodon/route.ts` | partial+ | core |
| GET | `/api/auth/mastodon/callback` | `artifacts/marketing-persona-app/src/app/api/auth/mastodon/callback/route.ts` | partial+ | core |
| GET | `/api/auth/me` | `artifacts/marketing-persona-app/src/app/api/auth/me/route.ts` | partial+ | core |
| PATCH | `/api/auth/me` | `artifacts/marketing-persona-app/src/app/api/auth/me/route.ts` | partial+ | core |
| DELETE | `/api/auth/me/delete` | `artifacts/marketing-persona-app/src/app/api/auth/me/delete/route.ts` | partial+ | core |
| GET | `/api/auth/meta` | `artifacts/marketing-persona-app/src/app/api/auth/meta/route.ts` | partial+ | core |
| GET | `/api/auth/meta/callback` | `artifacts/marketing-persona-app/src/app/api/auth/meta/callback/route.ts` | partial+ | core |
| GET | `/api/auth/meta/pages` | `artifacts/marketing-persona-app/src/app/api/auth/meta/pages/route.ts` | partial+ | core |
| POST | `/api/auth/meta/select-page` | `artifacts/marketing-persona-app/src/app/api/auth/meta/select-page/route.ts` | partial+ | core |
| POST | `/api/auth/mfa/confirm` | `artifacts/marketing-persona-app/src/app/api/auth/mfa/confirm/route.ts` | partial+ | 5-billing |
| GET | `/api/auth/mfa/setup` | `artifacts/marketing-persona-app/src/app/api/auth/mfa/setup/route.ts` | partial+ | 5-billing |
| POST | `/api/auth/mfa/setup` | `artifacts/marketing-persona-app/src/app/api/auth/mfa/setup/route.ts` | partial+ | 5-billing |
| POST | `/api/auth/mfa/verify` | `artifacts/marketing-persona-app/src/app/api/auth/mfa/verify/route.ts` | partial+ | 5-billing |
| GET | `/api/auth/openai-credentials` | `artifacts/marketing-persona-app/src/app/api/auth/openai-credentials/route.ts` | partial+ | core |
| PATCH | `/api/auth/openai-credentials` | `artifacts/marketing-persona-app/src/app/api/auth/openai-credentials/route.ts` | partial+ | core |
| DELETE | `/api/auth/openai-credentials` | `artifacts/marketing-persona-app/src/app/api/auth/openai-credentials/route.ts` | partial+ | core |
| POST | `/api/auth/openai-credentials/test` | `artifacts/marketing-persona-app/src/app/api/auth/openai-credentials/test/route.ts` | partial+ | core |
| POST | `/api/auth/reset-password` | `artifacts/marketing-persona-app/src/app/api/auth/reset-password/route.ts` | partial+ | core |
| GET | `/api/auth/semrush-credentials` | `artifacts/marketing-persona-app/src/app/api/auth/semrush-credentials/route.ts` | partial+ | 3-analytics |
| PATCH | `/api/auth/semrush-credentials` | `artifacts/marketing-persona-app/src/app/api/auth/semrush-credentials/route.ts` | partial+ | 3-analytics |
| DELETE | `/api/auth/semrush-credentials` | `artifacts/marketing-persona-app/src/app/api/auth/semrush-credentials/route.ts` | partial+ | 3-analytics |
| POST | `/api/auth/semrush-credentials/test` | `artifacts/marketing-persona-app/src/app/api/auth/semrush-credentials/test/route.ts` | partial+ | 3-analytics |
| POST | `/api/auth/signup` | `artifacts/marketing-persona-app/src/app/api/auth/signup/route.ts` | partial+ | core |
| GET | `/api/auth/stock-credentials` | `artifacts/marketing-persona-app/src/app/api/auth/stock-credentials/route.ts` | partial+ | core |
| PATCH | `/api/auth/stock-credentials` | `artifacts/marketing-persona-app/src/app/api/auth/stock-credentials/route.ts` | partial+ | core |
| DELETE | `/api/auth/stock-credentials` | `artifacts/marketing-persona-app/src/app/api/auth/stock-credentials/route.ts` | partial+ | core |
| POST | `/api/auth/stock-credentials/test` | `artifacts/marketing-persona-app/src/app/api/auth/stock-credentials/test/route.ts` | partial+ | core |
| GET | `/api/auth/twitter` | `artifacts/marketing-persona-app/src/app/api/auth/twitter/route.ts` | partial+ | core |
| GET | `/api/auth/twitter/callback` | `artifacts/marketing-persona-app/src/app/api/auth/twitter/callback/route.ts` | partial+ | core |
| POST | `/api/billing/checkout` | `artifacts/marketing-persona-app/src/app/api/billing/checkout/route.ts` | partial+ | core |
| GET | `/api/billing/credits` | `artifacts/marketing-persona-app/src/app/api/billing/credits/route.ts` | partial+ | 5-billing |
| GET | `/api/billing/credits/top-up` | `artifacts/marketing-persona-app/src/app/api/billing/credits/top-up/route.ts` | partial+ | 5-billing |
| POST | `/api/billing/credits/top-up` | `artifacts/marketing-persona-app/src/app/api/billing/credits/top-up/route.ts` | partial+ | 5-billing |
| POST | `/api/billing/portal` | `artifacts/marketing-persona-app/src/app/api/billing/portal/route.ts` | partial+ | core |
| GET | `/api/billing/status` | `artifacts/marketing-persona-app/src/app/api/billing/status/route.ts` | partial+ | core |
| GET | `/api/briefs` | `artifacts/marketing-persona-app/src/app/api/briefs/route.ts` | partial+ | 2-studio |
| POST | `/api/briefs` | `artifacts/marketing-persona-app/src/app/api/briefs/route.ts` | partial+ | 2-studio |
| GET | `/api/briefs/:id` | `artifacts/marketing-persona-app/src/app/api/briefs/[id]/route.ts` | partial+ | 2-studio |
| PATCH | `/api/briefs/:id` | `artifacts/marketing-persona-app/src/app/api/briefs/[id]/route.ts` | partial+ | 2-studio |
| DELETE | `/api/briefs/:id` | `artifacts/marketing-persona-app/src/app/api/briefs/[id]/route.ts` | partial+ | 2-studio |
| POST | `/api/chat` | `artifacts/marketing-persona-app/src/app/api/chat/route.ts` | partial+ | core |
| GET | `/api/companies` | `artifacts/marketing-persona-app/src/app/api/companies/route.ts` | partial+ | core |
| POST | `/api/companies` | `artifacts/marketing-persona-app/src/app/api/companies/route.ts` | partial+ | core |
| PATCH | `/api/companies` | `artifacts/marketing-persona-app/src/app/api/companies/route.ts` | partial+ | core |
| POST | `/api/companies/humanization` | `artifacts/marketing-persona-app/src/app/api/companies/humanization/route.ts` | partial+ | core |
| GET | `/api/competitor-analyses/:id` | `artifacts/marketing-persona-app/src/app/api/competitor-analyses/[id]/route.ts` | partial+ | core |
| POST | `/api/competitor-analysis` | `artifacts/marketing-persona-app/src/app/api/competitor-analysis/route.ts` | partial+ | core |
| POST | `/api/contact` | `artifacts/marketing-persona-app/src/app/api/contact/route.ts` | partial+ | core |
| PATCH | `/api/content-items/:id` | `artifacts/marketing-persona-app/src/app/api/content-items/[id]/route.ts` | partial+ | core |
| GET | `/api/content-pieces` | `artifacts/marketing-persona-app/src/app/api/content-pieces/route.ts` | partial+ | 2-studio |
| GET | `/api/content-pieces/:id` | `artifacts/marketing-persona-app/src/app/api/content-pieces/[id]/route.ts` | partial+ | 2-studio |
| PATCH | `/api/content-pieces/:id` | `artifacts/marketing-persona-app/src/app/api/content-pieces/[id]/route.ts` | partial+ | 2-studio |
| DELETE | `/api/content-pieces/:id` | `artifacts/marketing-persona-app/src/app/api/content-pieces/[id]/route.ts` | partial+ | 2-studio |
| POST | `/api/content-pieces/:id/approve` | `artifacts/marketing-persona-app/src/app/api/content-pieces/[id]/approve/route.ts` | partial+ | 2-studio |
| POST | `/api/content-pieces/:id/enhance` | `artifacts/marketing-persona-app/src/app/api/content-pieces/[id]/enhance/route.ts` | partial+ | 2-studio |
| POST | `/api/content-pieces/:id/humanize` | `artifacts/marketing-persona-app/src/app/api/content-pieces/[id]/humanize/route.ts` | partial+ | 2-studio |
| POST | `/api/content-pieces/:id/images/regenerate` | `artifacts/marketing-persona-app/src/app/api/content-pieces/[id]/images/regenerate/route.ts` | partial+ | 2-studio |
| POST | `/api/content-pieces/:id/publish` | `artifacts/marketing-persona-app/src/app/api/content-pieces/[id]/publish/route.ts` | partial+ | 2-studio |
| POST | `/api/content-pieces/:id/publish/:destinationId` | `artifacts/marketing-persona-app/src/app/api/content-pieces/[id]/publish/[destinationId]/route.ts` | partial+ | 2-studio |
| POST | `/api/content-pieces/:id/regenerate` | `artifacts/marketing-persona-app/src/app/api/content-pieces/[id]/regenerate/route.ts` | partial+ | 2-studio |
| POST | `/api/content-pieces/:id/reject` | `artifacts/marketing-persona-app/src/app/api/content-pieces/[id]/reject/route.ts` | partial+ | 2-studio |
| POST | `/api/content-pieces/:id/render-preview` | `artifacts/marketing-persona-app/src/app/api/content-pieces/[id]/render-preview/route.ts` | partial+ | 2-studio |
| POST | `/api/content-pieces/:id/repurpose` | `artifacts/marketing-persona-app/src/app/api/content-pieces/[id]/repurpose/route.ts` | partial+ | 2-studio |
| POST | `/api/content-pieces/:id/repurpose/stream` | `artifacts/marketing-persona-app/src/app/api/content-pieces/[id]/repurpose/stream/route.ts` | partial+ | 2-studio |
| POST | `/api/content-pieces/:id/submit-review` | `artifacts/marketing-persona-app/src/app/api/content-pieces/[id]/submit-review/route.ts` | partial+ | 2-studio |
| POST | `/api/content-pieces/generate` | `artifacts/marketing-persona-app/src/app/api/content-pieces/generate/route.ts` | partial+ | 2-studio |
| GET | `/api/content-strategies` | `artifacts/marketing-persona-app/src/app/api/content-strategies/route.ts` | partial+ | 2-studio |
| GET | `/api/content-strategies/:id` | `artifacts/marketing-persona-app/src/app/api/content-strategies/[id]/route.ts` | partial+ | 2-studio |
| PATCH | `/api/content-strategies/:id/items/:itemId` | `artifacts/marketing-persona-app/src/app/api/content-strategies/[id]/items/[itemId]/route.ts` | partial+ | 2-studio |
| POST | `/api/content-strategies/:id/items/:itemId/generate` | `artifacts/marketing-persona-app/src/app/api/content-strategies/[id]/items/[itemId]/generate/route.ts` | partial+ | 2-studio |
| POST | `/api/content-strategies/:id/items/:itemId/schedule` | `artifacts/marketing-persona-app/src/app/api/content-strategies/[id]/items/[itemId]/schedule/route.ts` | partial+ | 2-studio |
| POST | `/api/content-strategies/generate` | `artifacts/marketing-persona-app/src/app/api/content-strategies/generate/route.ts` | partial+ | 2-studio |
| POST | `/api/content-strategies/generate/stream` | `artifacts/marketing-persona-app/src/app/api/content-strategies/generate/stream/route.ts` | partial+ | 2-studio |
| GET | `/api/conversations` | `artifacts/marketing-persona-app/src/app/api/conversations/route.ts` | partial+ | core |
| DELETE | `/api/conversations` | `artifacts/marketing-persona-app/src/app/api/conversations/route.ts` | partial+ | core |
| GET | `/api/cron/generate-articles` | `artifacts/marketing-persona-app/src/app/api/cron/generate-articles/route.ts` | partial+ | core |
| GET | `/api/geo-audits/:id` | `artifacts/marketing-persona-app/src/app/api/geo-audits/[id]/route.ts` | partial+ | core |
| POST | `/api/geo-audits/generate` | `artifacts/marketing-persona-app/src/app/api/geo-audits/generate/route.ts` | partial+ | core |
| GET | `/api/goals` | `artifacts/marketing-persona-app/src/app/api/goals/route.ts` | partial+ | 2-studio |
| POST | `/api/goals` | `artifacts/marketing-persona-app/src/app/api/goals/route.ts` | partial+ | 2-studio |
| GET | `/api/goals/:id` | `artifacts/marketing-persona-app/src/app/api/goals/[id]/route.ts` | partial+ | 2-studio |
| PATCH | `/api/goals/:id` | `artifacts/marketing-persona-app/src/app/api/goals/[id]/route.ts` | partial+ | 2-studio |
| DELETE | `/api/goals/:id` | `artifacts/marketing-persona-app/src/app/api/goals/[id]/route.ts` | partial+ | 2-studio |
| POST | `/api/goals/:id/compile-briefs` | `artifacts/marketing-persona-app/src/app/api/goals/[id]/compile-briefs/route.ts` | partial+ | 2-studio |
| GET | `/api/industries` | `artifacts/marketing-persona-app/src/app/api/industries/route.ts` | partial+ | core |
| GET | `/api/internal-links` | `artifacts/marketing-persona-app/src/app/api/internal-links/route.ts` | partial+ | core |
| GET | `/api/invites/:token` | `artifacts/marketing-persona-app/src/app/api/invites/[token]/route.ts` | partial+ | core |
| POST | `/api/invites/:token` | `artifacts/marketing-persona-app/src/app/api/invites/[token]/route.ts` | partial+ | core |
| GET | `/api/keyword-analyses/:id` | `artifacts/marketing-persona-app/src/app/api/keyword-analyses/[id]/route.ts` | partial+ | core |
| POST | `/api/keyword-analysis` | `artifacts/marketing-persona-app/src/app/api/keyword-analysis/route.ts` | partial+ | core |
| POST | `/api/keyword-opportunities/:id` | `artifacts/marketing-persona-app/src/app/api/keyword-opportunities/[id]/route.ts` | partial+ | core |
| PATCH | `/api/keyword-opportunities/:id` | `artifacts/marketing-persona-app/src/app/api/keyword-opportunities/[id]/route.ts` | partial+ | core |
| PATCH | `/api/keyword-rank-alerts/:id` | `artifacts/marketing-persona-app/src/app/api/keyword-rank-alerts/[id]/route.ts` | partial+ | core |
| GET | `/api/locations` | `artifacts/marketing-persona-app/src/app/api/locations/route.ts` | partial+ | core |
| GET | `/api/onboarding/fast-lane` | `artifacts/marketing-persona-app/src/app/api/onboarding/fast-lane/route.ts` | partial+ | core |
| POST | `/api/onboarding/fast-lane` | `artifacts/marketing-persona-app/src/app/api/onboarding/fast-lane/route.ts` | partial+ | core |
| GET | `/api/org/api-keys` | `artifacts/marketing-persona-app/src/app/api/org/api-keys/route.ts` | partial+ | core |
| POST | `/api/org/api-keys` | `artifacts/marketing-persona-app/src/app/api/org/api-keys/route.ts` | partial+ | core |
| DELETE | `/api/org/api-keys/:id` | `artifacts/marketing-persona-app/src/app/api/org/api-keys/[id]/route.ts` | partial+ | core |
| GET | `/api/organizations/members` | `artifacts/marketing-persona-app/src/app/api/organizations/members/route.ts` | partial+ | core |
| POST | `/api/organizations/members` | `artifacts/marketing-persona-app/src/app/api/organizations/members/route.ts` | partial+ | core |
| PATCH | `/api/organizations/members/:userId` | `artifacts/marketing-persona-app/src/app/api/organizations/members/[userId]/route.ts` | partial+ | core |
| DELETE | `/api/organizations/members/:userId` | `artifacts/marketing-persona-app/src/app/api/organizations/members/[userId]/route.ts` | partial+ | core |
| GET | `/api/organizations/security` | `artifacts/marketing-persona-app/src/app/api/organizations/security/route.ts` | partial+ | 5-billing |
| PATCH | `/api/organizations/security` | `artifacts/marketing-persona-app/src/app/api/organizations/security/route.ts` | partial+ | 5-billing |
| GET | `/api/personas` | `artifacts/marketing-persona-app/src/app/api/personas/route.ts` | partial+ | core |
| PATCH | `/api/personas/:id` | `artifacts/marketing-persona-app/src/app/api/personas/[id]/route.ts` | partial+ | core |
| DELETE | `/api/personas/:id` | `artifacts/marketing-persona-app/src/app/api/personas/[id]/route.ts` | partial+ | core |
| POST | `/api/personas/generate` | `artifacts/marketing-persona-app/src/app/api/personas/generate/route.ts` | partial+ | core |
| GET | `/api/platform/status` | `artifacts/marketing-persona-app/src/app/api/platform/status/route.ts` | partial+ | core |
| GET | `/api/platform/stock-images/status` | `artifacts/marketing-persona-app/src/app/api/platform/stock-images/status/route.ts` | partial+ | core |
| POST | `/api/public/geo-audits/generate` | `artifacts/marketing-persona-app/src/app/api/public/geo-audits/generate/route.ts` | partial+ | core |
| POST | `/api/reddit-discovery` | `artifacts/marketing-persona-app/src/app/api/reddit-discovery/route.ts` | partial+ | core |
| GET | `/api/roadmaps` | `artifacts/marketing-persona-app/src/app/api/roadmaps/route.ts` | partial+ | 2-studio |
| GET | `/api/roadmaps/:slug` | `artifacts/marketing-persona-app/src/app/api/roadmaps/[slug]/route.ts` | partial+ | 2-studio |
| POST | `/api/roadmaps/:slug` | `artifacts/marketing-persona-app/src/app/api/roadmaps/[slug]/route.ts` | partial+ | 2-studio |
| POST | `/api/roadmaps/:slug/lead-capture` | `artifacts/marketing-persona-app/src/app/api/roadmaps/[slug]/lead-capture/route.ts` | partial+ | 2-studio |
| POST | `/api/roadmaps/generate` | `artifacts/marketing-persona-app/src/app/api/roadmaps/generate/route.ts` | partial+ | 2-studio |
| POST | `/api/roadmaps/generate/stream` | `artifacts/marketing-persona-app/src/app/api/roadmaps/generate/stream/route.ts` | partial+ | 2-studio |
| GET | `/api/seo-articles/:id` | `artifacts/marketing-persona-app/src/app/api/seo-articles/[id]/route.ts` | partial+ | core |
| PATCH | `/api/seo-articles/:id` | `artifacts/marketing-persona-app/src/app/api/seo-articles/[id]/route.ts` | partial+ | core |
| POST | `/api/seo-articles/generate` | `artifacts/marketing-persona-app/src/app/api/seo-articles/generate/route.ts` | partial+ | core |
| POST | `/api/tools/llms-txt` | `artifacts/marketing-persona-app/src/app/api/tools/llms-txt/route.ts` | partial+ | core |
| POST | `/api/tools/meta-checker` | `artifacts/marketing-persona-app/src/app/api/tools/meta-checker/route.ts` | partial+ | core |
| POST | `/api/tools/robots` | `artifacts/marketing-persona-app/src/app/api/tools/robots/route.ts` | partial+ | core |
| POST | `/api/tools/sitemap` | `artifacts/marketing-persona-app/src/app/api/tools/sitemap/route.ts` | partial+ | core |
| POST | `/api/topical-map` | `artifacts/marketing-persona-app/src/app/api/topical-map/route.ts` | partial+ | core |
| GET | `/api/tracked-keywords` | `artifacts/marketing-persona-app/src/app/api/tracked-keywords/route.ts` | partial+ | core |
| POST | `/api/tracked-keywords` | `artifacts/marketing-persona-app/src/app/api/tracked-keywords/route.ts` | partial+ | core |
| DELETE | `/api/tracked-keywords` | `artifacts/marketing-persona-app/src/app/api/tracked-keywords/route.ts` | partial+ | core |
| DELETE | `/api/tracked-keywords/:id` | `artifacts/marketing-persona-app/src/app/api/tracked-keywords/[id]/route.ts` | partial+ | core |
| GET | `/api/tracked-keywords/:id/snapshots` | `artifacts/marketing-persona-app/src/app/api/tracked-keywords/[id]/snapshots/route.ts` | partial+ | core |
| GET | `/api/usage` | `artifacts/marketing-persona-app/src/app/api/usage/route.ts` | partial+ | core |
| GET | `/api/user/cms-summary` | `artifacts/marketing-persona-app/src/app/api/user/cms-summary/route.ts` | partial+ | core |
| GET | `/api/v1/connections` | `artifacts/marketing-persona-app/src/app/api/v1/connections/route.ts` | partial+ | core |
| POST | `/api/v1/content-pieces` | `artifacts/marketing-persona-app/src/app/api/v1/content-pieces/route.ts` | partial+ | core |
| POST | `/api/v1/content-pieces/:id/publish` | `artifacts/marketing-persona-app/src/app/api/v1/content-pieces/[id]/publish/route.ts` | partial+ | core |
| POST | `/api/v1/content/render` | `artifacts/marketing-persona-app/src/app/api/v1/content/render/route.ts` | partial+ | core |
| POST | `/api/waitlist` | `artifacts/marketing-persona-app/src/app/api/waitlist/route.ts` | partial+ | core |
| POST | `/api/webhooks/stripe` | `artifacts/marketing-persona-app/src/app/api/webhooks/stripe/route.ts` | partial+ | 5-billing |
| GET | `/api/website-projects` | `artifacts/marketing-persona-app/src/app/api/website-projects/route.ts` | partial+ | core |
| POST | `/api/website-projects` | `artifacts/marketing-persona-app/src/app/api/website-projects/route.ts` | partial+ | core |
| GET | `/api/website-projects/:id` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/route.ts` | partial+ | core |
| PATCH | `/api/website-projects/:id` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/route.ts` | partial+ | core |
| DELETE | `/api/website-projects/:id` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/route.ts` | partial+ | core |
| GET | `/api/website-projects/:id/analytics-properties` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/analytics-properties/route.ts` | partial+ | 3-analytics |
| PATCH | `/api/website-projects/:id/analytics-properties` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/analytics-properties/route.ts` | partial+ | 3-analytics |
| DELETE | `/api/website-projects/:id/analytics-properties` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/analytics-properties/route.ts` | partial+ | 3-analytics |
| POST | `/api/website-projects/:id/analytics-properties/available` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/analytics-properties/available/route.ts` | partial+ | 3-analytics |
| GET | `/api/website-projects/:id/analytics-properties/ga4/sync` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/analytics-properties/ga4/sync/route.ts` | partial+ | 3-analytics |
| POST | `/api/website-projects/:id/analytics-properties/ga4/sync` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/analytics-properties/ga4/sync/route.ts` | partial+ | 3-analytics |
| GET | `/api/website-projects/:id/article-idea-sources` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/article-idea-sources/route.ts` | partial+ | core |
| POST | `/api/website-projects/:id/article-idea-sources` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/article-idea-sources/route.ts` | partial+ | core |
| DELETE | `/api/website-projects/:id/article-idea-sources` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/article-idea-sources/route.ts` | partial+ | core |
| POST | `/api/website-projects/:id/article-idea-sources/sync` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/article-idea-sources/sync/route.ts` | partial+ | core |
| GET | `/api/website-projects/:id/article-ideas` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/article-ideas/route.ts` | partial+ | core |
| POST | `/api/website-projects/:id/article-ideas` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/article-ideas/route.ts` | partial+ | core |
| POST | `/api/website-projects/:id/article-ideas/import` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/article-ideas/import/route.ts` | partial+ | core |
| GET | `/api/website-projects/:id/article-performance` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/article-performance/route.ts` | partial+ | 3-analytics |
| GET | `/api/website-projects/:id/autopilot-settings` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/autopilot-settings/route.ts` | partial+ | core |
| PATCH | `/api/website-projects/:id/autopilot-settings` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/autopilot-settings/route.ts` | partial+ | core |
| GET | `/api/website-projects/:id/brand-profile` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/brand-profile/route.ts` | partial+ | core |
| GET | `/api/website-projects/:id/brand-profile/platform-voice` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/brand-profile/platform-voice/route.ts` | partial+ | core |
| GET | `/api/website-projects/:id/brand-profile/platform-voice/:platform` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/brand-profile/platform-voice/[platform]/route.ts` | partial+ | core |
| PUT | `/api/website-projects/:id/brand-profile/platform-voice/:platform` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/brand-profile/platform-voice/[platform]/route.ts` | partial+ | core |
| POST | `/api/website-projects/:id/brand-profile/platform-voice/:platform/analyze` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/brand-profile/platform-voice/[platform]/analyze/route.ts` | partial+ | core |
| POST | `/api/website-projects/:id/brand-profile/platform-voice/:platform/import` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/brand-profile/platform-voice/[platform]/import/route.ts` | partial+ | core |
| GET | `/api/website-projects/:id/brand-profile/voice` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/brand-profile/voice/route.ts` | partial+ | core |
| PUT | `/api/website-projects/:id/brand-profile/voice` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/brand-profile/voice/route.ts` | partial+ | core |
| POST | `/api/website-projects/:id/brand-profile/voice/analyze` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/brand-profile/voice/analyze/route.ts` | partial+ | core |
| POST | `/api/website-projects/:id/brand-voice/ingest` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/brand-voice/ingest/route.ts` | partial+ | core |
| GET | `/api/website-projects/:id/brand-voice/skill` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/brand-voice/skill/route.ts` | partial+ | core |
| POST | `/api/website-projects/:id/brand-voice/skill` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/brand-voice/skill/route.ts` | partial+ | core |
| PUT | `/api/website-projects/:id/brand-voice/skill` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/brand-voice/skill/route.ts` | partial+ | core |
| GET | `/api/website-projects/:id/brand-voice/sources` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/brand-voice/sources/route.ts` | partial+ | core |
| GET | `/api/website-projects/:id/cms-integrations` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/cms-integrations/route.ts` | partial+ | core |
| PATCH | `/api/website-projects/:id/cms-integrations` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/cms-integrations/route.ts` | partial+ | core |
| DELETE | `/api/website-projects/:id/cms-integrations/:platform` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/cms-integrations/[platform]/route.ts` | partial+ | core |
| PATCH | `/api/website-projects/:id/cms-integrations/:platform/output-mode` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/cms-integrations/[platform]/output-mode/route.ts` | partial+ | core |
| POST | `/api/website-projects/:id/cms-integrations/test` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/cms-integrations/test/route.ts` | partial+ | core |
| GET | `/api/website-projects/:id/competitors` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/competitors/route.ts` | partial+ | core |
| GET | `/api/website-projects/:id/content` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/content/route.ts` | partial+ | 2-studio |
| GET | `/api/website-projects/:id/content-pieces` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/content-pieces/route.ts` | partial+ | core |
| POST | `/api/website-projects/:id/content-pieces` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/content-pieces/route.ts` | partial+ | core |
| POST | `/api/website-projects/:id/content-pieces/generate/stream` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/content-pieces/generate/stream/route.ts` | partial+ | core |
| POST | `/api/website-projects/:id/content-pieces/repurpose` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/content-pieces/repurpose/route.ts` | partial+ | core |
| POST | `/api/website-projects/:id/crawl` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/crawl/route.ts` | partial+ | core |
| GET | `/api/website-projects/:id/deepl-credentials` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/deepl-credentials/route.ts` | partial+ | core |
| PATCH | `/api/website-projects/:id/deepl-credentials` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/deepl-credentials/route.ts` | partial+ | core |
| DELETE | `/api/website-projects/:id/deepl-credentials` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/deepl-credentials/route.ts` | partial+ | core |
| GET | `/api/website-projects/:id/gsc-queries` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/gsc-queries/route.ts` | partial+ | 3-analytics |
| GET | `/api/website-projects/:id/keyword-alerts` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/keyword-alerts/route.ts` | partial+ | core |
| GET | `/api/website-projects/:id/keyword-opportunities` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/keyword-opportunities/route.ts` | partial+ | core |
| POST | `/api/website-projects/:id/keyword-opportunities` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/keyword-opportunities/route.ts` | partial+ | core |
| GET | `/api/website-projects/:id/publishing-settings` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/publishing-settings/route.ts` | partial+ | core |
| PATCH | `/api/website-projects/:id/publishing-settings` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/publishing-settings/route.ts` | partial+ | core |
| POST | `/api/website-projects/:id/roadmaps/:roadmapId` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/roadmaps/[roadmapId]/route.ts` | partial+ | core |
| DELETE | `/api/website-projects/:id/roadmaps/:roadmapId` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/roadmaps/[roadmapId]/route.ts` | partial+ | core |
| POST | `/api/website-projects/:id/scrape` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/scrape/route.ts` | partial+ | core |
| GET | `/api/website-projects/:id/search-properties` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/search-properties/route.ts` | partial+ | core |
| PATCH | `/api/website-projects/:id/search-properties` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/search-properties/route.ts` | partial+ | core |
| DELETE | `/api/website-projects/:id/search-properties` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/search-properties/route.ts` | partial+ | core |
| POST | `/api/website-projects/:id/search-properties/available` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/search-properties/available/route.ts` | partial+ | core |
| GET | `/api/website-projects/:id/search-properties/gsc/sync` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/search-properties/gsc/sync/route.ts` | partial+ | core |
| POST | `/api/website-projects/:id/search-properties/gsc/sync` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/search-properties/gsc/sync/route.ts` | partial+ | core |
| GET | `/api/website-projects/:id/semrush/status` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/semrush/status/route.ts` | partial+ | 3-analytics |
| POST | `/api/website-projects/:id/social/composer` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/social/composer/route.ts` | partial+ | 4-social |
| GET | `/api/website-projects/:id/social/history-sync` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/social/history-sync/route.ts` | partial+ | 4-social |
| POST | `/api/website-projects/:id/social/history-sync` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/social/history-sync/route.ts` | partial+ | 4-social |
| GET | `/api/website-projects/:id/social/metrics` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/social/metrics/route.ts` | partial+ | 4-social |
| GET | `/api/website-projects/:id/social/metrics/sync` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/social/metrics/sync/route.ts` | partial+ | 4-social |
| POST | `/api/website-projects/:id/social/metrics/sync` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/social/metrics/sync/route.ts` | partial+ | 4-social |
| GET | `/api/website-projects/:id/social/queue` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/social/queue/route.ts` | partial+ | 4-social |
| PATCH | `/api/website-projects/:id/social/queue/:pieceId` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/social/queue/[pieceId]/route.ts` | partial+ | 4-social |
| DELETE | `/api/website-projects/:id/social/queue/:pieceId` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/social/queue/[pieceId]/route.ts` | partial+ | 4-social |
| GET | `/api/website-projects/:id/social/schedule-settings` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/social/schedule-settings/route.ts` | partial+ | 4-social |
| PATCH | `/api/website-projects/:id/social/schedule-settings` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/social/schedule-settings/route.ts` | partial+ | 4-social |
| GET | `/api/website-projects/:id/stock-credentials` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/stock-credentials/route.ts` | partial+ | core |
| PATCH | `/api/website-projects/:id/stock-credentials` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/stock-credentials/route.ts` | partial+ | core |
| DELETE | `/api/website-projects/:id/stock-credentials` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/stock-credentials/route.ts` | partial+ | core |
| GET | `/api/website-projects/:id/visibility` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/visibility/route.ts` | partial+ | core |
| POST | `/api/website-projects/:id/visibility` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/visibility/route.ts` | partial+ | core |
| GET | `/api/website-projects/:id/visibility-settings` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/visibility-settings/route.ts` | partial+ | core |
| PATCH | `/api/website-projects/:id/visibility-settings` | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/visibility-settings/route.ts` | partial+ | core |
| POST | `/api/wordpress/test` | `artifacts/marketing-persona-app/src/app/api/wordpress/test/route.ts` | partial+ | core |

## Worker patterns detected

- `*/deepl-credentials`
- `*/generate`
- `*/publish`
- `*/scrape`
- `*/sync`
- `/api/admin/*`
- `/api/admin/content-strategies`
- `/api/admin/content-strategies/:id`
- `/api/admin/impersonate`
- `/api/admin/invites`
- `/api/admin/invites/:id`
- `/api/admin/organizations`
- `/api/admin/organizations/:id`
- `/api/admin/organizations/plan`
- `/api/admin/organizations/suspend`
- `/api/admin/overview`
- `/api/admin/plan-quotas`
- `/api/admin/platform-integrations`
- `/api/admin/platform-settings`
- `/api/admin/stats`
- `/api/admin/stripe-connect`
- `/api/admin/stripe-connect/callback`
- `/api/admin/users`
- `/api/ai-providers/settings`
- `/api/ai-providers/status`
- `/api/analytics/vitals`
- `/api/auth/anthropic-credentials`
- `/api/auth/anthropic-credentials/test`
- `/api/auth/api-key`
- `/api/auth/api-key/test`
- `/api/auth/bedrock-credentials`
- `/api/auth/bedrock-credentials/test`
- `/api/auth/bing-webmaster`
- `/api/auth/bing-webmaster/callback`
- `/api/auth/bluesky`
- `/api/auth/bluesky/callback`
- `/api/auth/change-password`
- `/api/auth/deepl-credentials`
- `/api/auth/deepl-credentials/test`
- `/api/auth/forgot-password`
- `/api/auth/gemini-key`
- `/api/auth/google`
- `/api/auth/google-analytics`
- `/api/auth/google-analytics/callback`
- `/api/auth/google-search-console`
- `/api/auth/google-search-console/callback`
- `/api/auth/google-sheets`
- `/api/auth/google-sheets/callback`
- `/api/auth/google/callback`
- `/api/auth/linkedin`
- `/api/auth/linkedin/callback`
- `/api/auth/login`
- `/api/auth/logout`
- `/api/auth/mastodon`
- `/api/auth/mastodon/callback`
- `/api/auth/me`
- `/api/auth/me/delete`
- `/api/auth/meta`
- `/api/auth/meta/callback`
- `/api/auth/meta/pages`
- `/api/auth/meta/select-page`
- `/api/auth/mfa/confirm`
- `/api/auth/mfa/setup`
- `/api/auth/mfa/verify`
- `/api/auth/openai-credentials`
- `/api/auth/openai-credentials/test`
- `/api/auth/reset-password`
- `/api/auth/semrush-credentials`
- `/api/auth/semrush-credentials/test`
- `/api/auth/signup`
- `/api/auth/stock-credentials`
- `/api/auth/stock-credentials/test`
- `/api/auth/twitter`
- `/api/auth/twitter/callback`
- `/api/billing/checkout`
- `/api/billing/credits`
- `/api/billing/credits/top-up`
- `/api/billing/portal`
- `/api/billing/status`
- `/api/briefs`
- `/api/briefs/:id`
- `/api/chat`
- `/api/companies`
- `/api/companies/humanization`
- `/api/competitor-analyses/:id`
- `/api/competitor-analysis`
- `/api/contact`
- `/api/content-items/:id`
- `/api/content-pieces`
- `/api/content-pieces/:id`
- `/api/content-pieces/:id/approve`
- `/api/content-pieces/:id/enhance`
- `/api/content-pieces/:id/generate`
- `/api/content-pieces/:id/humanize`
- `/api/content-pieces/:id/images/regenerate`
- `/api/content-pieces/:id/publish`
- `/api/content-pieces/:id/regenerate`
- `/api/content-pieces/:id/reject`
- `/api/content-pieces/:id/render-preview`
- `/api/content-pieces/:id/repurpose`
- `/api/content-pieces/:id/repurpose/stream`
- `/api/content-pieces/:id/submit-review`
- `/api/content-pieces/generate`
- `/api/content-strategies`
- `/api/content-strategies/:id`
- `/api/content-strategies/:id/items/:id`
- `/api/content-strategies/:id/items/:id/generate`
- `/api/content-strategies/:id/items/:id/schedule`
- `/api/conversations`
- `/api/geo-audits`
- `/api/geo-audits/:id`
- `/api/goals`
- `/api/goals/:id`
- `/api/goals/:id/compile-briefs`
- `/api/industries`
- `/api/internal-links`
- `/api/invites/:id`
- `/api/jobs/:id`
- `/api/keyword-analyses/:id`
- `/api/keyword-analysis`
- `/api/keyword-opportunities/:id`
- `/api/keyword-rank-alerts/:id`
- `/api/locations`
- `/api/onboarding/fast-lane`
- `/api/org/api-keys`
- `/api/org/api-keys/:id`
- `/api/organizations`
- `/api/organizations/members`
- `/api/organizations/members/:id`
- `/api/organizations/security`
- `/api/partner/projects`
- `/api/personas`
- `/api/personas/:id`
- `/api/plans`
- `/api/platform/status`
- `/api/platform/stock-images/status`
- `/api/public/geo-audits/generate`
- `/api/reddit-discovery`
- `/api/roadmaps`
- `/api/roadmaps/:id`
- `/api/roadmaps/:id/lead-capture`
- `/api/seo-articles/:id`
- `/api/tools/*`
- `/api/topical-map`
- `/api/tracked-keywords`
- `/api/tracked-keywords/:id`
- `/api/tracked-keywords/:id/snapshots`
- `/api/usage`
- `/api/user/cms-summary`
- `/api/v1/connections`
- `/api/v1/content-pieces`
- `/api/v1/content/render`
- `/api/waitlist`
- `/api/webhooks/stripe`
- `/api/website-projects`
- `/api/website-projects/:id`
- `/api/website-projects/:id/analytics-properties`
- `/api/website-projects/:id/analytics-properties/available`
- `/api/website-projects/:id/analytics-properties/ga4/sync`
- `/api/website-projects/:id/article-idea-sources`
- `/api/website-projects/:id/article-idea-sources/sync`
- `/api/website-projects/:id/article-ideas`
- `/api/website-projects/:id/article-ideas/import`
- `/api/website-projects/:id/article-performance`
- `/api/website-projects/:id/autopilot-settings`
- `/api/website-projects/:id/brand-profile`
- `/api/website-projects/:id/brand-profile/platform-voice`
- `/api/website-projects/:id/brand-profile/platform-voice/:id`
- `/api/website-projects/:id/brand-profile/platform-voice/:id/analyze`
- `/api/website-projects/:id/brand-profile/platform-voice/:id/import`
- `/api/website-projects/:id/brand-profile/voice`
- `/api/website-projects/:id/brand-profile/voice/analyze`
- `/api/website-projects/:id/brand-voice/ingest`
- `/api/website-projects/:id/brand-voice/skill`
- `/api/website-projects/:id/brand-voice/sources`
- `/api/website-projects/:id/cms-integrations`
- `/api/website-projects/:id/cms-integrations/:id`
- `/api/website-projects/:id/cms-integrations/:id/output-mode`
- `/api/website-projects/:id/cms-integrations/test`
- `/api/website-projects/:id/competitors`
- `/api/website-projects/:id/content`
- `/api/website-projects/:id/content-pieces`
- `/api/website-projects/:id/content-pieces/repurpose`
- `/api/website-projects/:id/crawl`
- `/api/website-projects/:id/deepl-credentials`
- `/api/website-projects/:id/gsc-queries`
- `/api/website-projects/:id/keyword-alerts`
- `/api/website-projects/:id/keyword-opportunities`
- `/api/website-projects/:id/roadmaps/:id`
- `/api/website-projects/:id/scrape`
- `/api/website-projects/:id/search-properties`
- `/api/website-projects/:id/search-properties/available`
- `/api/website-projects/:id/search-properties/gsc/sync`
- `/api/website-projects/:id/search-properties/gsc/sync-status`
- `/api/website-projects/:id/semrush/status`
- `/api/website-projects/:id/social/composer`
- `/api/website-projects/:id/social/history-sync`
- `/api/website-projects/:id/social/metrics`
- `/api/website-projects/:id/social/metrics/sync`
- `/api/website-projects/:id/social/queue`
- `/api/website-projects/:id/social/queue/:id`
- `/api/website-projects/:id/social/schedule-settings`
- `/api/website-projects/:id/stock-credentials`
- `/api/website-projects/:id/visibility`
- `/api/website-projects/:id/visibility-settings`
- `/api/website-projects/:id/visibility/check`
- `/api/wordpress/test`
- `/oauth/bluesky-client-metadata.json`
- `/oauth/bluesky-jwks.json`
