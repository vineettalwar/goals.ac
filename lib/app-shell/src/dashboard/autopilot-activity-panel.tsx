"use client";

import type { ReactNode } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileText,
  XCircle,
} from "lucide-react";
import { cn } from "../cn";
import { AutopilotSettingsCompact } from "./autopilot-settings-compact";
import {
  contentPiecePath,
  countByStatus,
  type DashboardArticleUsage,
  type DashboardAutopilotSavePayload,
  type DashboardAutopilotSettings,
  type DashboardCommandCenter,
  type DashboardLinkProps,
  type DashboardPiece,
} from "./types";

/** Compact quota line for partner demos, e.g. `12 / 30 articles this month`. */
export function formatArticleUsageLabel(usage: DashboardArticleUsage): string {
  if (usage.usesByok) return "BYOK — unlimited AI generations";
  if (usage.articleQuotaLimit != null) {
    return `${usage.articlesThisMonth} / ${usage.articleQuotaLimit} articles this month`;
  }
  return `${usage.articlesThisMonth} articles this month`;
}

/**
 * Internal-links chip label for Autopilot activity.
 * - Coverage available: `62% linked · 3 orphans`
 * - Else suggestions: `4 link suggestions`
 * - Else null → UI shows “No link map yet”
 */
export function formatInternalLinksChipLabel(input: {
  coveragePercent: number | null | undefined;
  orphanCount: number | null | undefined;
  suggestionCount: number;
}): string | null {
  if (input.coveragePercent != null) {
    const orphans = input.orphanCount ?? 0;
    return `${input.coveragePercent}% linked · ${orphans} orphan${orphans === 1 ? "" : "s"}`;
  }
  if (input.suggestionCount > 0) {
    return `${input.suggestionCount} link suggestion${input.suggestionCount === 1 ? "" : "s"}`;
  }
  return null;
}

const STATUS_BADGE: Record<string, string> = {
  ready: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  published: "bg-primary text-primary-foreground",
  generating: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  pending: "bg-muted text-muted-foreground",
  draft: "bg-muted text-muted-foreground",
  failed: "bg-red-500/15 text-red-700 dark:text-red-300",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-transparent px-2 py-0.5 text-xs font-semibold capitalize",
        STATUS_BADGE[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {status}
    </span>
  );
}

function formatWhen(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function DashLink({
  renderLink,
  ...props
}: DashboardLinkProps & {
  renderLink: (props: DashboardLinkProps) => ReactNode;
}) {
  return <>{renderLink(props)}</>;
}

/**
 * Partner-demo activity card: recent pieces, recent CMS publishes, GEO/LLM snapshot.
 * Data comes from `loadCommandCenterSummary` (`recentPieces` + `recentPublishes`).
 */
export function AutopilotActivityPanel({
  projectId,
  settings,
  commandCenter,
  pieces,
  articleUsage,
  renderLink,
  onSaveAutopilot,
  savingAutopilot = false,
  saveAutopilotError = null,
  compact = false,
}: {
  projectId: number;
  settings: DashboardAutopilotSettings | null;
  commandCenter: DashboardCommandCenter;
  pieces: DashboardPiece[];
  articleUsage?: DashboardArticleUsage | null;
  renderLink: (props: DashboardLinkProps) => ReactNode;
  onSaveAutopilot?: (payload: DashboardAutopilotSavePayload) => void | Promise<void>;
  savingAutopilot?: boolean;
  saveAutopilotError?: string | null;
  /** Settings + meta only — use when the dashboard already shows a recent table. */
  compact?: boolean;
}) {
  const byStatus = countByStatus(pieces);
  const generating = byStatus.generating ?? 0;
  const drafts = byStatus.draft ?? 0;
  const published = (byStatus.published ?? 0) + (byStatus.ready ?? 0);

  const recentPieces =
    commandCenter.recentPieces && commandCenter.recentPieces.length > 0
      ? commandCenter.recentPieces
      : pieces.slice(0, 5).map((piece) => ({
          id: piece.id,
          title: piece.title,
          status: piece.status,
          updatedAt: "",
        }));

  const recentPublishes = commandCenter.recentPublishes ?? [];
  const publishOk = recentPublishes.filter((row) => row.status === "published").length;
  const publishFail = recentPublishes.filter((row) => row.status === "failed").length;
  const linkChipLabel = formatInternalLinksChipLabel({
    coveragePercent: commandCenter.internalLinkCoverage,
    orphanCount: commandCenter.internalLinkOrphanCount,
    suggestionCount: commandCenter.internalLinkSuggestions ?? 0,
  });

  const metaParts: string[] = [];
  if (settings?.enabled) {
    metaParts.push(
      `${settings.cadence === "daily" ? "Daily" : "Weekly"} · ${settings.publishMode ?? "review"}`,
    );
  }
  if (articleUsage) metaParts.push(formatArticleUsageLabel(articleUsage));
  if (linkChipLabel) metaParts.push(linkChipLabel);

  const snapshotParts = [
    `${generating + drafts} drafts`,
    `${published} published`,
    commandCenter.latestGeoScore != null ? `GEO ${commandCenter.latestGeoScore}` : null,
    commandCenter.llmCitationRate != null ? `${commandCenter.llmCitationRate}% cited` : null,
  ].filter(Boolean);

  if (compact) {
    return (
      <section className="paper-card overflow-hidden" aria-labelledby="autopilot-activity-heading">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-secondary/25 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id="autopilot-activity-heading" className="text-base font-semibold tracking-tight">
              Autopilot
            </h2>
            {metaParts.length > 0 ? (
              <p className="mt-1.5 text-sm text-muted-foreground">{metaParts.join(" · ")}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-3 text-xs font-medium text-muted-foreground">
            <DashLink
              renderLink={renderLink}
              href={`/projects/${projectId}?tab=publishing`}
              className="transition-colors hover:text-foreground"
            >
              Publishing
            </DashLink>
          </div>
        </div>
        <div className="space-y-3 p-5 sm:p-6">
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
          {snapshotParts.length > 0 ? (
            <p className="text-sm text-muted-foreground">{snapshotParts.join(" · ")}</p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="paper-card overflow-hidden" aria-labelledby="autopilot-activity-heading">
      <div className="border-b border-border bg-secondary/25 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h2 id="autopilot-activity-heading" className="text-base font-semibold tracking-tight">
              Autopilot
            </h2>
            {metaParts.length > 0 ? (
              <p className="mt-1.5 text-sm text-muted-foreground">{metaParts.join(" · ")}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-3 text-xs font-medium text-muted-foreground">
            <DashLink
              renderLink={renderLink}
              href="/search/visibility"
              className="transition-colors hover:text-foreground"
            >
              Visibility
            </DashLink>
            <span aria-hidden className="text-border">
              ·
            </span>
            <DashLink
              renderLink={renderLink}
              href={`/projects/${projectId}?tab=publishing`}
              className="transition-colors hover:text-foreground"
            >
              Publishing
            </DashLink>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
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

        {snapshotParts.length > 0 ? (
          <p className="mb-5 text-sm text-muted-foreground">
            {snapshotParts.map((part, i) => (
              <span key={part}>
                {i > 0 ? <span className="mx-1.5 text-border">·</span> : null}
                {part?.startsWith("GEO ") ? (
                  <DashLink
                    renderLink={renderLink}
                    href="/audit"
                    className="font-medium text-foreground/80 transition-colors hover:text-foreground"
                  >
                    {part}
                  </DashLink>
                ) : part?.includes("% cited") ? (
                  <DashLink
                    renderLink={renderLink}
                    href="/search/visibility"
                    className="font-medium text-foreground/80 transition-colors hover:text-foreground"
                  >
                    {part}
                  </DashLink>
                ) : (
                  part
                )}
              </span>
            ))}
          </p>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          <div>
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Recent content
              </p>
              <DashLink
                renderLink={renderLink}
                href={`/projects/${projectId}/content-studio`}
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Studio <ArrowRight className="h-3 w-3" aria-hidden />
              </DashLink>
            </div>
            {recentPieces.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No content pieces yet
              </p>
            ) : (
              <ul className="space-y-0.5">
                {recentPieces.map((piece) => (
                  <li key={piece.id}>
                    <DashLink
                      renderLink={renderLink}
                      href={contentPiecePath(projectId, piece.id)}
                      className="group flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-secondary/50"
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {piece.title || "Untitled"}
                      </span>
                      <StatusBadge status={piece.status} />
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                    </DashLink>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Recent publishes
                {recentPublishes.length > 0 ? (
                  <span className="ml-1.5 font-normal normal-case tracking-normal text-muted-foreground/80">
                    ({publishOk} ok
                    {publishFail > 0 ? ` · ${publishFail} failed` : ""})
                  </span>
                ) : null}
              </p>
              <DashLink
                renderLink={renderLink}
                href={`/projects/${projectId}?tab=publishing`}
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                History <ArrowRight className="h-3 w-3" aria-hidden />
              </DashLink>
            </div>
            {recentPublishes.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">
                No CMS publishes yet
              </p>
            ) : (
              <ul className="space-y-0.5">
                {recentPublishes.map((record) => {
                  const title =
                    record.pieceTitle?.trim() || `Piece #${record.contentPieceId}`;
                  const when = formatWhen(record.publishedAt ?? record.createdAt);
                  const ok = record.status === "published";
                  const failed = record.status === "failed";
                  return (
                    <li
                      key={record.id}
                      className="flex items-start gap-2 rounded-lg px-2 py-2"
                    >
                      {failed ? (
                        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" aria-hidden />
                      ) : (
                        <CheckCircle2
                          className={cn(
                            "mt-0.5 h-3.5 w-3.5 shrink-0",
                            ok ? "text-emerald-600" : "text-amber-600",
                          )}
                          aria-hidden
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <DashLink
                          renderLink={renderLink}
                          href={contentPiecePath(projectId, record.contentPieceId)}
                          className="block truncate text-sm font-medium hover:underline"
                        >
                          {title}
                        </DashLink>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          <span className="capitalize">{record.provider.replace(/_/g, " ")}</span>
                          {" · "}
                          <span className="capitalize">{record.status}</span>
                          {when ? ` · ${when}` : ""}
                          {failed && record.errorMessage
                            ? ` · ${record.errorMessage}`
                            : ""}
                        </p>
                      </div>
                      {record.remoteUrl ? (
                        <a
                          href={record.remoteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                          aria-label="Open published URL"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
