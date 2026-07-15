import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Coins, CreditCard, KeyRound, Loader2 } from "lucide-react";
import { PLAN_LABELS } from "@/lib/billing/plans";
import { apiFetch } from "@/lib/api";
import type { SettingsBillingSummary } from "@workspace/app-shell";
import type { UsageSummary } from "@workspace/app-shell";

interface CreditBalance {
  plan: string;
  balance: number;
  monthlyGrant: number;
}

interface CreditTopUpPack {
  id: string;
  label: string;
  credits: number;
}

type SettingsBillingPanelProps = {
  billingSummary: SettingsBillingSummary | null;
  usage: UsageSummary | null;
  onOpenBillingPortal: () => void;
  portalLoading: boolean;
};

function formatRenewalDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function statusLabel(status: string | null): string {
  if (!status) return "No subscription";
  return status.replace(/_/g, " ");
}

export function SettingsBillingPanel({
  billingSummary,
  usage,
  onOpenBillingPortal,
  portalLoading,
}: SettingsBillingPanelProps) {
  const [searchParams] = useSearchParams();
  const [credits, setCredits] = useState<CreditBalance | null>(null);
  const [topUpPacks, setTopUpPacks] = useState<CreditTopUpPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [topUpPackId, setTopUpPackId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadCredits = useCallback(async () => {
    setLoading(true);
    try {
      const [creditsRes, packsRes] = await Promise.all([
        apiFetch<CreditBalance & { packs?: CreditTopUpPack[] }>("/api/billing/credits"),
        apiFetch<{ packs: CreditTopUpPack[] }>("/api/billing/credits/top-up").catch(() => ({ packs: [] })),
      ]);
      setCredits({
        plan: creditsRes.plan,
        balance: creditsRes.balance,
        monthlyGrant: creditsRes.monthlyGrant,
      });
      setTopUpPacks(packsRes.packs ?? creditsRes.packs ?? []);
    } catch {
      setMessage("Could not load credit balance");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCredits();
  }, [loadCredits]);

  useEffect(() => {
    const topup = searchParams.get("topup");
    if (topup === "success") {
      setMessage("Credits added to your workspace");
      void loadCredits();
    } else if (topup === "cancelled") {
      setMessage("Credit top-up canceled");
    }
  }, [searchParams, loadCredits]);

  async function startTopUp(packId: string) {
    setTopUpPackId(packId);
    setMessage(null);
    try {
      const data = await apiFetch<{ url?: string }>("/api/billing/credits/top-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      if (!data.url) {
        throw new Error("Could not start checkout");
      }
      window.location.href = data.url;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Top-up unavailable");
      setTopUpPackId(null);
    }
  }

  if (!billingSummary) {
    return <p className="text-sm text-muted-foreground">Billing unavailable.</p>;
  }

  const renewal = formatRenewalDate(billingSummary.currentPeriodEnd);
  const showTopUps =
    billingSummary.stripeConfigured && billingSummary.canManageBilling && topUpPacks.length > 0;
  const currentPlan = usage?.plan ?? billingSummary.plan;
  const planLabel = PLAN_LABELS[currentPlan as keyof typeof PLAN_LABELS] ?? currentPlan;

  return (
    <div className="space-y-6">
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading credits…</p>
      ) : credits != null ? (
        <div className="paper-card space-y-4 p-6">
          <div className="flex items-start gap-3">
            <Coins className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="flex-1 space-y-3">
              <div>
                <h2 className="font-semibold">AI credits</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Platform-key generations draw from your org credit balance.
                </p>
              </div>
              <div className="flex flex-wrap items-baseline gap-2">
                <p className="text-3xl font-bold tabular-nums">{credits.balance.toLocaleString()}</p>
                <span className="text-sm text-muted-foreground">credits available</span>
              </div>
              {credits.monthlyGrant > 0 ? (
                <p className="text-sm text-muted-foreground">
                  {PLAN_LABELS[credits.plan as keyof typeof PLAN_LABELS] ?? credits.plan} plan includes{" "}
                  {credits.monthlyGrant.toLocaleString()} credits per month.
                </p>
              ) : null}
              {showTopUps ? (
                <div className="space-y-2 pt-2">
                  <p className="text-sm font-medium">Top up credits</p>
                  <div className="flex flex-wrap gap-2">
                    {topUpPacks.map((pack) => (
                      <button
                        key={pack.id}
                        type="button"
                        disabled={topUpPackId !== null}
                        onClick={() => void startTopUp(pack.id)}
                        className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary disabled:opacity-50"
                      >
                        {topUpPackId === pack.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          pack.label
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <div className="paper-card space-y-4 p-6">
        <div className="flex items-start gap-3">
          <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="font-semibold">Plan</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {currentPlan === "growth"
                  ? "Growth includes autopilot and platform features. BYOK recommended for unlimited AI."
                  : "Consulting clients use BYOK for unlimited AI generations. Platform access is scoped per engagement."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <p className="text-2xl font-bold">{planLabel}</p>
              {currentPlan === "starter" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
                  <KeyRound className="h-3 w-3" />
                  BYOK optional
                </span>
              ) : null}
              {billingSummary.subscriptionStatus ? (
                <span className="rounded-full border border-border px-2 py-0.5 text-xs capitalize">
                  {statusLabel(billingSummary.subscriptionStatus)}
                </span>
              ) : null}
            </div>

            {renewal && billingSummary.hasActiveSubscription ? (
              <p className="text-sm text-muted-foreground">
                Subscription renews on{" "}
                <span className="text-foreground">{renewal}</span>
              </p>
            ) : null}

            {usage ? (
              <div className="space-y-2 rounded-lg border border-border p-4">
                <p className="text-sm font-medium">Usage this month</p>
                <p className="text-2xl font-bold tabular-nums">{usage.articlesThisMonth}</p>
                <p className="text-sm text-muted-foreground">
                  {usage.usesByok
                    ? "Articles generated with your API key (unlimited)"
                    : "Articles generated on platform key"}
                </p>
              </div>
            ) : null}

            <p className="text-sm text-muted-foreground">
              Add your Gemini or Bedrock key in{" "}
              <Link to="/integrations/ai" className="text-primary hover:underline">
                Integrations → AI
              </Link>{" "}
              for unlimited AI generations.
            </p>

            {billingSummary.hasStripeCustomer && billingSummary.canManageBilling ? (
              <button
                type="button"
                disabled={portalLoading}
                onClick={onOpenBillingPortal}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
              >
                {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Manage billing"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
