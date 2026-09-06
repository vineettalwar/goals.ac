"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { useActiveProject } from "@/context/use-active-project";

type BacklinksOverview = {
  target: string;
  fetchedAt: string;
  configured: true;
  summary: {
    rank: number | null;
    backlinks: number | null;
    referringDomains: number | null;
    referringPages: number | null;
    brokenBacklinks: number | null;
    spamScore: number | null;
  };
  referringDomains: Array<{
    domain: string;
    backlinks: number | null;
    rank: number | null;
    firstSeen: string | null;
  }>;
  costEstimateUsd: number;
};

export function BacklinksOverviewPanel() {
  const { activeProjectId } = useActiveProject();
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<BacklinksOverview | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  const refresh = async () => {
    if (!activeProjectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/website-projects/${activeProjectId}/backlinks`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as Partial<BacklinksOverview> & {
        error?: string;
        configured?: boolean;
      };

      if (res.status === 503 && data.configured === false) {
        setNotConfigured(true);
        setOverview(null);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch backlinks");

      setNotConfigured(false);
      setOverview(data);
      toast.success("Backlinks refreshed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch backlinks");
    } finally {
      setLoading(false);
    }
  };

  if (!activeProjectId) return null;

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link2 className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Backlinks overview</h2>
            <p className="text-sm text-muted-foreground">
              Live backlink profile: referring domains, total links, and authority signals.
            </p>
          </div>
        </div>
        <Button onClick={() => void refresh()} disabled={loading}>
          {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
          Refresh
        </Button>
      </div>

      {notConfigured ? (
        <div className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          Backlinks provider is not configured. Add{" "}
          <code className="font-mono text-xs">DATAFORSEO_LOGIN</code> and{" "}
          <code className="font-mono text-xs">DATAFORSEO_PASSWORD</code> to enable this feature.
        </div>
      ) : overview === null ? (
        <p className="text-sm text-muted-foreground">
          Click Refresh to load your backlink profile.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Metric label="Backlinks" value={overview.summary.backlinks} />
            <Metric label="Referring domains" value={overview.summary.referringDomains} />
            <Metric label="Referring pages" value={overview.summary.referringPages} />
            <Metric label="Rank" value={overview.summary.rank} />
            <Metric label="Broken" value={overview.summary.brokenBacklinks} negative />
            <Metric label="Spam score" value={overview.summary.spamScore} negative />
          </div>

          {overview.referringDomains.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Domain</th>
                    <th className="pb-2 pr-4 font-medium text-right">Backlinks</th>
                    <th className="pb-2 pr-4 font-medium text-right">Rank</th>
                    <th className="pb-2 font-medium">First seen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {overview.referringDomains.map((row) => (
                    <tr key={row.domain}>
                      <td className="py-2 pr-4 font-medium">{row.domain || "—"}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {row.backlinks != null ? row.backlinks.toLocaleString() : "—"}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {row.rank != null ? (
                          <Badge variant="outline">{row.rank}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {row.firstSeen ? new Date(row.firstSeen).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No referring domains returned.</p>
          )}

          <p className="text-xs text-muted-foreground">
            Target {overview.target} · ~${overview.costEstimateUsd.toFixed(2)}/refresh ·{" "}
            {new Date(overview.fetchedAt).toLocaleString()}
          </p>
        </div>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  negative,
}: {
  label: string;
  value: number | null;
  negative?: boolean;
}) {
  const colour =
    negative && value != null && value > 0
      ? "text-red-600 dark:text-red-400"
      : "";
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${colour}`}>
        {value != null ? value.toLocaleString() : "—"}
      </p>
    </div>
  );
}
