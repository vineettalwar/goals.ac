"use client";

import { useCallback, useEffect, useState } from "react";
import { AgentRunInspector, type AgentRunView } from "./agent-run-inspector";

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

type RunListItem = {
  id: number;
  status: string;
  stopReason: string | null;
  goalKind: string;
  creditsSpent: number;
  failed: boolean;
  awaitingApproval: boolean;
  stepCount: number;
  lastStep: { tool?: string; decision?: string; summary?: string; ok?: boolean } | null;
  pendingApproval: { tool: string; reason: string } | null;
};

type ActionQueueWorkspaceProps = {
  projectId: string;
  request: (path: string, init?: RequestInit) => Promise<Response>;
};

async function readJson<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => null)) as T & { error?: string };
  if (!res.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : `Request failed (${res.status})`);
  }
  return data;
}

export function ActionQueueWorkspace({ projectId, request }: ActionQueueWorkspaceProps) {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [runs, setRuns] = useState<RunListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [openRun, setOpenRun] = useState<AgentRunView | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [actionsRes, runsRes] = await Promise.all([
        request(`/api/website-projects/${projectId}/agent-actions`),
        request(`/api/website-projects/${projectId}/agent-runs`),
      ]);
      const actionsData = await readJson<{ items?: ActionItem[] }>(actionsRes);
      const runsData = await readJson<{ runs?: RunListItem[] }>(runsRes);
      setItems(actionsData.items ?? []);
      setRuns(runsData.runs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load actions");
    } finally {
      setLoading(false);
    }
  }, [projectId, request]);

  useEffect(() => {
    void load();
  }, [load]);

  async function sync() {
    if (!projectId) return;
    setBusyId(-1);
    try {
      await readJson(await request(`/api/website-projects/${projectId}/agent-actions/sync`, { method: "POST" }));
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
      await readJson(
        await request(`/api/website-projects/${projectId}/agent-actions/${id}/run`, { method: "POST" }),
      );
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
      await readJson(
        await request(`/api/website-projects/${projectId}/agent-actions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }),
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function showRun(runId: number) {
    try {
      const data = await readJson<{ run: AgentRunView }>(await request(`/api/agent-runs/${runId}`));
      setOpenRun(data.run);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Run lookup failed");
    }
  }

  if (!projectId) {
    return <p className="text-sm text-muted-foreground">Select a project.</p>;
  }

  const inspectableRuns = runs.filter((row) => row.failed || row.awaitingApproval || row.status === "running");

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className="border border-border px-3 py-1 text-sm" disabled={busyId !== null} onClick={() => void sync()}>
          {busyId === -1 ? "Scoring…" : "Score from GSC"}
        </button>
        <button type="button" className="border border-border px-3 py-1 text-sm" onClick={() => void load()}>
          Reload
        </button>
      </div>
      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

      {inspectableRuns.length > 0 ? (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-medium">Recent loop runs</h2>
          <ul className="space-y-2">
            {inspectableRuns.map((row) => (
              <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-2 border border-border p-2 text-sm">
                <span>
                  #{row.id} · {row.goalKind} · {row.status}
                  {row.stopReason ? ` — ${row.stopReason}` : ""}
                </span>
                <button type="button" className="border border-border px-2 py-1" onClick={() => void showRun(row.id)}>
                  Trajectory
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {items.length === 0 && !loading ? (
        <p className="text-sm text-muted-foreground">
          No actions yet. Connect Search Console, then score. Weekly opportunity/decay jobs also fill this list.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="border border-border p-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <strong>{item.title}</strong>
                <span>
                  {item.actionType} · {item.status} · score {item.opportunityScore}
                </span>
              </div>
              <p className="mt-1 text-muted-foreground">
                {item.keyword}
                {item.url ? ` · ${item.url}` : ""} · impact {item.estimatedImpact} · confidence {item.confidence} ·
                effort {item.effort}
              </p>
              <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                {(item.evidence ?? []).slice(0, 4).map((ev) => (
                  <li key={`${ev.source ?? ""}:${ev.detail ?? ""}`}>
                    {ev.source}: {ev.detail}
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className="border border-border px-2 py-1" disabled={busyId !== null} onClick={() => void run(item.id)}>
                  Run with agent
                </button>
                <button
                  type="button"
                  className="border border-border px-2 py-1"
                  disabled={busyId !== null}
                  onClick={() => void patch(item.id, "approved")}
                >
                  Approve / release
                </button>
                <button
                  type="button"
                  className="border border-border px-2 py-1"
                  disabled={busyId !== null}
                  onClick={() => void patch(item.id, "dismissed")}
                >
                  Dismiss
                </button>
                {item.lastRunId ? (
                  <button type="button" className="border border-border px-2 py-1" onClick={() => void showRun(item.lastRunId!)}>
                    Trajectory
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {openRun ? <AgentRunInspector run={openRun} onClose={() => setOpenRun(null)} /> : null}
    </div>
  );
}
