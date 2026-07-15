"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart2, CheckCircle2, Copy, ExternalLink, FileText, Globe, Link2, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PARTNER_SWAP_STEPS,
  STORY_SLOT_LABELS,
  VERIFY_CTAS,
  STORY_KIT_MARKDOWN_TEMPLATE,
} from "@/lib/marketing/content/story-kit-constants";

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
  const [copied, setCopied] = useState(false);

  const totals = projects.reduce(
    (acc, p) => ({
      published: acc.published + p.publishedCount,
      drafts: acc.drafts + p.draftCount,
      avgVisibility:
        acc.avgVisibility + p.visibilityScore / Math.max(projects.length, 1),
    }),
    { published: 0, drafts: 0, avgVisibility: 0 },
  );

  const handleCopyTemplate = async () => {
    await navigator.clipboard.writeText(STORY_KIT_MARKDOWN_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

      <div className="paper-card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold mb-2">Story kit</h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Empty placeholders for when a real client approves a story. No sample metrics — fill only from GSC, GEO,
              or authority tool exports.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-md px-2.5 py-1">
            <FileText className="h-3.5 w-3.5" />
            Placeholders only
          </span>
        </div>

        <div className="rounded-lg border border-border bg-secondary/20 px-4 py-4 mb-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-3">
            Before publishing checklist
          </p>
          <ol className="space-y-2 list-decimal list-inside">
            {PARTNER_SWAP_STEPS.map((step) => (
              <li key={step} className="text-sm text-foreground/80 leading-relaxed pl-1">
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1">
                Markdown template
              </p>
              <p className="text-sm text-muted-foreground">
                Placeholders only — no fake metrics. Replace every <code className="text-xs">[PLACEHOLDER]</code> before
                publishing.
              </p>
            </div>
            <Button onClick={handleCopyTemplate} size="sm" variant="outline" className="shrink-0">
              {copied ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy template
                </>
              )}
            </Button>
          </div>
          <pre className="text-xs text-muted-foreground bg-secondary/40 rounded-md p-3 overflow-x-auto max-h-64 overflow-y-auto border border-border">
            {STORY_KIT_MARKDOWN_TEMPLATE}
          </pre>
        </div>

        <div className="rounded-lg border border-border bg-secondary/20 px-4 py-4 mb-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-3">
            Screenshot & audit slots
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            {STORY_SLOT_LABELS.map((slot) => (
              <div key={slot.label} className="rounded-md border border-dashed border-border bg-card px-3 py-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1">{slot.label}</p>
                <p className="text-[10px] text-muted-foreground mb-2">{slot.source}</p>
                <p className="text-xs text-foreground/70 leading-relaxed">{slot.hint}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-3">Verification tools</p>
          <div className="flex flex-wrap gap-3 mb-4">
            {VERIFY_CTAS.map((cta) => (
              <Link
                key={cta.label}
                href={cta.href}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3.5 py-2 text-sm font-medium hover:bg-secondary transition-colors"
              >
                {cta.label}
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            ))}
          </div>
          <ul className="space-y-2">
            {VERIFY_CTAS.map((cta) => (
              <li key={`${cta.label}-desc`} className="text-xs text-muted-foreground leading-relaxed">
                <span className="text-foreground font-medium">{cta.label}:</span> {cta.desc}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border-l-4 border-l-primary bg-secondary/30 px-4 py-3 mt-6">
          <p className="text-xs font-semibold text-foreground mb-1">No named clients published yet</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The public <Link href="/success-stories" className="text-primary hover:underline">success stories page</Link> is
            coming soon only — no published stories or illustrative metrics. When you publish a real story, every metric must
            be backed by a GSC screenshot, GEO audit link, or third-party tool export — no invented lift.
          </p>
        </div>
      </div>
    </div>
  );
}
