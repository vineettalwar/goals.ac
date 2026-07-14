"use client";

import Link from "next/link";
import { Link2, Network } from "lucide-react";
import { FeatureStatusBadge } from "@/components/shared/feature-status-badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import { useActiveProject } from "@/context/use-active-project";
import { useInternalLinks } from "@/lib/queries";

type LinkData = {
  coverageScore: number;
  pageCount: number;
  orphanCount: number;
  orphans: { title: string; slug: string }[];
  suggestions: {
    fromTitle: string | null;
    anchorText: string;
    suggestedSlug: string;
    rationale: string;
  }[];
};

export function InternalLinksPanel({ embedded = false }: { embedded?: boolean }) {
  const { activeProjectId, isLoading: projectLoading } = useActiveProject();
  const { data, isLoading } = useInternalLinks(activeProjectId);
  const linkData = (data as LinkData | undefined) ?? null;

  if (!activeProjectId) {
    if (projectLoading) {
      return <PageSkeleton />;
    }

    return (
      <div className={embedded ? "max-w-3xl" : "px-8 py-8 max-w-3xl"}>
        {!embedded ? <h1 className="text-2xl font-bold mb-2">Internal Link Hub</h1> : null}
        <p className="text-muted-foreground mb-4">Select a project to analyze internal linking.</p>
        <Button asChild><Link href="/projects">Go to projects</Link></Button>
      </div>
    );
  }

  return (
    <div className={embedded ? "space-y-6" : "px-8 py-8 max-w-4xl space-y-6"}>
      {!embedded ? (
        <div className="flex items-center gap-3">
          <Network className="h-6 w-6 text-primary" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Internal Link Hub</h1>
              <FeatureStatusBadge status="beta" />
            </div>
            <p className="text-sm text-muted-foreground">Build authority with content clusters — not link exchange schemes.</p>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : linkData ? (
        <>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="paper-card p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Coverage</p>
              <p className="text-3xl font-bold mt-1">{linkData.coverageScore}%</p>
            </div>
            <div className="paper-card p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Pages tracked</p>
              <p className="text-3xl font-bold mt-1">{linkData.pageCount}</p>
            </div>
            <div className="paper-card p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Orphan pages</p>
              <p className="text-3xl font-bold mt-1">{linkData.orphanCount}</p>
            </div>
          </div>

          {linkData.orphans.length > 0 && (
            <div className="paper-card p-5">
              <h2 className="font-semibold mb-3 flex items-center gap-2"><Link2 className="h-4 w-4" /> Pages without inbound links</h2>
              <ul className="text-sm space-y-2">
                {linkData.orphans.slice(0, 10).map((p) => (
                  <li key={p.slug} className="text-muted-foreground">{p.title}</li>
                ))}
              </ul>
            </div>
          )}

          {linkData.suggestions.length > 0 && (
            <div className="paper-card p-5">
              <h2 className="font-semibold mb-3">Suggested internal links</h2>
              <ul className="space-y-3">
                {linkData.suggestions.map((s) => (
                  <li
                    key={`${s.suggestedSlug}-${s.anchorText}-${s.fromTitle ?? "none"}`}
                    className="text-sm border-b border-border pb-3 last:border-0"
                  >
                    <p className="font-medium">{s.anchorText} → {s.suggestedSlug}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.rationale}</p>
                    {s.fromTitle && <p className="text-xs text-muted-foreground">From: {s.fromTitle}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : null}

      <p className="text-xs text-muted-foreground">
        <Link href="/link-building" className="text-primary hover:underline">Learn our white-hat link building approach →</Link>
      </p>
    </div>
  );
}
