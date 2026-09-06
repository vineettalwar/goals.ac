# PRD: Dynamic plan catalog

**Status:** Approved to implement (owner: "make it dynamic instead of hard coded")
**Date:** 2026-09-06
**Audit refs:** BLOCK-6, HIGH-14 (`docs/audits/2026-09-06-production-readiness.md`)

## Problem

`lib/billing/src/plans.ts` hardcodes `PlanId = "starter" | "growth" | "scale"` as a closed TS union, then
exhaustively maps it in `PLAN_LABELS`, `PLAN_DISPLAY_PRICES` (Growth is `$49/mo` USD, Scale has no price at
all), `PLAN_MONTHLY_CREDITS`, and `DEFAULT_PLAN_QUOTA_LIMITS`. Stripe price resolution is worse:
`getStripePriceIdForPlan()` always returns `null`; the real implementation,
`getStripePriceIdForPlanResolved()` (`platform-credentials.ts:162`), is `if (plan === "growth") ... if
(plan === "scale")` against two singleton env/DB fields. There is no `€500`-class plan, no EUR pricing, and
no VAT/reverse-charge handling on the Stripe Checkout calls the customers (European B2B) actually hit.

Adding, renaming, repricing, or retiring a tier today means editing a TS union, four `Record<PlanId, X>`
maps, and redeploying. A super admin cannot do any of this from the product.

## Success criteria

- [ ] A super admin can create, edit, reorder, and deactivate a plan from `/admin/plans` — label,
      description, price (amount + currency), Stripe price id, monthly credits, offered/active flags —
      with no code change or redeploy.
- [ ] A fresh install ships with Starter (free) plus four paid EUR tiers (€99 / €299 / €499 / €999) seeded
      by default.
- [ ] `PlanId` is no longer a closed union anywhere in `lib/billing`; nothing throws or silently
      mis-resolves on an unknown plan id.
- [ ] Existing organizations/users on the deprecated `growth` ($49 USD) and `scale` (custom) ids keep
      working — quota checks, credit grants, and billing status resolve exactly as before — without those
      ids appearing in the new self-serve ladder.
- [ ] Stripe price id resolution (checkout + webhook reverse lookup) reads the catalog table, not an
      `if/else` chain.
- [ ] Every `stripe.checkout.sessions.create` call collects VAT/reverse-charge correctly for EU B2B
      customers (`automatic_tax`, `tax_id_collection`, `customer_update`).
- [ ] `plan_quota_config` (existing table, cache, admin route, tests) is untouched in shape and continues
      to own quotas; the new table owns commercial identity only.
- [ ] Webhook signature verification and the ledger's idempotent grant (`stripeInvoiceId` /
      `stripeCheckoutSessionId`) keep working unmodified.

## Scope in

- New `plan_catalog` table (Postgres + D1/SQLite mirror) + Drizzle-generated migrations.
- `lib/billing/src/plan-catalog.ts`: cached catalog load (mirrors `plan-quota-config.ts`'s 30s-TTL
  pattern), CRUD (`upsertPlanCatalogEntry`, `listPlanCatalogEntries`, `reorderPlanCatalogEntries`), and
  resolution helpers (`getPlanLabel`, `getPlanDisplayPrice`, `getPlanMonthlyCredits`, `isOfferedPlan`,
  `isPaidPlan`, `getSuggestedUpgradePlan`, `getStripePriceIdForPlan`, `planFromStripePriceId`).
- `lib/db/src/seed-plan-catalog.ts`: idempotent seed (`seedPlanCatalogIfEmpty`), wired into the same
  bootstrap points as `seedReferenceDataIfEmpty`.
- Rewriting `plans.ts` down to the free-plan fallback constant, `normalizePlanId`, and the deprecated
  `@deprecated` re-exports needed so unrelated call sites keep compiling.
- Async-ifying every function whose contract required a synchronous exhaustive map
  (`isPaidPlan`, `getSuggestedUpgradePlan`, `getMonthlyCreditsForPlan`) and updating their ~6 call sites.
- Stripe: catalog-backed price lookup in both directions; `automatic_tax` + `tax_id_collection` +
  `customer_update` on both `checkout.sessions.create` calls in `stripe.ts`.
- Super-admin API (`/api/admin/plans`, extending the `/api/admin/plan-quotas` precedent) + a new
  `/admin/plans` panel (marketing-persona-app, per `DESIGN.md`) for full CRUD; the existing quota panel is
  left in place and now targets real catalog plan ids.
- Updating the two admin surfaces that currently render a static `PLAN_IDS` dropdown (org detail plan
  changer, invite-firm plan picker) to source options from the live catalog instead.
- Tests: `plan-catalog.ts` resolution (cache, fallback-on-empty-DB, legacy id passthrough), Stripe price
  lookup, rewritten `plans.test.ts` / `public-plans.test.ts` for the new contract.

## Scope out

- Metered/usage-based Stripe pricing (still flat subscription price ids per plan).
- Multi-currency *per customer* (a plan has one currency; no FX conversion).
- Migrating historical `growth`/`scale` Stripe price ids automatically — the operator re-enters the new
  EUR price ids for the new tiers into the admin UI; the legacy USD price ids stay in the catalog rows for
  existing subscribers only (see Edge cases).
- Annual billing / multi-interval prices.
- A public marketing pricing page redesign (BLOCK-10 territory) — this PRD only makes the data dynamic;
  wiring a new marketing page to it is a follow-up.
- Live Stripe object creation — this is code and config only; the operator creates the Prices in the
  Stripe dashboard and pastes the ids into `/admin/plans`.

## Technical approach

### Schema: split commercial identity from quotas (keep `plan_quota_config`)

`plan_quota_config` already does one job well — platform-key quota limits, keyed by `plan_id` (`text`, not
an enum), with a cache, a super-admin route, and tests. Reusing it for quotas and adding a *separate*
`plan_catalog` table for commercial identity, rather than folding everything into one table, because:

1. Quotas and commercial identity change on different cadences and by different people — pricing is a
   business decision, `articlesPerMonth` is a platform-cost decision. Keeping them separate means editing
   one doesn't risk the other.
2. `plan_quota_config` rows are sparse by design (`null` = unlimited/unconfigured) and every column is
   quota-shaped. Adding `price_amount`, `currency`, `stripe_price_id` to that table would make a
   quota-focused table also the source of truth for checkout — two very different read patterns (30s-cache
   quota check on every AI call vs. infrequent checkout-time price lookup) sharing one row invites a bug
   where a quota edit's cache invalidation window also affects checkout price staleness, or vice versa.
3. `plan_catalog` is the **superset key list** — every plan that exists at all gets a row here, including
   legacy `growth`/`scale`. `plan_quota_config` stays exactly as scoped today: an override table that may
   or may not have a row for a given plan id (falls back to `plan_catalog`-independent defaults, unchanged
   behavior).

`lib/db/src/schema/plan_catalog.ts` (Postgres; SQLite mirror in `lib/db/src/schema-sqlite/`):

```ts
export const planCatalogTable = pgTable("plan_catalog", {
  id: text("id").primaryKey(),                 // slug, e.g. "starter", "team", legacy "growth"
  label: text("label").notNull(),
  description: text("description"),
  priceAmount: integer("price_amount").notNull(),   // minor units (cents); 0 for free
  currency: text("currency").notNull().default("eur"),
  stripePriceId: text("stripe_price_id"),
  monthlyCredits: integer("monthly_credits"),   // null = no platform-key credit grant
  isOffered: boolean("is_offered").notNull().default(false),   // self-serve purchasable
  isActive: boolean("is_active").notNull().default(true),      // false = fully retired/hidden
  sortOrder: integer("sort_order").notNull().default(0),
  updatedBy: integer("updated_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp(...).notNull().defaultNow(),
  updatedAt: timestamp(...).notNull().defaultNow().$onUpdate(() => new Date()),
});
```

`id` is `text`, not an enum — same reasoning the owner already applied to `organizations.plan` /
`users.plan` / `plan_quota_config.plan_id`: a new tier is an `INSERT`, not a migration.

### Seed ladder

Starter (free) stays the hardcoded hardcoded-fallback id (`STARTER_PLAN_ID = "starter"` in `plans.ts`) —
every DB default and `normalizePlanId` fallback point at it. The four paid tiers are new ids, deliberately
**not** named `growth`/`scale` — those strings are still live on existing organizations at their *original*
prices ($49 USD flat / custom), and reusing them for the new EUR ladder would silently reprice existing
subscribers the moment their org row is read back through `normalizePlanId`. Proposed names (mine to
choose per the task) with the confirmed EUR prices:

| id | label | price | credits (platform-key/mo) |
|---|---|---|---|
| `starter` | Starter | Free | — |
| `team` | Team | €99/mo | 750 |
| `business` | Business | €299/mo | 2,500 |
| `agency` | Agency | €499/mo | 5,000 |
| `enterprise` | Enterprise | €999/mo | 12,000 |

Credit amounts scale roughly with price the same way Growth's 500-for-$49 did; a super admin can change
them post-seed with no code change. Legacy `growth` ($49/mo USD, 500 credits) and `scale` (custom, no
credits) are seeded too, marked `isOffered: false, isActive: true` — visible in the admin list (so an
operator can see they exist and still resolve for the orgs on them) but never offered to new signups.

### `plan-catalog.ts` — the new source of truth

Mirrors `plan-quota-config.ts`'s cache shape exactly (30s TTL, `invalidatePlanCatalogCache()` on write):

- `loadPlanCatalog(): Promise<PlanCatalogEntry[]>` — all rows, cached, ordered by `sortOrder`. Falls back to
  an in-memory `DEFAULT_PLAN_CATALOG_SEED` (same five rows as the seed) when the table is empty or the
  query fails, so a fresh install / a DB blip never leaves billing with zero resolvable plans.
- `getPlanCatalogEntry(planId)` — cache lookup; unknown id returns a synthesized `{ id, label: id, priceAmount: 0, isOffered: false, isActive: false, ... }` stub rather than `undefined`/throwing, so every
  caller downstream (label rendering, credit lookup) degrades instead of crashing.
- `getOfferedPlans()` — `isOffered && isActive`, sorted — this is what `/pricing` and self-serve checkout
  read.
- `getPlanLabel`, `getPlanDisplayPrice`, `getPlanMonthlyCredits`, `isPaidPlan`, `isOfferedPlan`,
  `getSuggestedUpgradePlan` (next `isOffered` tier above the current one by `sortOrder`) — catalog-backed,
  all `async`, all non-throwing on an unresolvable id.
- `getStripePriceIdForPlan(planId)` / `planFromStripePriceId(priceId)` — replace the hardcoded
  `if (plan === "growth")` branch in `platform-credentials.ts` with a catalog scan.
- Admin CRUD: `upsertPlanCatalogEntry`, `listPlanCatalogEntries` (unfiltered, for `/admin/plans`),
  `setPlanActive`, `reorderPlanCatalogEntries`.

### `PlanId` union removal

`PlanId` becomes `type PlanId = string` (kept as an alias purely for call-site readability, not for
compile-time exhaustiveness — that was the entire bug). This is intentionally the least invasive option:

- Every `Record<PlanId, X>` in caller code (`cloneDefaults()` in `plan-quota-config.ts`, the two Cloudflare
  workers' local copies of the same pattern) still typechecks unchanged — TS accepts an object literal with
  a fixed key set against `Record<string, X>` (implicit index signature), so `PLAN_IDS.map(...)` /
  `Object.fromEntries` call sites needed **zero edits**.
- Every `plan === "growth"` comparison still typechecks (comparing `string` to a literal is always legal),
  so the legacy-id special cases that must keep working needed no signature changes.
- The one place `Extract<PlanId, "growth" | "scale">` was used to build `PaidPlanId` had to go — `Extract`
  against a bare `string` collapses to `never`. `PaidPlanId` is now also `string`; the checkout route still
  validates the plan id at the API boundary (against `getOfferedPlans()`, not a type).
- `STARTER_PLAN_ID` (`= "starter"`) stays a real exported constant — it is the one id the codebase is
  allowed to hardcode, per the requirement, and every DB column default and `normalizePlanId` fallback
  point at it, not at a string literal repeated in five places.
- `normalizePlanId(plan)` stays **synchronous** and deliberately dumb: trim, or fall back to
  `STARTER_PLAN_ID` on empty/null. It does **not** validate against the catalog (that would require an
  `await` at every one of its ~15 call sites, most of which are in hot, currently-sync paths). An unknown
  *non-empty* plan id now passes through normalization unchanged and is resolved later, async, by
  `plan-catalog.ts`, which — per above — degrades to a safe stub instead of throwing. Net effect asked for
  in the brief ("must still resolve an unknown/stale value to something safe") is preserved: nothing ever
  throws on a bad plan id, it just may render as an inactive/unlabeled stub until fixed in `/admin/plans`.
- Functions whose old contract *required* synchronous exhaustiveness (`isPaidPlan`, `getSuggestedUpgradePlan`,
  `getMonthlyCreditsForPlan`) became `async`. Blast radius was checked file-by-file before committing to
  this: every call site (`session.ts` internal, `credits.ts` internal, two API routes in
  `marketing-persona-app` / `cf-read-worker`) was already inside an `async` function, so each edit is
  `+1 await`.

### Stripe

- `getStripePriceIdForPlanResolved` / `planFromStripePriceIdResolved` (`platform-credentials.ts`) are
  removed; `stripe.ts` and `stripe-org-sync.ts` call `plan-catalog.ts`'s versions instead.
  `platform-credentials.ts` keeps owning the Stripe **secret key** and **webhook secret** only (env-or-DB
  singleton) — per-plan price ids move fully into `plan_catalog.stripePriceId`, which is the correct owner
  now that there can be more than two paid plans.
- Both `stripe.checkout.sessions.create` calls (subscription checkout in `createCheckoutSession`, and the
  credit top-up payment checkout) get:
  ```ts
  automatic_tax: { enabled: true },
  tax_id_collection: { enabled: true },
  customer_update: { name: "auto", address: "auto" },
  ```
  `customer_update` is required by Stripe whenever `automatic_tax` is enabled and a `customer` id (not just
  `customer_email`) is passed, so it must be set on both call sites even though only one currently passes
  an existing customer. Stripe requires a `customer` (not `customer_email`) address on file for automatic
  tax to calculate correctly for repeat customers — this PRD does not change how the customer is created,
  since that is unrelated to plan catalog scope, but flags it under Open questions.

### Admin UI

Extends `/admin` (marketing-persona-app), following `artifacts/marketing-persona-app/DESIGN.md`, not the
deprecated `docs/design.md`. New `/admin/plans` route: a list of `PlanCatalogEntry` rows (drag-to-reorder
via `sortOrder`, or up/down controls if drag adds too much scope) with inline edit for label, description,
price + currency, Stripe price id, monthly credits, and two toggles (offered / active). Reuses the existing
`AdminPlansPanel` quota editor below it, now driven by the same catalog list instead of the static
`PLAN_IDS` array. New API: `/api/admin/plans` (`GET` list, `POST` create, `PATCH` update one, `POST
/reorder`), gated by `requirePlatformAdminApi` exactly like `/api/admin/plan-quotas`.

## Edge cases

- **Unknown plan id read from a stale org/user row** (deleted from the catalog, or a typo written by an
  old code path): `normalizePlanId` passes it through unchanged; `plan-catalog.ts` resolves it to a safe
  stub (`isOffered: false`, no credits, unlabeled-but-non-throwing). Quota checks fall back to
  `plan_quota_config`'s own `normalizePlanId`-into-`starter` behavior for the *quota* side, which is
  intentionally unchanged (quotas were never keyed off the closed union in a way this PRD needed to touch).
- **Two rows fight over the same Stripe price id.** `planFromStripePriceId` returns the first match by
  `sortOrder`; the admin UI does not currently block a duplicate price id at write time. Documented as a
  known gap, not fixed here (Open questions).
- **Deactivating a plan an existing org is on.** `isActive: false` only affects whether the plan is listed
  for *new* assignment (offered-plan checks, admin dropdowns); it does not move existing orgs off it or
  block their quota/credit resolution. Matches how `growth`/`scale` are handled for legacy orgs.
- **Empty `plan_catalog` table** (migration ran, seed didn't, e.g. a test DB): `loadPlanCatalog()` falls
  back to the in-memory default seed rather than returning an empty list, so billing never goes dark.
- **Currency per plan, not per customer.** All four new tiers are EUR; a US customer checking out still
  pays in EUR (Stripe handles card-network conversion). No per-customer currency selection is in scope.

## Open questions

1. Should `automatic_tax` require every Checkout Session to also collect a billing address
   (`billing_address_collection: "required"`)? Stripe generally needs a customer address to compute tax
   correctly; this PRD enables `automatic_tax` + `tax_id_collection` + `customer_update` as the audit asked,
   but full correctness may need `billing_address_collection: "required"` too — flagging for the operator
   to confirm against their Stripe Tax settings rather than guessing at checkout UX here.
2. Should the legacy `growth`/`scale` rows ever be hard-deleted once the last subscriber migrates off them?
   Left as a manual follow-up — deleting a catalog row a stale org still points at would fall into the
   "unknown plan id" edge case above, which is safe but not something to do casually.
3. Drag-to-reorder vs. up/down buttons for `sortOrder` in the admin UI — implemented as up/down buttons to
   keep the UI dependency-free (no drag library) per the CDN-allowlist / no-new-heavy-deps posture; revisit
   if the admin wants true drag-and-drop.
