"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, TrendingDown, EyeOff, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useActiveProject } from "@/context/use-active-project";
import type { RefreshQueueItem } from "@workspace/content-engine/strategy/refresh-queue-service";

const KIND_META: Record<
  RefreshQueueItem["kind"],
  { label: string; icon: typeof RefreshCw }
> = {
  content_refresh: { label: "Decay", icon: TrendingDown },
  rank_drop: { label: "Rank drop", icon: TrendingDown },
  rank_alert: { label: "Rank alert", icon: AlertTriangle },
  ai_visibility_miss: { label: "AI miss", icon: EyeOff },
};

function optimizeHref(projectId: string, item: RefreshQueueItem): string {
  const params = new URLSearchParams({
    optimize: "1",
    keyword: item.keyword,
  });
  if (item.url) params.set("url", item.url);
  return `/projects/${projectId}/content-studio?${params.toString()}`;
}

export function RefreshQueuePanel({ embedded = false }: { embedded?: boolean }) {
  const { activeProjectId } = useActiveProject();
  const projectId = activeProjectId != null ? String(activeProjectId) : "";
  const [items, setItems] = useState<RefreshQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/website-projects/${projectId}/refresh-queue`);
      if (!res.ok) throw new Error("Failed to load refresh queue");
      const data = (await res.json()) as { items: RefreshQueueItem[] };
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!projectId) {
    return (
      <div className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
        Select a project to see pages that need a refresh.
      </div>
    );
  }

  return (
    <div className={embedded ? "space-y-4" : "space-y-6 p-6"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Refresh queue
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Diagnose → Fix → Stay. Decay, rank drops, and AI citation misses in one list. Open Optimize
            page to import, score, Fix gaps, then update WordPress.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? <Spinner className="h-4 w-4" /> : "Refresh"}
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {loading && items.length === 0 ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-10 space-y-3">
          <p className="text-sm text-muted-foreground max-w-md">
            Nothing queued yet. Connect Search Console for decay signals, track keywords for rank
            alerts, or run visibility checks.
          </p>
          <Button asChild>
            <Link href={`/projects/${projectId}/content-studio?optimize=1`}>Optimize a page</Link>
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {items.map((item) => {
            const meta = KIND_META[item.kind];
            const Icon = meta.icon;
            return (
              <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {meta.label}
                    {item.url ? ` · ${item.url}` : ""} · {item.detail}
                  </p>
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">{item.score}</span>
                <Button asChild size="sm" variant="secondary">
                  <Link href={optimizeHref(projectId, item)}>Optimize</Link>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
