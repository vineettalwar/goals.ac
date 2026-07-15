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
    <div className="space-y-6">
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
        <div className="paper-card p-12 text-center">
          <Globe className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium">No client projects yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a project per client site to track autopilot, visibility, and publish status here.
          </p>
          <SectionLink renderLink={renderLink} href="/projects" className="mt-4 inline-flex text-sm font-medium text-primary hover:underline">
            Manage projects
          </SectionLink>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map((project) => (
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
              <div className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                <div>
                  <p className="text-muted-foreground">GEO</p>
                  <p className="font-semibold tabular-nums">
                    {project.geoScore ?? "—"}
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
                  <p className="text-muted-foreground">Link coverage</p>
                  <p className="flex items-center gap-1 font-semibold tabular-nums">
                    <Link2 className="h-3 w-3" />
                    {project.linkCoverage}%
                  </p>
                </div>
              </div>
            </SectionLink>
          ))}
        </div>
      )}

      {organizationName ? (
        <p className="text-xs text-muted-foreground">Organization: {organizationName}</p>
      ) : null}
    </div>
  );
}
