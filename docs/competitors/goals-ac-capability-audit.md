# goals.ac Capability Audit vs AutoSEO

**Workstream C** · Internal engine vs packaging · July 2026

---

## Truth table

| Feature | Status | Key files | SMB fast-lane gap |
|---------|--------|-----------|-------------------|
| `contentGenerateSweep` | live | `lib/jobs/src/handlers/contentGenerateSweep.ts` | Needs worker + cron |
| Daily/weekly cadence | live | `lib/content-engine/src/support/autopilot-scheduler.ts` | Off by default |
| `ProjectAutomationPanel` | live | `project-automation-panel.tsx` | Buried in Publishing tab |
| 30-item content strategy | live | `content-strategy-generator.ts` | Requires roadmapId today |
| Starter quota (5 articles/mo) | live | `lib/billing/src/plans.ts` | Blocks 30/mo promise |
| Growth tier checkout | stub | `billing-service.ts`, `checkout/route.ts` | Disabled |
| Stripe price resolution | live | `platform-credentials.ts` | Not wired to checkout |
| Webhook plan assignment | stub | `applyStripeSubscriptionToOrganization` | Hardcodes `starter` |
| URL-only onboarding | missing | — | 10+ step path today |
| Brand scan on project create | live | `website-projects/route.ts` | Not in onboarding |
| WP plugin connect (project) | live | `cms-connection-schemas.ts` | Onboarding uses legacy table |
| Legacy company autopilot | hidden | `scheduled_articles`, redirects | Dual stack risk |
| LLM visibility tracking | live | visibility settings + jobs | Not on autopilot dashboard |
| Internal link hub | beta | compare page | Not marketed to SMB |
| Humanizer + quality scores | live | content-engine | Under-marketed vs AutoSEO |

## 30 articles/month feasibility

| Requirement | Current state |
|-------------|---------------|
| Calendar with 30 items | Yes — strategy generator |
| Daily autopilot | Yes — 1 article per sweep |
| Quota headroom | **No** — Starter capped at 5/mo |
| Growth tier sold | **No** |
| BYOK for unlimited | Yes — bypasses quota |

**Conclusion:** Engine supports 30/mo; **billing + onboarding** block the SMB promise.

## Minimum steps today: URL → 3 articles

1. Signup → onboarding (goal + company form)
2. Personas generation
3. WordPress step (skippable)
4. Create project manually
5. Wait brand scan
6. Create roadmap
7. Generate 30-day strategy
8. Configure BYOK
9. Generate articles one-by-one

**Target after Sprint 1:** URL → signup → fast-lane (3 steps UI) → 3 queued articles.

## Blocks for Growth tier (stacked)

1. `OFFERED_PLAN_IDS = ["starter"]`
2. `startOrganizationCheckout` returns error
3. `applyStripeSubscriptionToOrganization` forces starter
4. `UpgradePlanButton` disabled
5. Marketing pricing = consulting only
