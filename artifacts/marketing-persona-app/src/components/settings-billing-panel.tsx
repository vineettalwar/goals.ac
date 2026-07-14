"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Coins, CreditCard, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLAN_LABELS } from "@/lib/billing/plans";
import Link from "next/link";

interface BillingStatus {
  plan: "starter";
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  hasStripeCustomer: boolean;
  hasActiveSubscription: boolean;
  stripeConfigured: boolean;
  canManageBilling: boolean;
}

interface UsageSummary {
  plan: string;
  articlesThisMonth: number;
  quota: number | null;
  quotaRemaining: number | null;
}

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

export function SettingsBillingPanel() {
  const searchParams = useSearchParams();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [credits, setCredits] = useState<CreditBalance | null>(null);
  const [topUpPacks, setTopUpPacks] = useState<CreditTopUpPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [topUpPackId, setTopUpPackId] = useState<string | null>(null);

  const loadBilling = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, usageRes, creditsRes, packsRes] = await Promise.all([
        fetch("/api/billing/status"),
        fetch("/api/usage"),
        fetch("/api/billing/credits"),
        fetch("/api/billing/credits/top-up"),
      ]);
      if (!statusRes.ok) throw new Error("Failed to load billing");
      const data = (await statusRes.json()) as { billing: BillingStatus };
      setBilling(data.billing);
      if (usageRes.ok) {
        const usageData = (await usageRes.json()) as { usage: UsageSummary };
        setUsage(usageData.usage);
      }
      if (creditsRes.ok) {
        const creditsData = (await creditsRes.json()) as CreditBalance;
        setCredits(creditsData);
      }
      if (packsRes.ok) {
        const packsData = (await packsRes.json()) as { packs: CreditTopUpPack[] };
        setTopUpPacks(packsData.packs ?? []);
      }
    } catch {
      toast.error("Could not load billing status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBilling();
  }, [loadBilling]);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const topup = searchParams.get("topup");
    if (checkout === "success") {
      toast.success("Billing updated");
      void loadBilling();
    } else if (checkout === "canceled") {
      toast.message("Checkout canceled");
    } else if (topup === "success") {
      toast.success("Credits added to your workspace");
      void loadBilling();
    } else if (topup === "cancelled") {
      toast.message("Credit top-up canceled");
    }
  }, [searchParams, loadBilling]);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Could not open billing portal");
      }
      window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Portal unavailable");
      setPortalLoading(false);
    }
  }

  async function startTopUp(packId: string) {
    setTopUpPackId(packId);
    try {
      const res = await fetch("/api/billing/credits/top-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string; message?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.message ?? data.error ?? "Could not start checkout");
      }
      window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Top-up unavailable");
      setTopUpPackId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading billing…</p>;
  }

  if (!billing) {
    return <p className="text-sm text-muted-foreground">Billing unavailable.</p>;
  }

  const renewal = formatRenewalDate(billing.currentPeriodEnd);
  const showTopUps = billing.stripeConfigured && billing.canManageBilling && topUpPacks.length > 0;

  return (
    <div className="space-y-6">
      {credits != null && (
        <div className="paper-card p-6 space-y-4">
          <div className="flex items-start gap-3">
            <Coins className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 space-y-3">
              <div>
                <h2 className="font-semibold">AI credits</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Platform-key generations draw from your org credit balance.
                </p>
              </div>
              <div className="flex flex-wrap items-baseline gap-2">
                <p className="text-3xl font-bold tabular-nums">{credits.balance.toLocaleString()}</p>
                <span className="text-sm text-muted-foreground">credits available</span>
              </div>
              {credits.monthlyGrant > 0 && (
                <p className="text-sm text-muted-foreground">
                  {PLAN_LABELS[credits.plan as keyof typeof PLAN_LABELS] ?? credits.plan} plan includes{" "}
                  {credits.monthlyGrant.toLocaleString()} credits per month.
                </p>
              )}
              {showTopUps && (
                <div className="space-y-2 pt-2">
                  <p className="text-sm font-medium">Top up credits</p>
                  <div className="flex flex-wrap gap-2">
                    {topUpPacks.map((pack) => (
                      <Button
                        key={pack.id}
                        variant="outline"
                        size="sm"
                        disabled={topUpPackId !== null}
                        onClick={() => void startTopUp(pack.id)}
                      >
                        {topUpPackId === pack.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          pack.label
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="paper-card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <CreditCard className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="font-semibold">Plan</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Starter is free. Connect your own API key for unlimited AI generations.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <p className="text-2xl font-bold">{PLAN_LABELS.starter}</p>
              <Badge variant="secondary" className="gap-1">
                <KeyRound className="h-3 w-3" />
                BYOK
              </Badge>
              {billing.subscriptionStatus && (
                <Badge variant="outline" className="capitalize">
                  {statusLabel(billing.subscriptionStatus)}
                </Badge>
              )}
            </div>

            {renewal && billing.hasActiveSubscription && (
              <p className="text-sm text-muted-foreground">
                Legacy subscription renews on <span className="text-foreground">{renewal}</span>
              </p>
            )}

            <p className="text-sm text-muted-foreground">
              Add your Gemini or Bedrock key in{" "}
              <Link href="/settings?tab=ai" className="text-primary hover:underline">
                Settings → AI Providers
              </Link>
              . Paid upgrades are not available yet.
            </p>

            {usage && usage.quota != null && (
              <div className="rounded-lg border border-border p-4 space-y-2">
                <p className="text-sm font-medium">Platform key usage this month</p>
                <p className="text-sm text-muted-foreground">
                  Articles: {usage.articlesThisMonth} / {usage.quota}
                  {usage.quotaRemaining != null && ` (${usage.quotaRemaining} remaining)`}
                </p>
              </div>
            )}

            {billing.hasStripeCustomer && billing.canManageBilling && (
              <Button variant="outline" disabled={portalLoading} onClick={() => void openPortal()}>
                {portalLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Manage legacy subscription"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
