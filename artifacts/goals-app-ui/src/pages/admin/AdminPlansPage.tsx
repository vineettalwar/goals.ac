import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { PLAN_IDS, PLAN_LABELS, type PlanId } from "@/lib/billing/plans";

type PlanQuotaLimits = {
  articles: number | null;
  roadmaps: number | null;
  sites: number | null;
};

type LimitsState = Record<PlanId, PlanQuotaLimits>;

export function AdminPlansPage() {
  const [limits, setLimits] = useState<LimitsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingPlan, setSavingPlan] = useState<PlanId | null>(null);

  const loadLimits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ limits: LimitsState }>("/api/admin/plan-quotas");
      setLimits(data.limits);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load plan quotas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLimits();
  }, [loadLimits]);

  async function savePlan(plan: PlanId) {
    if (!limits) return;
    setSavingPlan(plan);
    try {
      await apiFetch("/api/admin/plan-quotas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, limits: limits[plan] }),
      });
      await loadLimits();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingPlan(null);
    }
  }

  if (loading) return <p className="p-8 text-muted-foreground">Loading plan quotas…</p>;
  if (error) return <p className="p-8 text-destructive">{error}</p>;
  if (!limits) return null;

  return (
    <div className="max-w-5xl space-y-6 px-8 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plans & quotas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Platform article and roadmap limits per plan tier.</p>
      </div>
      {PLAN_IDS.map((plan) => (
        <section key={plan} className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-medium">{PLAN_LABELS[plan]}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {(["sites", "articles", "roadmaps"] as const).map((field) => (
              <label key={field} className="block text-sm">
                <span className="mb-1 block capitalize text-muted-foreground">{field}</span>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded-md border border-border bg-background px-3 py-2"
                  value={limits[plan][field] ?? ""}
                  onChange={(event) => {
                    const raw = event.target.value;
                    setLimits((prev) =>
                      prev
                        ? {
                            ...prev,
                            [plan]: {
                              ...prev[plan],
                              [field]: raw === "" ? null : Number.parseInt(raw, 10),
                            },
                          }
                        : prev,
                    );
                  }}
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            disabled={savingPlan === plan}
            onClick={() => void savePlan(plan)}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {savingPlan === plan ? "Saving…" : "Save"}
          </button>
        </section>
      ))}
    </div>
  );
}
