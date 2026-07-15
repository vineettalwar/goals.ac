"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { publicApiUrl } from "@/lib/marketing/site/public-api";
import { GeoAuditResultClient } from "@/components/marketing/pages/tools/geo-audit-result-client";
import type { GeoIssue } from "@/components/geo-audit/geo-audit-result-view";

type PublicGeoAudit = {
  id: number;
  url: string;
  geoScore: number;
  issues: GeoIssue[] | null;
  pageTitle: string | null;
  schemaTypes: string[] | null;
  websiteProjectId: number | null;
};

export function GeoAuditResultLoader({ id }: { id: string }) {
  const [audit, setAudit] = useState<PublicGeoAudit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const numericId = Number(id);
    if (!Number.isFinite(numericId) || numericId < 1) {
      setError("Invalid audit id");
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(publicApiUrl(`/api/public/geo-audits/${numericId}`));
        const data = (await res.json().catch(() => null)) as PublicGeoAudit & { error?: string } | null;
        if (cancelled) return;
        if (!res.ok) {
          setError(data?.error ?? "GEO audit not found");
          return;
        }
        setAudit(data);
      } catch {
        if (!cancelled) setError("Failed to load audit results.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-3 text-white/70">
        <Spinner size="sm" />
        Loading audit…
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center space-y-4">
        <p className="text-white/80">{error ?? "GEO audit not found"}</p>
        <Button asChild variant="secondary">
          <Link href="/geo-audit">Run a new audit</Link>
        </Button>
      </div>
    );
  }

  return (
    <GeoAuditResultClient
      url={audit.url}
      geoScore={audit.geoScore}
      issues={(audit.issues ?? []) as GeoIssue[]}
      pageTitle={audit.pageTitle}
      schemaTypes={audit.schemaTypes ?? []}
      projectId={audit.websiteProjectId}
    />
  );
}
