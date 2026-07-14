"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, FileText, Globe, Info, KeyRound, Loader2, Map } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OFFERED_PLAN_IDS, PLAN_IDS, PLAN_LABELS, type PlanId } from "@/lib/billing/plans";

type PlanQuotaLimits = {
  articles: number | null;
  roadmaps: number | null;
  sites: number | null;
};

type LimitsState = Record<PlanId, PlanQuotaLimits>;

const QUOTA_ROWS = [
  { key: "sites" as const, label: "Sites", icon: Globe, field: "sites" as const },
  {
    key: "articles" as const,
    label: "Articles / month (platform key)",
    icon: FileText,
    field: "articles" as const,
  },
  {
    key: "roadmaps" as const,
    label: "Roadmaps / month (platform key)",
    icon: Map,
    field: "roadmaps" as const,
  },
];

function isOffered(plan: PlanId): boolean {
  return (OFFERED_PLAN_IDS as readonly PlanId[]).includes(plan);
}

function quotaInputValue(value: number | null): string {
  return value === null ? "" : String(value);
}

function parseQuotaInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function PlansSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-48 rounded-xl bg-secondary/50" />
      ))}
    </div>
  );
}

export function AdminPlansPanel() {
  const [limits, setLimits] = useState<LimitsState | null>(null);
  const [drafts, setDrafts] = useState<LimitsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState<PlanId | null>(null);

  const loadLimits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/plan-quotas");
      if (!res.ok) throw new Error("Failed to load");
      const data = (await res.json()) as { limits: LimitsState };
      setLimits(data.limits);
      setDrafts(data.limits);
    } catch {
      toast.error("Could not load plan quotas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLimits();
  }, [loadLimits]);

  function updateDraft(planId: PlanId, field: keyof PlanQuotaLimits, raw: string) {
    setDrafts((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [planId]: {
          ...prev[planId],
          [field]: parseQuotaInput(raw),
        },
      };
    });
  }

  function planDirty(planId: PlanId): boolean {
    if (!limits || !drafts) return false;
    const current = limits[planId];
    const draft = drafts[planId];
    return (
      current.articles !== draft.articles ||
      current.roadmaps !== draft.roadmaps ||
      current.sites !== draft.sites
    );
  }

  async function savePlan(planId: PlanId) {
    if (!drafts) return;
    setSavingPlan(planId);
    try {
      const res = await fetch("/api/admin/plan-quotas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, limits: drafts[planId] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? "Save failed");
      }
      const saved = (data as { limits: LimitsState }).limits;
      setLimits(saved);
      setDrafts(saved);
      toast.success(`${PLAN_LABELS[planId]} quotas saved`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save quotas");
    } finally {
      setSavingPlan(null);
    }
  }

  if (loading || !drafts) {
    return (
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <PlansSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1 space-y-4">
        {PLAN_IDS.map((planId) => {
          const offered = isOffered(planId);
          const dirty = planDirty(planId);

          return (
            <Card
              key={planId}
              className={`overflow-hidden ${offered ? "ring-1 ring-primary/20" : "opacity-90"}`}
            >
              {offered && <div className="h-1 bg-primary" />}
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{PLAN_LABELS[planId]}</CardTitle>
                    <CardDescription className="mt-1.5">
                      {offered
                        ? "Active plan — free with BYOK for unlimited AI generations."
                        : "Reserved tier — configure quotas before offering this plan."}
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {offered && (
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        <KeyRound className="h-3 w-3" />
                        BYOK
                      </Badge>
                    )}
                    {!offered && (
                      <Badge variant="outline" className="text-[10px]">
                        Future
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {QUOTA_ROWS.map(({ key, label, icon: Icon, field }) => (
                    <div key={key} className="flex items-center gap-3">
                      <Label
                        htmlFor={`${planId}-${field}`}
                        className="flex min-w-0 flex-1 items-center gap-2 text-sm text-muted-foreground"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary/80">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="truncate">{label}</span>
                      </Label>
                      <Input
                        id={`${planId}-${field}`}
                        type="number"
                        min={0}
                        placeholder="Unlimited"
                        className="w-28 tabular-nums"
                        value={quotaInputValue(drafts[planId][field])}
                        onChange={(e) => updateDraft(planId, field, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground">
                    Leave blank for unlimited (platform key). BYOK always bypasses quotas.
                  </p>
                  <Button
                    size="sm"
                    disabled={!dirty || savingPlan === planId}
                    onClick={() => void savePlan(planId)}
                  >
                    {savingPlan === planId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <aside className="shrink-0 space-y-4 lg:w-72">
        <Card className="border-primary/15 bg-primary/3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-primary" />
              All organizations
            </CardTitle>
            <CardDescription>
              New orgs are onboarded on Starter. Manage accounts from the{" "}
              <Link
                href="/admin/organizations"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Organizations
              </Link>{" "}
              directory.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Info className="h-4 w-4 text-muted-foreground" />
              Quota model
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              Changes apply immediately to platform-key generations. Customers with BYOK are not
              limited by these quotas.
            </CardDescription>
          </CardHeader>
        </Card>
      </aside>
    </div>
  );
}
