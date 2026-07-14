"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { PageSkeleton } from "@/components/page-skeleton";
import { useActiveProject } from "@/context/active-project";
import { useProjectContent } from "@/lib/queries";
import { normalizeHttpUrl } from "@/lib/utils/normalize-url";

const CHECKS = ["Title & Meta", "Schema.org", "H1/H2 structure", "Open Graph"];

export function GeoAuditPanel({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const { activeProjectId, activeProject, isLoading: projectLoading } = useActiveProject();
  const projectId = activeProjectId != null ? String(activeProjectId) : "";
  const { data: projectContent, isLoading, refetch } = useProjectContent(projectId);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeProject?.url && !url) {
      setUrl(normalizeHttpUrl(activeProject.url));
    }
  }, [activeProject?.url, url]);

  async function handleAudit(e: React.FormEvent) {
    e.preventDefault();
    const auditUrl = normalizeHttpUrl(url);
    if (!auditUrl) return;
    setLoading(true);

    try {
      const res = await fetch("/api/geo-audits/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: auditUrl,
          websiteProjectId: activeProjectId ?? undefined,
        }),
      });

      const data = (await res.json().catch(() => null)) as { id?: number; audit?: { id?: number }; error?: string } | null;

      if (!res.ok) {
        toast.error(data?.error ?? "Audit failed — please check the URL and try again");
        return;
      }

      void refetch();
      router.push(`/audit/${data?.id ?? data?.audit?.id}`);
    } catch {
      toast.error("Audit failed — network error, please try again");
    } finally {
      setLoading(false);
    }
  }

  if (!activeProjectId) {
    if (projectLoading) {
      return <PageSkeleton />;
    }

    return (
      <div className={embedded ? "max-w-3xl" : "px-8 py-8 max-w-3xl"}>
        <p className="text-sm text-muted-foreground">
          Select a project to run GEO audits and track technical AI visibility scores.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return <PageSkeleton />;
  }

  const geoAudits =
    (projectContent?.geoAudits as Array<{ id: number; url: string; geoScore: number; createdAt: string }>) ??
    [];

  return (
    <div className={embedded ? "max-w-3xl space-y-8" : "px-8 py-8 max-w-3xl space-y-8"}>
      <div className="paper-card rounded-xl p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold">Run GEO audit</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Scan schema, metadata, and page structure that influence AI search citation.
          </p>
        </div>
        <form onSubmit={handleAudit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="geo-audit-url">Page URL</Label>
            <Input
              id="geo-audit-url"
              type="url"
              placeholder="https://yoursite.com/your-page"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Spinner size="sm" /> Auditing…
              </>
            ) : (
              <>
                <Search className="h-4 w-4" /> Run GEO audit
              </>
            )}
          </Button>
        </form>
        <div className="flex flex-wrap gap-2 pt-1">
          {CHECKS.map((check) => (
            <span
              key={check}
              className="rounded-full border border-border bg-secondary/50 px-2.5 py-0.5 text-xs text-muted-foreground"
            >
              {check}
            </span>
          ))}
        </div>
      </div>

      {geoAudits.length > 0 && (
        <div className="paper-card rounded-xl p-6">
          <h3 className="font-semibold mb-4">Recent audits</h3>
          <div className="divide-y divide-border">
            {geoAudits.map((audit) => (
              <div key={audit.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {audit.url.replace(/^https?:\/\//, "")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(audit.createdAt).toLocaleDateString()} · Score{" "}
                    <span className="font-semibold text-foreground">{audit.geoScore}/100</span>
                  </p>
                </div>
                <Button size="sm" variant="ghost" asChild>
                  <Link href={`/audit/${audit.id}`}>
                    View
                    <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
