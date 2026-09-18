import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { AutopilotActivityPanel, formatArticleUsageLabel } from "./autopilot-activity-panel";
import { AutopilotSettingsCompact } from "./autopilot-settings-compact";
import {
  countByStatus,
  type DashboardArticleUsage,
  type DashboardAutopilotSavePayload,
  type DashboardAutopilotSettings,
  type DashboardCommandCenter,
  type DashboardLinkProps,
  type DashboardPiece,
} from "./types";

function DashLink({
  renderLink,
  ...props
}: DashboardLinkProps & {
  renderLink: (props: DashboardLinkProps) => ReactNode;
}) {
  return <>{renderLink(props)}</>;
}

export function DashboardCommandCenterSection({
  projectId,
  commandCenter,
  renderLink,
}: {
  projectId: number;
  commandCenter: DashboardCommandCenter;
  autopilotSettings?: unknown;
  renderLink: (props: DashboardLinkProps) => ReactNode;
}) {
  if (commandCenter.topOpportunities.length === 0) return null;

  return (
    <section className="paper-card-enhanced" aria-labelledby="ideas-heading">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 id="ideas-heading" className="text-sm font-semibold tracking-tight">
          Ideas
        </h2>
        <DashLink
          renderLink={renderLink}
          href="/search/keywords"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          All keywords
        </DashLink>
      </div>
      <ul className="divide-y divide-border border-t border-border">
        {commandCenter.topOpportunities.map((opp) => {
          const isRefresh = opp.source === "content_refresh" || opp.source === "rank_drop";
          const href = isRefresh
            ? `/projects/${projectId}/content-studio?${new URLSearchParams({
                optimize: "1",
                keyword: opp.keyword,
                ...(opp.competitorUrl ? { url: opp.competitorUrl } : {}),
              }).toString()}`
            : `/search/keywords?keyword=${encodeURIComponent(opp.keyword)}`;
          return (
            <li key={opp.id}>
              <DashLink
                renderLink={renderLink}
                href={href}
                className="group flex items-center gap-3 py-3 text-sm transition-colors hover:text-primary"
              >
                <span className="min-w-0 flex-1 truncate">{opp.keyword}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {opp.opportunityScore}
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </DashLink>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function DashboardAutopilotSection({
  projectId,
  settings,
  pieces,
  commandCenter,
  articleUsage,
  renderLink,
  onSaveAutopilot,
  savingAutopilot = false,
  saveAutopilotError = null,
}: {
  projectId: number;
  settings: DashboardAutopilotSettings | null;
  pieces: DashboardPiece[];
  commandCenter?: DashboardCommandCenter | null;
  articleUsage?: DashboardArticleUsage | null;
  renderLink: (props: DashboardLinkProps) => ReactNode;
  onSaveAutopilot?: (payload: DashboardAutopilotSavePayload) => void | Promise<void>;
  savingAutopilot?: boolean;
  saveAutopilotError?: string | null;
}) {
  if (commandCenter) {
    return (
      <AutopilotActivityPanel
        projectId={projectId}
        settings={settings}
        commandCenter={commandCenter}
        pieces={pieces}
        articleUsage={articleUsage}
        renderLink={renderLink}
        onSaveAutopilot={onSaveAutopilot}
        savingAutopilot={savingAutopilot}
        saveAutopilotError={saveAutopilotError}
      />
    );
  }

  const byStatus = countByStatus(pieces);
  const generating = byStatus.generating ?? 0;
  const drafts = byStatus.draft ?? 0;
  const published = (byStatus.published ?? 0) + (byStatus.ready ?? 0);
  const metaParts: string[] = [];
  if (settings?.enabled) {
    metaParts.push(
      `${settings.cadence === "daily" ? "Daily" : "Weekly"} · ${settings.publishMode ?? "review"}`,
    );
  }
  if (articleUsage) metaParts.push(formatArticleUsageLabel(articleUsage));

  return (
    <section aria-labelledby="autopilot-heading">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="autopilot-heading" className="text-sm font-semibold tracking-tight">
          Autopilot
        </h2>
        {metaParts.length > 0 ? (
          <p className="text-sm text-muted-foreground">{metaParts.join(" · ")}</p>
        ) : null}
      </div>
      {onSaveAutopilot ? (
        <AutopilotSettingsCompact
          projectId={projectId}
          settings={settings}
          saving={savingAutopilot}
          saveError={saveAutopilotError}
          onSave={onSaveAutopilot}
          renderLink={renderLink}
        />
      ) : null}
      <p className="text-sm text-muted-foreground">
        {generating + drafts} drafts
        <span className="mx-1.5 text-border">·</span>
        {published} published
        <span className="mx-1.5 text-border">·</span>
        {pieces.length} total
      </p>
    </section>
  );
}
