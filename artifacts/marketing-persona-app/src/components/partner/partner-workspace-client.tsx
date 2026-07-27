"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart2,
  CheckCircle2,
  Copy,
  FileText,
  Globe,
  Printer,
  ScanSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@workspace/app-shell/section-panels";
import { STORY_KIT_MARKDOWN_TEMPLATE } from "@/lib/marketing/content/story-kit-constants";
import { cn } from "@/lib/utils";

export type PartnerProjectRow = {
  id: number;
  name: string;
  url: string | null;
  industry: string | null;
  visibilityScore: number;
  visibilityDelta: number | null;
  geoScore: number | null;
  geoScoreDelta: number | null;
  publishedCount: number;
  draftCount: number;
  draftsNeedingReview: number;
  generatingPieces: number;
  llmCitationRate: number | null;
  recentPublishOk: number;
  recentPublishFail: number;
  internalLinkCoverage: number | null;
};

type Props = {
  projects: PartnerProjectRow[];
  organizationName: string | null;
  generatedAt: string;
};

function deltaLabel(delta: number | null, suffix = ""): string | null {
  if (delta == null || delta === 0) return null;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta}${suffix}`;
}

function Delta({ value, suffix = "" }: { value: number | null; suffix?: string }) {
  const label = deltaLabel(value, suffix);
  if (!label) return null;
  return (
    <span className={cn("tabular-nums", (value ?? 0) >= 0 ? "text-emerald-700" : "text-rose-700")}>
      {label}
    </span>
  );
}

function formatPct(value: number | null): string {
  return value == null ? "—" : `${value}%`;
}

export function PartnerWorkspaceClient({ projects, organizationName, generatedAt }: Props) {
  const [copied, setCopied] = useState(false);

  const totals = projects.reduce(
    (acc, p) => ({
      published: acc.published + p.publishedCount,
      drafts: acc.drafts + p.draftCount,
      avgVisibility: acc.avgVisibility + p.visibilityScore / Math.max(projects.length, 1),
    }),
    { published: 0, drafts: 0, avgVisibility: 0 },
  );

  const handleCopyTemplate = async () => {
    await navigator.clipboard.writeText(STORY_KIT_MARKDOWN_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generatedLabel = new Date(generatedAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="px-8 py-8 max-w-6xl space-y-8">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .partner-print-root, .partner-print-root * { visibility: visible !important; }
          .partner-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
            max-width: none !important;
          }
          .partner-no-print { display: none !important; }
          .partner-print-root table { break-inside: avoid; }
        }
      `}</style>

      <div className="partner-print-root space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Agency scoreboard
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Partner</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">
              {organizationName
                ? `How ${organizationName} clients are performing — visibility, GEO, and publish pipeline. Manage sites on `
                : "Cross-client performance — visibility, GEO, and publish pipeline. Manage sites on "}
              <Link
                href="/projects"
                className="partner-no-print font-medium text-foreground underline-offset-2 hover:underline"
              >
                Projects
              </Link>
              <span className="partner-no-print">.</span>
            </p>
            <p className="mt-1 hidden text-xs text-muted-foreground print:block">
              goals.ac · Generated {generatedLabel}
              {organizationName ? ` · ${organizationName}` : ""}
            </p>
          </div>
          <div className="partner-no-print flex flex-wrap items-center gap-2">
            <Button onClick={() => window.print()} size="sm" variant="outline">
              <Printer className="mr-1.5 h-4 w-4" />
              Print / Save as PDF
            </Button>
            <Button onClick={handleCopyTemplate} size="sm" variant="outline">
              {copied ? (
                <>
                  <CheckCircle2 className="mr-1.5 h-4 w-4 text-emerald-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-4 w-4" />
                  Story template
                </>
              )}
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href="/projects">Manage sites</Link>
            </Button>
          </div>
        </header>

        <div className="partner-no-print grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Clients tracked"
            value={projects.length}
            icon={<Globe className="h-5 w-5" />}
          />
          <StatCard
            label="Articles published"
            value={totals.published}
            hint={`${totals.drafts} draft${totals.drafts === 1 ? "" : "s"} in queue`}
            icon={<BarChart2 className="h-5 w-5" />}
          />
          <StatCard
            label="Avg. AI visibility"
            value={`${Math.round(totals.avgVisibility)}%`}
            tone="emerald"
            icon={<ScanSearch className="h-5 w-5" />}
          />
        </div>

        <section className="partner-no-print space-y-3" aria-labelledby="partner-scoreboard-heading">
          <div>
            <h2 id="partner-scoreboard-heading" className="text-sm font-semibold tracking-tight">
              Client performance
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Compare publish output and AI visibility across clients. Open a row for that project.
            </p>
          </div>

          {projects.length === 0 ? (
            <div className="paper-card px-6 py-14 text-center">
              <Globe className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="font-medium">No clients to score yet</p>
              <p className="mx-auto mt-1 mb-4 max-w-sm text-sm text-muted-foreground">
                Add client sites on Projects first — Partner rolls up their visibility and publish
                metrics here.
              </p>
              <Button asChild>
                <Link href="/projects">Go to Projects</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-160 text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 font-medium tabular-nums">Published</th>
                    <th className="px-4 py-3 font-medium tabular-nums">Drafts</th>
                    <th className="px-4 py-3 font-medium">Visibility</th>
                    <th className="px-4 py-3 font-medium">GEO</th>
                    <th className="px-4 py-3 font-medium">
                      <span className="sr-only">Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr
                      key={project.id}
                      className="border-b border-border last:border-0 hover:bg-secondary/25"
                    >
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/projects/${project.id}`}
                          className="font-medium hover:underline"
                        >
                          {project.name}
                        </Link>
                        <p className="mt-0.5 max-w-55 truncate text-xs text-muted-foreground">
                          {project.industry ?? project.url ?? "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 tabular-nums font-medium">
                        {project.publishedCount}
                      </td>
                      <td className="px-4 py-3.5 tabular-nums text-muted-foreground">
                        {project.draftCount}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-medium tabular-nums">{project.visibilityScore}%</span>
                        {project.visibilityDelta != null && project.visibilityDelta !== 0 ? (
                          <span className="ml-1.5 text-xs">
                            <Delta value={project.visibilityDelta} suffix="pp" />
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-medium tabular-nums">{project.geoScore ?? "—"}</span>
                        {project.geoScoreDelta != null && project.geoScoreDelta !== 0 ? (
                          <span className="ml-1.5 text-xs">
                            <Delta value={project.geoScoreDelta} />
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/projects/${project.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
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
        </section>

        <section className="space-y-3" aria-labelledby="partner-outcomes-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="partner-outcomes-heading" className="text-sm font-semibold tracking-tight">
                Client outcomes
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Read-only pack for partners — drafts, GEO, LLM citations, publish health, and internal
                link coverage.
              </p>
            </div>
            <Button
              onClick={() => window.print()}
              size="sm"
              variant="outline"
              className="partner-no-print shrink-0"
            >
              <Printer className="mr-1.5 h-4 w-4" />
              Print / Save as PDF
            </Button>
          </div>

          {projects.length === 0 ? (
            <div className="paper-card px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No client outcomes yet — add projects to build this report.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-180 text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 font-medium tabular-nums">Review</th>
                    <th className="px-4 py-3 font-medium tabular-nums">Generating</th>
                    <th className="px-4 py-3 font-medium">GEO</th>
                    <th className="px-4 py-3 font-medium">LLM cite</th>
                    <th className="px-4 py-3 font-medium">Publish</th>
                    <th className="px-4 py-3 font-medium">Links</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={`outcomes-${project.id}`} className="border-b border-border last:border-0">
                      <td className="px-4 py-3.5">
                        <p className="font-medium">{project.name}</p>
                        <p className="mt-0.5 max-w-55 truncate text-xs text-muted-foreground">
                          {project.url ?? "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 tabular-nums">{project.draftsNeedingReview}</td>
                      <td className="px-4 py-3.5 tabular-nums text-muted-foreground">
                        {project.generatingPieces}
                      </td>
                      <td className="px-4 py-3.5 tabular-nums font-medium">
                        {project.geoScore ?? "—"}
                      </td>
                      <td className="px-4 py-3.5 tabular-nums">
                        {formatPct(project.llmCitationRate)}
                      </td>
                      <td className="px-4 py-3.5 tabular-nums text-xs">
                        <span className="text-emerald-700">{project.recentPublishOk} ok</span>
                        {" · "}
                        <span className="text-rose-700">{project.recentPublishFail} fail</span>
                      </td>
                      <td className="px-4 py-3.5 tabular-nums">
                        {formatPct(project.internalLinkCoverage)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="partner-no-print flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/15 bg-primary/3 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight">Client story template</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground text-pretty">
                Placeholder markdown for approved client stories — fill from GSC, GEO, or authority
                exports only.
              </p>
            </div>
          </div>
          <Button onClick={handleCopyTemplate} size="sm" variant="outline" className="shrink-0">
            {copied ? (
              <>
                <CheckCircle2 className="mr-1.5 h-4 w-4 text-emerald-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-1.5 h-4 w-4" />
                Copy template
              </>
            )}
          </Button>
        </aside>
      </div>
    </div>
  );
}
