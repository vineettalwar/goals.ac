"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { contentPiecePath } from "@/lib/projects/content-piece-path";
import { toast } from "sonner";
import { BarChart3, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PLATFORMS = [
  { id: "all", label: "All platforms" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "twitter", label: "X / Twitter" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "bluesky", label: "Bluesky" },
  { id: "mastodon", label: "Mastodon" },
] as const;

type MetricsRow = {
  contentPieceId: number;
  title: string;
  platform: string;
  publishedUrl: string | null;
  scheduledAt: string | null;
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  clicks: number | null;
  syncedAt: string | null;
};

type MetricsResponse = {
  rows: MetricsRow[];
  totals: {
    impressions: number | null;
    likes: number | null;
    comments: number | null;
    shares: number | null;
    clicks: number | null;
  };
};

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString();
}

export function SocialAnalyticsPanel({ projectId }: { projectId: string }) {
  const [platformFilter, setPlatformFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [data, setData] = useState<MetricsResponse | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/website-projects/${projectId}/social/metrics/sync`);
      if (res.ok) {
        const status = (await res.json()) as { lastSyncedAt?: string | null };
        setLastSyncedAt(status.lastSyncedAt ?? null);
      }
    } catch {
      /* optional */
    }
  }, [projectId]);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const qs =
        platformFilter !== "all" ? `?platform=${encodeURIComponent(platformFilter)}` : "";
      const res = await fetch(`/api/website-projects/${projectId}/social/metrics${qs}`);
      if (!res.ok) throw new Error("Failed to load metrics");
      const json = (await res.json()) as MetricsResponse;
      setData(json);
    } catch {
      toast.error("Could not load social analytics");
    } finally {
      setLoading(false);
    }
  }, [projectId, platformFilter]);

  useEffect(() => {
    void loadStatus();
    void loadMetrics();
  }, [loadStatus, loadMetrics]);

  async function syncMetrics() {
    setSyncing(true);
    try {
      const res = await fetch(`/api/website-projects/${projectId}/social/metrics/sync`, {
        method: "POST",
      });
      const body = (await res.json()) as { error?: string; rowsUpserted?: number };
      if (!res.ok) throw new Error(body.error ?? "Sync failed");
      toast.success(`Synced ${body.rowsUpserted ?? 0} posts`);
      await loadStatus();
      await loadMetrics();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  const totals = data?.totals;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLATFORMS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => void syncMetrics()} disabled={syncing}>
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
          Sync metrics
        </Button>
        {lastSyncedAt && (
          <span className="text-xs text-muted-foreground">
            Last synced {new Date(lastSyncedAt).toLocaleString()}
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Impressions", value: totals?.impressions },
          { label: "Likes", value: totals?.likes },
          { label: "Comments", value: totals?.comments },
          { label: "Shares", value: totals?.shares },
        ].map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-2xl">{fmt(card.value)}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading analytics…
        </div>
      ) : !data?.rows.length ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground space-y-2">
            <BarChart3 className="h-8 w-8 mx-auto opacity-40" />
            <p>No published social posts with metrics yet.</p>
            <p>
              Publish from the queue, then sync.{" "}
              <Link href="/integrations" className="text-primary hover:underline">
                Connect social accounts
              </Link>
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3 font-medium">Post</th>
                <th className="p-3 font-medium">Platform</th>
                <th className="p-3 font-medium text-right">Impr.</th>
                <th className="p-3 font-medium text-right">Likes</th>
                <th className="p-3 font-medium text-right">Comments</th>
                <th className="p-3 font-medium text-right">Shares</th>
                <th className="p-3 font-medium text-right">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={`${row.contentPieceId}-${row.platform}`} className="border-t">
                  <td className="p-3">
                    <Link href={contentPiecePath(projectId, row.contentPieceId)} className="hover:underline font-medium">
                      {row.title}
                    </Link>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">{row.platform}</Badge>
                  </td>
                  <td className="p-3 text-right tabular-nums">{fmt(row.impressions)}</td>
                  <td className="p-3 text-right tabular-nums">{fmt(row.likes)}</td>
                  <td className="p-3 text-right tabular-nums">{fmt(row.comments)}</td>
                  <td className="p-3 text-right tabular-nums">{fmt(row.shares)}</td>
                  <td className="p-3 text-right tabular-nums">{fmt(row.clicks)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
