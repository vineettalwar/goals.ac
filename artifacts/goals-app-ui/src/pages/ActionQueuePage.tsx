import { useCallback, useEffect, useState } from "react";
import { SectionShell } from "@/components/SectionShell";
import { useActiveProject } from "@/hooks/use-active-project";
import { apiFetch } from "@/lib/api";
import { searchTabs } from "@/pages/section-page-shared";

type Evidence = { source?: string; detail?: string; url?: string };

type ActionItem = {
  id: number;
  actionType: string;
  title: string;
  keyword: string;
  url: string | null;
  evidence: Evidence[] | null;
  estimatedImpact: number;
  confidence: number;
  effort: string;
  status: string;
  opportunityScore: number;
  lastRunId: number | null;
};

type AgentRun = {
  id: number;
  status: string;
  stopReason: string | null;
  trajectory: Array<{
    tool?: string;
    decision?: string;
    summary?: string;
    ok?: boolean;
    evidenceRefs?: Array<{ source: string; verified: boolean }>;
  }>;
};

export function ActionQueuePage() {
  const { projectId } = useActiveProject();
  const [items, setItems] = useState<ActionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [openRun, setOpenRun] = useState<AgentRun | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ items: ActionItem[] }>(
        `/api/website-projects/${projectId}/agent-actions`,
      );
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load actions");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function sync() {
    if (!projectId) return;
    setBusyId(-1);
    try {
      await apiFetch(`/api/website-projects/${projectId}/agent-actions/sync`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusyId(null);
    }
  }

  async function run(id: number) {
    if (!projectId) return;
    setBusyId(id);
    try {
      await apiFetch(`/api/website-projects/${projectId}/agent-actions/${id}/run`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Run failed");
    } finally {
      setBusyId(null);
    }
  }

  async function patch(id: number, status: "approved" | "dismissed") {
    if (!projectId) return;
    setBusyId(id);
    try {
      await apiFetch(`/api/website-projects/${projectId}/agent-actions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function showRun(runId: number) {
    try {
      const data = await apiFetch<{ run: AgentRun }>(`/api/agent-runs/${runId}`);
      setOpenRun(data.run);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Run lookup failed");
    }
  }

  return (
    <SectionShell
      title="Action queue"
      description="Scored SEO work with evidence. Run with the employee loop, or approve for a human later."
      tabs={searchTabs}
    >
      <div>
        {!projectId ? (
          <p className="text-sm text-muted-foreground">Select a project.</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="border px-3 py-1 text-sm"
                disabled={busyId !== null}
                onClick={() => void sync()}
              >
                {busyId === -1 ? "Scoring…" : "Score from GSC"}
              </button>
              <button type="button" className="border px-3 py-1 text-sm" onClick={() => void load()}>
                Reload
              </button>
            </div>
            {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
            {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
            {items.length === 0 && !loading ? (
              <p className="text-sm text-muted-foreground">
                No actions yet. Connect Search Console, then score. Weekly opportunity/decay jobs also fill this list.
              </p>
            ) : (
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.id} className="border p-3 text-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <strong>{item.title}</strong>
                      <span>
                        {item.actionType} · {item.status} · score {item.opportunityScore}
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {item.keyword}
                      {item.url ? ` · ${item.url}` : ""} · impact {item.estimatedImpact} · confidence{" "}
                      {item.confidence} · effort {item.effort}
                    </p>
                    <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                      {(item.evidence ?? []).slice(0, 4).map((ev, idx) => (
                        <li key={idx}>
                          {ev.source}: {ev.detail}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="border px-2 py-1"
                        disabled={busyId !== null}
                        onClick={() => void run(item.id)}
                      >
                        Run with agent
                      </button>
                      <button
                        type="button"
                        className="border px-2 py-1"
                        disabled={busyId !== null}
                        onClick={() => void patch(item.id, "approved")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="border px-2 py-1"
                        disabled={busyId !== null}
                        onClick={() => void patch(item.id, "dismissed")}
                      >
                        Dismiss
                      </button>
                      {item.lastRunId ? (
                        <button type="button" className="border px-2 py-1" onClick={() => void showRun(item.lastRunId!)}>
                          Trajectory
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {openRun ? (
              <div className="mt-6 border p-3 text-sm">
                <div className="mb-2 flex justify-between">
                  <strong>
                    Run {openRun.id} · {openRun.status}
                  </strong>
                  <button type="button" className="border px-2 py-1" onClick={() => setOpenRun(null)}>
                    Close
                  </button>
                </div>
                {openRun.stopReason ? <p className="mb-2">{openRun.stopReason}</p> : null}
                <ol className="list-decimal space-y-1 pl-5">
                  {openRun.trajectory.map((step, idx) => (
                    <li key={idx}>
                      {step.tool ?? "stop"} — {step.decision}
                      {step.summary ? ` (${step.summary})` : ""}
                      {step.evidenceRefs?.some((ref) => ref.verified)
                        ? " · verified evidence"
                        : ""}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </>
        )}
      </div>
    </SectionShell>
  );
}
