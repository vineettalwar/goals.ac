import type { ReactNode } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileText,
  Link2,
  ScanSearch,
  XCircle,
  Zap,
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

const STATUS_BADGE: Record<string, string> = {
  ready: "bg-emerald-100 text-emerald-800",
  published: "bg-primary text-primary-foreground",
  generating: "bg-amber-100 text-amber-800",
  pending: "bg-muted text-muted-foreground",
  draft: "bg-muted text-muted-foreground",
  failed: "bg-red-100 text-red-800",
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
  const linkSuggestionCount = commandCenter.internalLinkSuggestions ?? 0;
  const hasLinkMap = commandCenter.internalLinkCoverage != null;

  return (
    <div className="paper-card mb-8 p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Zap className="h-4 w-4 text-primary" /> Autopilot activity
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {settings?.enabled
              ? `${settings.cadence === "daily" ? "Daily" : "Weekly"} · ${settings.publishMode ?? "review"} publish mode`
              : onSaveAutopilot
                ? "Autopilot is off — enable below"
                : "Autopilot is off — enable on Publishing"}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {articleUsage ? (
              <p className="inline-flex items-center rounded-md border border-border bg-secondary/40 px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                <FileText className="mr-1.5 h-3 w-3 shrink-0" />
                {formatArticleUsageLabel(articleUsage)}
              </p>
            ) : null}
            {linkSuggestionCount > 0 ? (
              <DashLink
                renderLink={renderLink}
                href="/internal-links"
                className="inline-flex items-center rounded-md border border-border bg-secondary/40 px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <Link2 className="mr-1.5 h-3 w-3 shrink-0" />
                {linkSuggestionCount} link suggestion
                {linkSuggestionCount === 1 ? "" : "s"}
              </DashLink>
            ) : !hasLinkMap ? (
              <DashLink
                renderLink={renderLink}
                href="/internal-links"
                className="inline-flex items-center rounded-md border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <Link2 className="mr-1.5 h-3 w-3 shrink-0" />
                No link map yet
              </DashLink>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <DashLink
            renderLink={renderLink}
            href="/search/visibility"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-card px-3 text-xs font-medium"
          >
            Visibility
          </DashLink>
          <DashLink
            renderLink={renderLink}
            href={`/projects/${projectId}?tab=publishing`}
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-card px-3 text-xs font-medium"
          >
            Publishing
          </DashLink>
        </div>
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

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-secondary/40 px-3 py-3 text-center">
          <p className="text-2xl font-bold">{generating + drafts}</p>
          <p className="mt-1 text-xs text-muted-foreground">Drafts / generating</p>
        </div>
        <div className="rounded-lg bg-secondary/40 px-3 py-3 text-center">
          <p className="text-2xl font-bold">{published}</p>
          <p className="mt-1 text-xs text-muted-foreground">Published pieces</p>
        </div>
        <DashLink
          renderLink={renderLink}
          href="/audit"
          className="rounded-lg bg-secondary/40 px-3 py-3 text-center transition-colors hover:bg-secondary/60"
        >
          <p className="text-2xl font-bold tabular-nums">
            {commandCenter.latestGeoScore != null ? commandCenter.latestGeoScore : "—"}
          </p>
          <p className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <ScanSearch className="h-3 w-3" /> GEO score
          </p>
        </DashLink>
        <DashLink
          renderLink={renderLink}
          href="/search/visibility"
          className="rounded-lg bg-secondary/40 px-3 py-3 text-center transition-colors hover:bg-secondary/60"
        >
          <p className="text-2xl font-bold tabular-nums">
            {commandCenter.llmCitationRate != null ? `${commandCenter.llmCitationRate}%` : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">LLM citation</p>
        </DashLink>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recent content
            </p>
            <DashLink
              renderLink={renderLink}
              href={`/projects/${projectId}/content-studio`}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Studio <ArrowRight className="h-3 w-3" />
            </DashLink>
          </div>
          {recentPieces.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              No content pieces yet
            </p>
          ) : (
            <ul className="space-y-1">
              {recentPieces.map((piece) => (
                <li key={piece.id}>
                  <DashLink
                    renderLink={renderLink}
                    href={contentPiecePath(projectId, piece.id)}
                    className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-secondary/50"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              History <ArrowRight className="h-3 w-3" />
            </DashLink>
          </div>
          {recentPublishes.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              No CMS publishes yet
            </p>
          ) : (
            <ul className="space-y-1">
              {recentPublishes.map((record) => {
                const title =
                  record.pieceTitle?.trim() || `Piece #${record.contentPieceId}`;
                const when = formatWhen(record.publishedAt ?? record.createdAt);
                const ok = record.status === "published";
                const failed = record.status === "failed";
                return (
                  <li
                    key={record.id}
                    className="flex items-start gap-2 rounded-lg px-2 py-1.5"
                  >
                    {failed ? (
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
                    ) : (
                      <CheckCircle2
                        className={cn(
                          "mt-0.5 h-3.5 w-3.5 shrink-0",
                          ok ? "text-emerald-600" : "text-amber-600",
                        )}
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
                        className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
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
  );
}
