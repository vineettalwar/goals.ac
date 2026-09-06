import type { ReactNode } from "react";
import { BarChart2, Globe, Link2, ScanSearch } from "lucide-react";
import type { SectionLinkProps } from "../section/types";
import { StatCard, StatusPill } from "./shared";

export type PartnerProjectRow = {
  id: number;
  name: string;
  url: string | null;
  visibilityScore: number;
  visibilityDelta: number | null;
  geoScore: number | null;
  linkCoverage: number;
  publishedCount: number;
  draftCount: number;
  /** Optional command-center outcomes (when API provides them). */
  llmCitationRate?: number | null;
  recentPublishOk?: number;
  recentPublishFail?: number;
};

function SectionLink({
  renderLink,
  ...props
}: SectionLinkProps & { renderLink: (props: SectionLinkProps) => ReactNode }) {
  return <>{renderLink(props)}</>;
}

function deltaLabel(delta: number | null): string | null {
  if (delta == null || delta === 0) return null;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta}pp`;
}

function formatPublishHealth(ok: number | undefined, failed: number | undefined): string | null {
  if (ok == null && failed == null) return null;
  const o = ok ?? 0;
  const f = failed ?? 0;
  if (o === 0 && f === 0) return "No publishes";
  if (f === 0) return `${o} ok`;
  return `${o} ok · ${f} failed`;
}

export function PartnerWorkspaceView({
  projects,
  organizationName,
  renderLink,
}: {
  projects: PartnerProjectRow[];
  organizationName?: string | null;
  renderLink: (props: SectionLinkProps) => ReactNode;
}) {
  const totals = projects.reduce(
    (acc, p) => ({
      published: acc.published + p.publishedCount,
      drafts: acc.drafts + p.draftCount,
      avgVisibility: acc.avgVisibility + p.visibilityScore / Math.max(projects.length, 1),
    }),
    { published: 0, drafts: 0, avgVisibility: 0 },
  );

  return (
    <div className="partner-print-root space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <p className="text-xs text-muted-foreground">
          {organizationName ? `Organization: ${organizationName}` : "Client outcomes"}
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs font-medium hover:bg-secondary/50"
        >
          Print / Save as PDF
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Client projects" value={projects.length} icon={<Globe className="h-5 w-5" />} />
        <StatCard
          label="Articles published"
          value={totals.published}
          hint={`${totals.drafts} drafts in queue`}
          icon={<BarChart2 className="h-5 w-5" />}
        />
        <StatCard
          label="Avg. AI visibility"
          value={`${Math.round(totals.avgVisibility)}%`}
          tone="emerald"
          icon={<ScanSearch className="h-5 w-5" />}
        />
      </div>

      {projects.length === 0 ? (
        <div className="py-12">
          <p className="font-medium">No client projects yet</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Create a project per client site to track autopilot, visibility, and publish status here.
          </p>
          <SectionLink renderLink={renderLink} href="/projects" className="mt-4 inline-flex text-sm font-medium text-primary hover:underline">
            Manage projects
          </SectionLink>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map((project) => {
            const publishHealth = formatPublishHealth(
              project.recentPublishOk,
              project.recentPublishFail,
            );
            return (
              <SectionLink
                key={project.id}
                renderLink={renderLink}
                href={`/projects/${project.id}`}
                className="paper-card block p-5 transition-colors hover:bg-secondary/20"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{project.name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{project.url ?? "No URL"}</p>
                  </div>
                  <StatusPill label={`${project.visibilityScore}% visibility`} tone="primary" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <div>
                    <p className="text-muted-foreground">GEO</p>
                    <p className="font-semibold tabular-nums">{project.geoScore ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Cited</p>
                    <p className="font-semibold tabular-nums">
                      {project.llmCitationRate != null ? `${project.llmCitationRate}%` : "—"}
                      {deltaLabel(project.visibilityDelta) ? (
                        <span className="ml-1 text-emerald-600">{deltaLabel(project.visibilityDelta)}</span>
                      ) : null}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Published</p>
                    <p className="font-semibold tabular-nums">{project.publishedCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Publish health</p>
                    <p className="flex items-center gap-1 font-semibold tabular-nums">
                      {publishHealth ?? (
                        <>
                          <Link2 className="h-3 w-3" />
                          {project.linkCoverage}%
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </SectionLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

