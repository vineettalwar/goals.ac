# PRD — Production firm onboarding (secure invite → Typeform onboarding → first article)

Status: approved-to-build (2026-09-01)
Owner: platform
Branch: `claude/production-onboarding-ai-content-g5jrtv`

## Problem

Four paying firms (law, dental, software development, marketing) are ready to onboard at ~€500/mo.
The engine that serves them already exists — brand scrape, voice extraction, LinkedIn ingest, GSC
sync, keyword opportunities, WordPress publish, humanized drafting. What does not exist is a way to
get a firm from "super admin decides to onboard them" to "first article is being written" in one
unbroken, premium flow.

Concretely, today:

1. `createOrgInvite` requires an existing `organizationId`. There is no way to invite a firm that
   does not yet exist on the platform.
2. Invite tokens are stored in plaintext in `org_invites.token` and travel as a URL query param.
3. Accepting an invite lands the user on `/dashboard`, not in onboarding.
4. Onboarding is four disconnected pages (`/onboarding` → `/personas` → `/wordpress` → `/connect`)
   with no server-side state. A refresh loses everything. Progress is a single boolean
   (`companies.onboarding_complete`).
5. LinkedIn and Search Console are never offered during onboarding, only afterwards in `/integrations`.
6. There are no vertical presets. A dental practice and a law firm get the same generic prompts,
   despite both being YMYL categories where unreviewed AI claims are a liability.

## User stories

- **As super admin**, I invite a firm by email, prefilling whatever I already know (firm name,
  vertical, website, plan), and I can revoke or resend that invite and see its state.
- **As a firm owner**, I click a secure link, create my account, and answer one question per screen
  until the product knows my business, my voice, and my publishing target.
- **As a firm owner**, I can close the tab at question 6 and pick up at question 6 tomorrow.
- **As a firm owner**, onboarding ends by showing me my first article being written from my own voice.

## Decisions (locked with the client 2026-09-01)

| # | Decision | Reason / alternative rejected |
|---|---|---|
| D1 | Admin prefills what it knows; the firm fills the rest | Client chose "Both". Prefilled steps auto-advance so the firm never retypes what admin supplied. |
| D2 | **The org row is created at invite acceptance, not at invite creation** | Forced by schema: `organizations.owner_id` is `NOT NULL` and references `users.id`, so no org can exist before its owner. Alternative (nullable owner_id) rejected — it weakens an invariant the whole permission model rests on. |
| D3 | Two invite kinds: `member` (existing org, current behavior unchanged) and `firm` (no org yet, carries prefill) | Keeps the working member-invite path untouched. `org_invites.organization_id` becomes nullable. |
| D4 | LinkedIn OAuth is attempted, but the step **always** has a fallback | `/v2/ugcPosts?q=authors` needs `r_member_social`, which LinkedIn grants only to approved partner apps. Standard apps get 403. Unverified — must never dead-end a paying customer's first session. |
| D5 | First article generates in the background with a live progress screen; onboarding does not block on it | A 3–5 minute spinner in the first session is the worst possible first impression. |
| D6 | Search Console is optional; ideas fall back to competitor-gap + AI analysis | A new dental or law site may have zero GSC data. Both fallback sources already exist as `keyword_opportunities.source` values. |
| D7 | Legal and dental verticals mark generated content `requires_review` | YMYL. Auto-publishing unreviewed medical or legal claims is a liability we will not ship. |

## Scope

### In scope

- Firm invites: create / list / revoke / resend, with prefill, from `/admin`.
- Invite security: hashed tokens at rest, single-use, revocable, token exchanged for an httpOnly
  cookie so it stops living in the URL.
- `onboarding_sessions` table: resumable, server-persisted answers and per-step status.
- Typeform-style shell: one question per screen, keyboard-first, animated, autosaving, resumable.
- Steps: firm name → vertical → website → goal → audience → competitors → LinkedIn voice →
  Search Console → WordPress → voice review → topic picks → first article.
- Vertical presets for law / dental / software / marketing, feeding brand profile + content style.
- Cold-start idea generation when GSC is absent or empty.
- Live "your first article is being written" completion screen.

### Out of scope (v1)

- Stripe checkout inside onboarding (admin sets the plan on the invite; billing stays manual).
- SSO / MFA enforcement (already scaffolded, unrelated track).
- Multi-seat invite-during-onboarding (owner invites teammates later from settings).
- Non-WordPress CMS in the onboarding flow (others stay in `/integrations`).
- Migrating the legacy Vite onboarding pages — they stay as-is.

## Technical approach

### Data model (one migration, authored by the orchestrator before builders start)

`org_invites` — altered:
- `organization_id` → nullable (firm invites have no org yet)
- `token_hash text not null` — sha256 of the token; `token` retained nullable for rollback, written null for new rows
- `kind text not null default 'member'` — `'member' | 'firm'`
- `prefill jsonb` — `{ orgName?, vertical?, websiteUrl?, plan?, contactName? }`
- `revoked_at timestamptz`
- `last_sent_at timestamptz`, `send_count integer not null default 0`

`onboarding_sessions` — new:
- `id serial pk`
- `user_id integer not null → users.id on delete cascade`
- `organization_id integer → organizations.id on delete cascade`
- `company_id integer → companies.id on delete set null`
- `website_project_id integer → website_projects.id on delete set null`
- `invite_id integer → org_invites.id on delete set null`
- `vertical text`
- `current_step text not null default 'firm_name'`
- `answers jsonb not null default '{}'` — accumulated answers
- `step_status jsonb not null default '{}'` — per-step `pending | skipped | done | failed`
- `completed_at timestamptz`, `created_at`, `updated_at`
- unique index on `user_id` where `completed_at is null`

`organizations` — altered: `vertical text` (nullable).

### API contract (fixed before builders start, so streams cannot drift)

```
POST   /api/admin/invites/firm      { email, orgName?, vertical?, websiteUrl?, plan?, role }
                                    -> { inviteId, emailSent, inviteUrl? }
GET    /api/admin/invites           -> existing, extended with kind/prefill/revokedAt/sendCount
POST   /api/admin/invites/[id]/resend -> { emailSent, inviteUrl? }   (rotates the token)
DELETE /api/admin/invites/[id]      -> revoke (sets revoked_at)

GET    /accept-invite/[token]       -> server component: verifies hash, sets httpOnly cookie,
                                       redirects to /accept-invite (clean URL)
GET    /api/invites/session         -> invite details from the cookie
POST   /api/invites/session/accept  -> creates org (firm kind) + membership + onboarding session,
                                       redirects to /onboarding

GET    /api/onboarding/session      -> { session } | null   (creates on first call)
PATCH  /api/onboarding/session      { step, answer?, status? } -> { session, nextStep }
POST   /api/onboarding/session/complete -> { projectId, contentItemId }

POST   /api/onboarding/voice/linkedin  -> attempt OAuth ingest; on 403 returns { fallback: 'paste' }
POST   /api/onboarding/voice/paste     { samples: string[] } -> ingest as brand voice source
```

`answers` shape:
```ts
type OnboardingAnswers = {
  orgName?: string;
  vertical?: 'law' | 'dental' | 'software' | 'marketing' | 'other';
  websiteUrl?: string;
  goal?: 'leads' | 'traffic' | 'authority';
  audience?: string;
  competitors?: string[];
  linkedin?: { mode: 'oauth' | 'paste' | 'skipped'; postCount?: number };
  searchConsole?: { mode: 'connected' | 'skipped'; propertyUrl?: string };
  wordpress?: { mode: 'plugin' | 'app_password' | 'skipped'; siteUrl?: string };
  topicIds?: number[];
};
```

### Step registry

Steps are data, not hardcoded pages: `src/lib/onboarding/steps.ts` exports an ordered array of
`{ id, question, helper, kind, required, isSatisfied(answers), prefillFrom }`. A step whose answer
arrived via invite prefill, or which `isSatisfied` already, auto-advances without rendering. This is
what makes D1 ("Both") cost one code path instead of two.

### Vertical presets

`src/lib/onboarding/verticals.ts` — per vertical: default audience copy, tone guardrails, forbidden
claim patterns, seed topic angles, schema.org type, and `requiresReview: boolean` (true for law and
dental, per D7).

## Success criteria

1. Super admin sends a firm invite from `/admin` and the recipient reaches onboarding without any
   manual DB work.
2. A firm completes onboarding end to end in under 5 minutes of answering.
3. Closing the tab mid-flow and returning resumes at the same step with answers intact.
4. Every connect step (LinkedIn, GSC, WordPress) can be skipped and the flow still completes.
5. LinkedIn returning 403 shows the paste fallback, not an error.
6. Onboarding completes with a brand voice recorded and a first article queued.
7. Law and dental orgs produce content flagged `requires_review`.
8. `pnpm run typecheck` is clean for `@workspace/db`, `@workspace/content-engine`, and
   `marketing-persona-app` (the packages already red on `main` stay out of scope).

## Edge cases the build must handle

- Invite email already belongs to a platform user (attach to new org, don't duplicate the user).
- Invite revoked or expired between email and click.
- Token replayed after acceptance (single-use).
- Signed in as a different user than the invite's email.
- Website scrape still running when the voice-review step is reached (show partial, don't block).
- Website unreachable / blocks scraping — the flow must continue on manual answers.
- GSC connected but returns zero rows.
- WordPress credentials that fail the connection test.
- Two browser tabs advancing the same session (last write wins on a per-step basis, not whole-doc).

## Premortem — how this fails, and the defense

| Failure | Defense in the plan |
|---|---|
| LinkedIn 403s for every customer and the voice step is dead | D4: fallback is built in the same stream, not deferred |
| Brand scrape is slow, so "voice review" shows nothing and looks broken | Step polls with a real progress state and can be passed with partial data |
| Parallel builders collide on one migration file | Orchestrator authors the single migration before any builder starts |
| Parallel builders drift on API shapes | Contract fixed above; builders build to it, not to each other |
| Onboarding completes but no article appears, and the customer's first impression is an empty dashboard | Completion screen streams real job state and has an explicit failure message with a retry |
| Law firm publishes an AI claim about the law and it costs them | D7 `requires_review` + vertical forbidden-claim guardrails |

## Build streams (parallel, disjoint file sets)

- **S0 (orchestrator, first, blocking):** migration + schema + generated types + step/vertical/answer type contracts.
- **S1:** firm invites — `lib/platform-admin/src/invites.ts`, `api/admin/invites/**`, admin UI, email template.
- **S2:** invite acceptance security — `/accept-invite/**`, `api/invites/**`, cookie exchange, hashing.
- **S3:** onboarding session API + step engine — `api/onboarding/**`, `lib/onboarding/**`.
- **S4:** Typeform UI shell — `app/onboarding/**`, `components/onboarding/**`.
- **S5:** connect steps — LinkedIn (+ paste fallback), GSC optional, WordPress reuse, voice review.
- **S6:** verticals, cold-start ideas, first-article live screen.

S1–S6 build to the S0 contract in parallel; a separate adversarial reviewer with a fresh context
verifies before anything is called done.
