"use client";

import { useCallback, useEffect, useState } from "react";
import { useActiveProject } from "@/context/use-active-project";

type ActionItem = {
  id: number;
  actionType: string;
  title: string;
  keyword: string;
  url: string | null;
  evidence: Array<{ source?: string; detail?: string }> | null;
  estimatedImpact: number;
  confidence: number;
  effort: string;
  status: string;
  opportunityScore: number;
};

export function ActionQueuePanel() {
  const { activeProjectId } = useActiveProject();
  const projectId = activeProjectId != null ? String(activeProjectId) : "";
  const [items, setItems] = useState<ActionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!projectId) return;
    const res = await fetch(`/api/website-projects/${projectId}/agent-actions`);
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    const data = (await res.json()) as { items?: ActionItem[] };
    setItems(data.items ?? []);
    setError(null);
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!projectId) return <p className="text-sm text-muted-foreground">Select a project.</p>;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          className="border px-3 py-1 text-sm"
          disabled={busy}
          onClick={() => {
            void (async () => {
              setBusy(true);
              try {
                await fetch(`/api/website-projects/${projectId}/agent-actions/sync`, { method: "POST" });
                await load();
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          Score from GSC
        </button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No actions yet.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.id} className="border p-3">
              <strong>{item.title}</strong>
              <p>
                {item.actionType} · {item.status} · score {item.opportunityScore}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
