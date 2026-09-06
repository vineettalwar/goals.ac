"use client";

import { useCallback, useEffect, useState } from "react";
import { ScanSearch } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { useActiveProject } from "@/context/use-active-project";

type AuditSummary = {
  id: number;
  startUrl: string;
  status: string;
  pagesCrawled: number;
  crawlComplete: boolean;
  errorMessage: string | null;
  createdAt: string;
};

type Issue = {
  id: number;
  issueType: string;
  severity: string;
  pageUrl: string;
  title: string;
  explanation: string;
  howToFix: string;
};

export function SiteAuditPanel() {
  const { activeProjectId } = useActiveProject();
  const [audits, setAudits] = useState<AuditSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadAudits = useCallback(async () => {
    if (!activeProjectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/website-projects/${activeProjectId}/site-audits`);
      if (!res.ok) throw new Error("Failed to load audits");
      const data = await res.json();
      setAudits(data.audits ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load audits");
    } finally {
      setLoading(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    void loadAudits();
  }, [loadAudits]);

  const loadDetail = async (auditId: number) => {
    if (!activeProjectId) return;
    setSelectedId(auditId);
    setDetailLoading(true);
    try {
      const res = await fetch(
        `/api/website-projects/${activeProjectId}/site-audits/${auditId}`,
      );
      if (!res.ok) throw new Error("Failed to load audit");
      const data = await res.json();
      setIssues(data.issues ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load audit");
    } finally {
      setDetailLoading(false);
    }
  };

  const startAudit = async () => {
    if (!activeProjectId) return;
    setRunning(true);
    try {
      const res = await fetch(`/api/website-projects/${activeProjectId}/site-audits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sync: true, maxPages: 30 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Audit failed");
      toast.success(
        data.status === "done"
          ? `Crawled ${data.pagesCrawled ?? 0} pages`
          : "Site audit started",
      );
      await loadAudits();
      if (data.id) await loadDetail(data.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Audit failed");
    } finally {
      setRunning(false);
    }
  };

  if (!activeProjectId) return null;

  const severityClass = (s: string) =>
    s === "critical"
      ? "destructive"
      : s === "warning"
        ? "secondary"
        : "outline";

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <ScanSearch className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Technical site audit</h2>
            <p className="text-sm text-muted-foreground">
              Multi-page crawl for broken links, duplicates, redirects, and blocked pages.
              Distinct from the single-URL GEO audit.
            </p>
          </div>
        </div>
        <Button onClick={() => void startAudit()} disabled={running}>
          {running ? <Spinner className="mr-2 h-4 w-4" /> : null}
          Run audit
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : audits.length === 0 ? (
        <p className="text-sm text-muted-foreground">No site audits yet.</p>
      ) : (
        <ul className="space-y-2">
          {audits.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-muted/40"
                onClick={() => void loadDetail(a.id)}
              >
                <span className="truncate">
                  #{a.id} · {a.startUrl} · {a.pagesCrawled} pages · {a.status}
                </span>
                <Badge variant="outline">{a.status}</Badge>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedId !== null ? (
        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-medium">Issues for audit #{selectedId}</h3>
          {detailLoading ? (
            <Spinner />
          ) : issues.length === 0 ? (
            <p className="text-sm text-muted-foreground">No issues recorded.</p>
          ) : (
            <ul className="max-h-96 space-y-3 overflow-y-auto">
              {issues.map((issue) => (
                <li key={issue.id} className="rounded-md border border-border p-3 text-sm">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge variant={severityClass(issue.severity) as "destructive" | "secondary" | "outline"}>
                      {issue.severity}
                    </Badge>
                    <span className="font-medium">{issue.title}</span>
                  </div>
                  <p className="text-muted-foreground">{issue.explanation}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{issue.pageUrl}</p>
                  <p className="mt-2 text-xs">
                    <span className="font-medium">Fix: </span>
                    {issue.howToFix}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
