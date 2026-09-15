"use client";

import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { APP_SHELL_PAGE_WIDE } from "../shell-constants";
import { MetricRow } from "../section-panels/shared";
import { AutopilotActivityPanel } from "./autopilot-activity-panel";
import {
  DashboardCommandCenterSection,
  DashboardAutopilotSection,
} from "./dashboard-command-center";
import {
  DashboardStatsSection,
  DashboardDraftsSection,
  DashboardRecentSection,
  DashboardProjectsSection,
} from "./dashboard-content-sections";
import type {
  DashboardArticleUsage,
  DashboardAutopilotSavePayload,
  DashboardAutopilotSettings,
  DashboardCommandCenter,
  DashboardLinkProps,
  DashboardPiece,
  DashboardProject,
} from "./types";
import { countByStatus } from "./types";

export {
  AutopilotActivityPanel,
  formatArticleUsageLabel,
  formatInternalLinksChipLabel,
} from "./autopilot-activity-panel";
export { AutopilotSettingsCompact } from "./autopilot-settings-compact";
export {
  OutcomesPanel,
  formatCitationDelta,
  formatGeoTrend,
  formatPublishHealth,
} from "./outcomes-panel";
export {
  DashboardStatsSection,
  DashboardDraftsSection,
  DashboardRecentSection,
  DashboardProjectsSection,
} from "./dashboard-content-sections";
export {
  DashboardCommandCenterSection,
  DashboardAutopilotSection,
} from "./dashboard-command-center";

function DashLink({
  renderLink,
  ...props
}: DashboardLinkProps & {
  renderLink: (props: DashboardLinkProps) => ReactNode;
}) {
  return <>{renderLink(props)}</>;
}

function dashboardMetrics(
  pieces: DashboardPiece[],
  commandCenter: DashboardCommandCenter | null,
): Array<{ label: string; value: ReactNode }> {
  const byStatus = countByStatus(pieces);
  const drafts = commandCenter?.draftsNeedingReview ?? byStatus.draft ?? 0;
  const published =
    commandCenter?.publishedCount ?? (byStatus.published ?? 0) + (byStatus.ready ?? 0);
  const items: Array<{ label: string; value: ReactNode }> = [
    { label: "drafts", value: drafts },
    { label: "live", value: published },
  ];
  if (commandCenter?.llmCitationRate != null) {
    items.push({ label: "citations", value: `${commandCenter.llmCitationRate}%` });
  }
  return items;
}

export function DashboardView({
  greeting,
  subtitle,
  projectCount,
  scopedToActiveProject,
  activeProject,
  activeProjectId,
  pieces,
  autopilotSettings,
  commandCenter,
  articleUsage,
  renderLink,
  onSaveAutopilot,
  savingAutopilot = false,
  saveAutopilotError = null,
}: {
  greeting: string;
  subtitle: string | null;
  projectCount: number;
  scopedToActiveProject: boolean;
  activeProject: DashboardProject | null;
  activeProjectId: number | null;
  pieces: DashboardPiece[];
  autopilotSettings: DashboardAutopilotSettings | null;
  commandCenter: DashboardCommandCenter | null;
  articleUsage?: DashboardArticleUsage | null;
  renderLink: (props: DashboardLinkProps) => ReactNode;
  onSaveAutopilot?: (payload: DashboardAutopilotSavePayload) => void | Promise<void>;
  savingAutopilot?: boolean;
  saveAutopilotError?: string | null;
}) {
  const drafts = pieces.filter((piece) => piece.status === "draft");
  const studioHref = activeProjectId
    ? `/projects/${activeProjectId}/content-studio`
    : "/projects";
  const metrics = dashboardMetrics(pieces, commandCenter);

  return (
    <div className={APP_SHELL_PAGE_WIDE}>
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">{greeting}</h1>
          {subtitle ? (
            <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
          {projectCount > 0 ? <div className="mt-3"><MetricRow items={metrics} /></div> : null}
        </div>
        <DashLink
          renderLink={renderLink}
          href={studioHref}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="mr-1.5 h-4 w-4" aria-hidden />
          {activeProjectId ? "New draft" : "Open studio"}
        </DashLink>
      </header>

      {projectCount === 0 ? (
        <DashboardStatsSection
          projectCount={projectCount}
          scopedToActiveProject={scopedToActiveProject}
          pieces={pieces}
          renderLink={renderLink}
        />
      ) : (
        <div className="space-y-10">
          {activeProjectId && commandCenter ? (
            <DashboardCommandCenterSection
              projectId={activeProjectId}
              commandCenter={commandCenter}
              autopilotSettings={autopilotSettings}
              renderLink={renderLink}
            />
          ) : null}

          {activeProjectId ? (
            <DashboardDraftsSection drafts={drafts} renderLink={renderLink} />
          ) : null}

          {activeProjectId ? (
            <DashboardRecentSection
              projectId={activeProjectId}
              pieces={pieces}
              renderLink={renderLink}
            />
          ) : null}

          {activeProjectId ? (
            commandCenter ? (
              <AutopilotActivityPanel
                projectId={activeProjectId}
                settings={autopilotSettings}
                commandCenter={commandCenter}
                pieces={pieces}
                articleUsage={articleUsage}
                renderLink={renderLink}
                onSaveAutopilot={onSaveAutopilot}
                savingAutopilot={savingAutopilot}
                saveAutopilotError={saveAutopilotError}
                compact
              />
            ) : (
              <DashboardAutopilotSection
                projectId={activeProjectId}
                settings={autopilotSettings}
                pieces={pieces}
                articleUsage={articleUsage}
                renderLink={renderLink}
                onSaveAutopilot={onSaveAutopilot}
                savingAutopilot={savingAutopilot}
                saveAutopilotError={saveAutopilotError}
              />
            )
          ) : null}

          <DashboardProjectsSection project={activeProject} renderLink={renderLink} />
        </div>
      )}
    </div>
  );
}
