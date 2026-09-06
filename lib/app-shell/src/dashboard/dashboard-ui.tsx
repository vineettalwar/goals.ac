"use client";

import type { ReactNode } from "react";
import { FileText, Lightbulb, Plus } from "lucide-react";
import { APP_SHELL_PAGE_WIDE } from "../shell-constants";
import { AutopilotActivityPanel, formatArticleUsageLabel } from "./autopilot-activity-panel";
import {
  buildPipelineSlices,
  buildPublishActivitySeries,
  DashboardActivityChart,
  DashboardPipelineDonut,
} from "./dashboard-charts";
import { OutcomesPanel } from "./outcomes-panel";
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
  const hasCommandCenter = Boolean(activeProjectId && commandCenter);
  const activitySeries = buildPublishActivitySeries(commandCenter?.recentPublishes ?? []);
  const pipelineSlices = buildPipelineSlices(pieces);
  const studioHref = activeProjectId
    ? `/projects/${activeProjectId}/content-studio`
    : "/projects";

  return (
    <div className={APP_SHELL_PAGE_WIDE}>
      <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-balance">{greeting}</h1>
          {subtitle ? (
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
              {subtitle}
            </p>
          ) : null}
        </div>
        <DashLink
          renderLink={renderLink}
          href={studioHref}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="mr-1.5 h-4 w-4" aria-hidden />
          Open studio
        </DashLink>
      </header>

      {!hasCommandCenter ? (
        <DashboardStatsSection
          projectCount={projectCount}
          scopedToActiveProject={scopedToActiveProject}
          pieces={pieces}
          renderLink={renderLink}
        />
      ) : null}

      {hasCommandCenter && activeProjectId && commandCenter ? (
        <div className="space-y-4 sm:space-y-5">
          <OutcomesPanel
            projectId={activeProjectId}
            commandCenter={commandCenter}
            renderLink={renderLink}
          />

          <div className="grid min-w-0 gap-4 lg:grid-cols-12 lg:gap-5">
            <div className="paper-card min-w-0 p-5 sm:p-6 lg:col-span-8">
              <DashboardActivityChart
                data={activitySeries}
                totalLabel="Successful CMS publishes in recent history"
              />
            </div>
            <div className="paper-card min-w-0 p-5 sm:p-6 lg:col-span-4">
              <DashboardPipelineDonut slices={pipelineSlices} />
            </div>

            <div className="min-w-0 lg:col-span-8">
              <DashboardCommandCenterSection
                projectId={activeProjectId}
                commandCenter={commandCenter}
                autopilotSettings={autopilotSettings}
                renderLink={renderLink}
              />
            </div>

            <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1">
              <DashLink
                renderLink={renderLink}
                href="/search/keywords"
                className="paper-card flex items-center justify-between gap-3 p-5 transition-colors hover:bg-secondary/30"
              >
                <div>
                  <p className="text-sm text-muted-foreground">Open ideas</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">
                    {commandCenter.openOpportunities}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Keyword opportunities</p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-full border-4 border-primary/15 text-primary">
                  <Lightbulb className="h-4 w-4" aria-hidden />
                </span>
              </DashLink>
              <DashLink
                renderLink={renderLink}
                href={`/projects/${activeProjectId}/content-studio`}
                className="paper-card flex items-center justify-between gap-3 p-5 transition-colors hover:bg-secondary/30"
              >
                <div>
                  <p className="text-sm text-muted-foreground">Drafts to review</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">
                    {commandCenter.draftsNeedingReview}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Waiting in studio</p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-full border-4 border-[var(--accent-warm)]/25 text-[var(--accent-warm)]">
                  <FileText className="h-4 w-4" aria-hidden />
                </span>
              </DashLink>
              {articleUsage ? (
                <div className="paper-card p-5 sm:col-span-2 lg:col-span-1">
                  <p className="text-sm text-muted-foreground">Article quota</p>
                  <p className="mt-1 text-sm font-medium leading-relaxed text-foreground">
                    {formatArticleUsageLabel(articleUsage)}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="min-w-0 lg:col-span-5">
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
            </div>

            <div className="min-w-0 lg:col-span-7">
              <DashboardRecentSection
                projectId={activeProjectId}
                pieces={pieces}
                renderLink={renderLink}
              />
            </div>

            {drafts.length > 0 ? (
              <div className="lg:col-span-12">
                <DashboardDraftsSection drafts={drafts} renderLink={renderLink} />
              </div>
            ) : null}

            <div className="lg:col-span-12">
              <DashboardProjectsSection project={activeProject} renderLink={renderLink} />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {activeProjectId ? (
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
            <DashboardProjectsSection project={activeProject} renderLink={renderLink} />
          ) : null}
        </div>
      )}
    </div>
  );
}
