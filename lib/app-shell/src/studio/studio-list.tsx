import { type ReactNode } from "react";
import {
  CheckCircle2,
  LayoutGrid,
  List,
  Trash2,
} from "lucide-react";
import { cn } from "../cn";
import { contentPieceCanGenerate } from "../content-piece/types";
import {
  formatTypeLabel,
  STUDIO_FORMAT_OPTIONS,
  studioContentPiecePath,
  statusLabel,
  type StudioLinkProps,
  type StudioPiece,
  type StudioSortKey,
} from "./types";

export function StudioLink({
  renderLink,
  ...props
}: StudioLinkProps & { renderLink: (props: StudioLinkProps) => ReactNode }) {
  return <>{renderLink(props)}</>;
}

const STATUS_DOT_COLORS: Record<string, string> = {
  draft: "bg-amber-500",
  ready: "bg-emerald-500",
  published: "bg-blue-500",
  prepared: "bg-violet-500",
  generating: "bg-amber-400",
  failed: "bg-red-500",
};

function StatusBadge({ status }: { status: string }) {
  const dot = STATUS_DOT_COLORS[status] ?? "bg-muted-foreground";
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot)} aria-hidden />
      {statusLabel(status)}
    </span>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  ariaLabel: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-foreground"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function StudioPieceCard({
  piece,
  projectId,
  renderLink,
  viewMode,
  renderPieceExtras,
  onDelete,
  onMarkReady,
  deletingId,
  markingReadyId,
}: {
  piece: StudioPiece;
  projectId: string;
  renderLink: (props: StudioLinkProps) => ReactNode;
  viewMode: HubViewMode;
  renderPieceExtras?: (piece: StudioPiece) => ReactNode;
  onDelete?: (id: number) => void | Promise<void>;
  onMarkReady?: (id: number) => void | Promise<void>;
  deletingId?: number | null;
  markingReadyId?: number | null;
}) {
  const isDeleting = deletingId === piece.id;
  const isMarkingReady = markingReadyId === piece.id;
  const pieceHref = studioContentPiecePath(projectId, piece.id);
  const extras = renderPieceExtras?.(piece);

  const metaParts = [
    formatTypeLabel(piece.formatType),
    piece.isRefresh ? "Refresh" : null,
    piece.targetKeyword || null,
    `${piece.wordCount ?? 0} words`,
    piece.plannedDate || null,
  ].filter(Boolean);

  return (
    <div
      className={cn(
        "flex gap-4",
        viewMode === "grid"
          ? "h-full flex-col rounded-lg border border-border bg-card p-5"
          : "items-start justify-between gap-6 py-5",
      )}
    >
      <div className="min-w-0 flex-1">
        <StudioLink
          renderLink={renderLink}
          href={pieceHref}
          className="block truncate text-sm font-medium hover:text-primary"
        >
          {piece.title ?? "Untitled"}
        </StudioLink>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {metaParts.map((part, index) => (
            <span key={`${part}-${index}`} className="inline-flex items-center gap-2">
              {index > 0 ? <span aria-hidden>·</span> : null}
              {part}
            </span>
          ))}
          {extras}
        </div>
      </div>
      <div
        className={cn(
          "flex shrink-0 items-center gap-1",
          viewMode === "grid" && "w-full justify-between border-t border-border pt-3",
        )}
      >
        <StatusBadge status={piece.status} />
        <div className="flex items-center gap-0.5">
          {piece.status === "draft" && onMarkReady ? (
            <button
              type="button"
              title="Mark ready"
              disabled={isMarkingReady || isDeleting}
              className="inline-flex h-8 items-center rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
              onClick={() => void onMarkReady(piece.id)}
            >
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden />
              Ready
            </button>
          ) : null}
          {contentPieceCanGenerate(piece.status) ? (
            <StudioLink
              renderLink={renderLink}
              href={`${pieceHref}?generate=1`}
              className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-secondary"
            >
              Generate
            </StudioLink>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              title="Delete"
              disabled={isDeleting || isMarkingReady}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              onClick={() => {
                if (window.confirm(`Delete "${piece.title ?? "Untitled"}"? This cannot be undone.`)) {
                  void onDelete(piece.id);
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export type HubViewMode = "list" | "grid";

function StudioHubFilters({
  filterFormat,
  filterStatus,
  sortKey,
  viewMode,
  totalCount,
  statsBreakdown,
  onFilterFormatChange,
  onFilterStatusChange,
  onSortKeyChange,
  onViewModeChange,
  onClearFilters,
}: {
  filterFormat: string;
  filterStatus: string;
  sortKey: StudioSortKey;
  viewMode: HubViewMode;
  totalCount: number;
  statsBreakdown: Array<{ label: string; count: number; color: string }>;
  onFilterFormatChange: (value: string) => void;
  onFilterStatusChange: (value: string) => void;
  onSortKeyChange: (value: StudioSortKey) => void;
  onViewModeChange: (value: HubViewMode) => void;
  onClearFilters: () => void;
}) {
  const hasActiveFilters = filterFormat !== "all" || filterStatus !== "all";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <FilterSelect
        value={filterFormat}
        onChange={onFilterFormatChange}
        ariaLabel="Filter by format"
        options={[
          { value: "all", label: "All formats" },
          ...STUDIO_FORMAT_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          })),
        ]}
      />
      <FilterSelect
        value={filterStatus}
        onChange={onFilterStatusChange}
        ariaLabel="Filter by status"
        options={[
          { value: "all", label: "All statuses" },
          { value: "draft", label: "Draft" },
          { value: "ready", label: "Ready" },
          { value: "published", label: "Published" },
          { value: "prepared", label: "Prepared" },
        ]}
      />
      <FilterSelect
        value={sortKey}
        onChange={(value) => onSortKeyChange(value as StudioSortKey)}
        ariaLabel="Sort content"
        options={[
          { value: "newest", label: "Newest first" },
          { value: "oldest", label: "Oldest first" },
          { value: "words_desc", label: "Most words" },
          { value: "words_asc", label: "Fewest words" },
          { value: "title_asc", label: "A → Z" },
        ]}
      />
      {totalCount > 0 ? (
        <p className="text-sm text-muted-foreground">
          {totalCount} total
          {statsBreakdown.length > 0
            ? ` · ${statsBreakdown.map((stat) => `${stat.count} ${stat.label}`).join(" · ")}`
            : ""}
        </p>
      ) : null}
      <div className="ml-auto flex items-center gap-2">
        {hasActiveFilters ? (
          <button
            type="button"
            className="h-9 px-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            onClick={onClearFilters}
          >
            Clear filters
          </button>
        ) : null}
        <div className="flex rounded-md border border-input p-0.5">
          <button
            type="button"
            aria-label="List view"
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-sm",
              viewMode === "list" ? "bg-secondary text-foreground" : "text-muted-foreground",
            )}
            onClick={() => onViewModeChange("list")}
          >
            <List className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Grid view"
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-sm",
              viewMode === "grid" ? "bg-secondary text-foreground" : "text-muted-foreground",
            )}
            onClick={() => onViewModeChange("grid")}
          >
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

export function StudioHubPanel({
  projectId,
  pieces,
  sorted,
  loading,
  filterFormat,
  filterStatus,
  sortKey,
  viewMode,
  statsBreakdown,
  newContentAction,
  ideasPanel,
  renderLink,
  renderPieceExtras,
  onDeletePiece,
  onMarkReady,
  deletingId,
  markingReadyId,
  onFilterFormatChange,
  onFilterStatusChange,
  onSortKeyChange,
  onViewModeChange,
  onClearFilters,
  onBrowseIdeas,
}: {
  projectId: string;
  pieces: StudioPiece[];
  sorted: StudioPiece[];
  loading: boolean;
  filterFormat: string;
  filterStatus: string;
  sortKey: StudioSortKey;
  viewMode: HubViewMode;
  statsBreakdown: Array<{ label: string; count: number; color: string }>;
  newContentAction: ReactNode;
  ideasPanel?: ReactNode;
  renderLink: (props: StudioLinkProps) => ReactNode;
  renderPieceExtras?: (piece: StudioPiece) => ReactNode;
  onDeletePiece?: (id: number) => void | Promise<void>;
  onMarkReady?: (id: number) => void | Promise<void>;
  deletingId?: number | null;
  markingReadyId?: number | null;
  onFilterFormatChange: (value: string) => void;
  onFilterStatusChange: (value: string) => void;
  onSortKeyChange: (value: StudioSortKey) => void;
  onViewModeChange: (value: HubViewMode) => void;
  onClearFilters: () => void;
  onBrowseIdeas: () => void;
}) {
  return (
    <div className="space-y-5">
      <StudioHubFilters
        filterFormat={filterFormat}
        filterStatus={filterStatus}
        sortKey={sortKey}
        viewMode={viewMode}
        totalCount={pieces.length}
        statsBreakdown={statsBreakdown}
        onFilterFormatChange={onFilterFormatChange}
        onFilterStatusChange={onFilterStatusChange}
        onSortKeyChange={onSortKeyChange}
        onViewModeChange={onViewModeChange}
        onClearFilters={onClearFilters}
      />

      {loading ? (
        <div className="flex items-center justify-center p-16 text-sm text-muted-foreground">
          Loading content…
        </div>
      ) : sorted.length === 0 ? (
        <div className="py-16">
          {pieces.length === 0 ? (
            <>
              <h2 className="text-base font-semibold">No content yet</h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                Create a draft, or pick a keyword from Ideas.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                {projectId ? (
                  <StudioLink
                    renderLink={renderLink}
                    href={`/projects/${projectId}/daily-five`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    This week&apos;s queue
                  </StudioLink>
                ) : null}
                {projectId ? (
                  <StudioLink
                    renderLink={renderLink}
                    href={`/projects/${projectId}/content-studio?optimize=1`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Optimize a page
                  </StudioLink>
                ) : null}
                {ideasPanel ? (
                  <button
                    type="button"
                    className="text-sm font-medium text-primary transition-colors hover:underline"
                    onClick={onBrowseIdeas}
                  >
                    Browse article ideas
                  </button>
                ) : projectId ? (
                  <StudioLink
                    renderLink={renderLink}
                    href="/search/keywords?tab=ideas"
                    className="text-sm font-medium text-primary transition-colors hover:underline"
                  >
                    Browse keyword ideas
                  </StudioLink>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <p className="font-medium">No items match filters</p>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                Clear filters to see all content.
              </p>
              <button
                type="button"
                className="mt-5 inline-flex h-9 items-center justify-center rounded-lg border border-input bg-card px-4 text-sm font-medium transition-colors hover:bg-secondary"
                onClick={onClearFilters}
              >
                Clear filters
              </button>
            </>
          )}
        </div>
      ) : (
        <div
          className={cn(
            viewMode === "grid"
              ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
              : "divide-y divide-border border-t border-border",
          )}
        >
          {sorted.map((piece) => (
            <StudioPieceCard
              key={piece.id}
              piece={piece}
              projectId={projectId}
              renderLink={renderLink}
              viewMode={viewMode}
              renderPieceExtras={renderPieceExtras}
              onDelete={onDeletePiece}
              onMarkReady={onMarkReady}
              deletingId={deletingId}
              markingReadyId={markingReadyId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
