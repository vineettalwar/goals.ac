"use client";

import Link from "next/link";
import { ArrowRight, BarChart2, Globe, Link2, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";

export type PartnerProjectRow = {
  id: number;
  name: string;
  url: string | null;
  industry: string | null;
  visibilityScore: number;
  visibilityDelta: number | null;
  geoScore: number | null;
  geoScoreDelta: number | null;
  linkCoverage: number;
  publishedCount: number;
  draftCount: number;
};

type Props = {
  projects: PartnerProjectRow[];
  organizationName: string | null;
};

function deltaLabel(delta: number | null, suffix = "pp"): string | null {
  if (delta == null || delta === 0) return null;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta}${suffix}`;
}

export function PartnerWorkspaceClient({ projects, organizationName }: Props) {
  const totals = projects.reduce(
    (acc, p) => ({
      published: acc.published + p.publishedCount,
      drafts: acc.drafts + p.draftCount,
      avgVisibility:
        acc.avgVisibility + p.visibilityScore / Math.max(projects.length, 1),
    }),
    { published: 0, drafts: 0, avgVisibility: 0 },
  );

  return (
    <div className="px-8 py-8 max-w-6xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Partner workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {organizationName
              ? `Roll-up metrics for ${organizationName} client projects.`
              : "Roll-up metrics across your accessible client projects."}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/projects">Manage projects</Link>
        </Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="paper-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Client projects</p>
          <p className="text-3xl font-bold mt-1">{projects.length}</p>
        </div>
        <div className="paper-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Articles published</p>
          <p className="text-3xl font-bold mt-1">{totals.published}</p>
          <p className="text-xs text-muted-foreground mt-1">{totals.drafts} drafts in queue</p>
        </div>
        <div className="paper-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg. AI visibility</p>
          <p className="text-3xl font-bold mt-1">{Math.round(totals.avgVisibility)}%</p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="paper-card p-12 text-center">
          <Globe className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
          <p className="font-medium">No client projects yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Create a project per client site to track autopilot, visibility, and publish status here.
          </p>
          <Button asChild>
            <Link href="/projects">Add client project</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Content</th>
                <th className="px-4 py-3 font-medium">AI visibility</th>
                <th className="px-4 py-3 font-medium">GEO score</th>
                <th className="px-4 py-3 font-medium">Link coverage</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                  <td className="px-4 py-4">
                    <p className="font-medium">{project.name}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {project.industry ?? project.url ?? "—"}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-medium">{project.publishedCount}</span>
                    <span className="text-muted-foreground"> pub · </span>
                    <span>{project.draftCount} draft</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      <BarChart2 className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium">{project.visibilityScore}%</span>
                      {deltaLabel(project.visibilityDelta) ? (
                        <span
                          className={
                            (project.visibilityDelta ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                          }
                        >
                          {deltaLabel(project.visibilityDelta)}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      <ScanSearch className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium">{project.geoScore ?? "—"}</span>
                      {project.geoScoreDelta != null && project.geoScoreDelta !== 0 ? (
                        <span
                          className={
                            project.geoScoreDelta >= 0 ? "text-emerald-600" : "text-rose-600"
                          }
                        >
                          {deltaLabel(project.geoScoreDelta, "")}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5 text-primary" />
                      {project.linkCoverage}%
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      href={`/projects/${project.id}`}
                      className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-medium"
                    >
                      Open <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
