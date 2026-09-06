import { useMemo, useState, type ReactNode } from "react";
import { PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import {
  CalendarDays,
  CheckCircle2,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { cn } from "../cn";
import { APP_SHELL_PAGE_WIDE } from "../shell-constants";
import { contentPieceCanGenerate } from "../content-piece/types";
import { BrandAiProfileCard, StudioAiReadinessBanner, type BrandProfileSummary } from "./brand-ai-profile-card";
import { StudioCalendarView } from "./studio-calendar";
import {
  filterStudioPieces,
  formatTypeLabel,
  sortStudioPieces,
  statusLabel,
  STUDIO_FORMAT_OPTIONS,
  studioContentPiecePath,
  studioProjectPath,
  studioStatusCounts,
  type StudioLinkProps,
  type StudioPiece,
  type StudioSortKey,
} from "./types";

function StudioLink({
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

type StudioTab = "hub" | "calendar";
type HubViewMode = "list" | "grid";

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
      className="h-8 rounded-md border border-input bg-transparent px-2 text-xs text-foreground"
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
          ? "h-full flex-col rounded-lg border border-border bg-card p-4"
          : "items-start justify-between py-3.5",
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
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
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
    <div className="flex flex-wrap items-center gap-2">
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
        <p className="text-xs text-muted-foreground">
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
            className="h-8 px-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
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
              "inline-flex h-7 w-7 items-center justify-center rounded-sm",
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
              "inline-flex h-7 w-7 items-center justify-center rounded-sm",
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

export function StudioView({
  projectId,
  projectName,
  pieces,
  loading,
  newContentAction,
  newContentNote,
  brandProfile = null,
  brandProfileLoading = false,
  aiReady = null,
  activeProvider = "gemini",
  aiSettingsHref = "/settings",
  renderLink,
  onDeletePiece,
  onMarkReady,
  onReschedulePiece,
  deletingId = null,
  markingReadyId = null,
  reschedulingId = null,
  renderPieceExtras,
}: {
  projectId: string;
  projectName: string | null;
  pieces: StudioPiece[];
  loading: boolean;
  newContentAction: ReactNode;
  newContentNote?: ReactNode;
  brandProfile?: BrandProfileSummary | null;
  brandProfileLoading?: boolean;
  aiReady?: boolean | null;
  activeProvider?: string;
  /** Where the AI-not-ready banner sends users (Next: `/integrations/ai`). */
  aiSettingsHref?: string;
  renderLink: (props: StudioLinkProps) => ReactNode;
  /** Host-only hub card extras (e.g. Next ArticlePerformanceBadge). */
  renderPieceExtras?: (piece: StudioPiece) => ReactNode;
  onDeletePiece?: (id: number) => void | Promise<void>;
  onMarkReady?: (id: number) => void | Promise<void>;
  onReschedulePiece?: (id: number, plannedDate: string | null) => void | Promise<void>;
  deletingId?: number | null;
  markingReadyId?: number | null;
  reschedulingId?: number | null;
}) {
  const [activeTab, setActiveTab] = useState<StudioTab>("hub");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFormat, setFilterFormat] = useState("all");
  const [sortKey, setSortKey] = useState<StudioSortKey>("newest");
  const [viewMode, setViewMode] = useState<HubViewMode>("list");
  const [activeDragId, setActiveDragId] = useState<number | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const filtered = useMemo(
    () => filterStudioPieces(pieces, filterStatus, filterFormat),
    [pieces, filterStatus, filterFormat],
  );
  const sorted = useMemo(() => sortStudioPieces(filtered, sortKey), [filtered, sortKey]);
  const statsBreakdown = useMemo(() => studioStatusCounts(pieces), [pieces]);
  const scheduledCount = pieces.filter((piece) => piece.plannedDate).length;

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    if (!onReschedulePiece) return;
    const { active, over } = event;
    if (!over) return;
    const pieceId = Number(String(active.id).replace("piece-", ""));
    const newDate = String(over.id).replace("day-", "");
    if (newDate === "Unscheduled") {
      void onReschedulePiece(pieceId, null);
      return;
    }
    void onReschedulePiece(pieceId, newDate);
  }

  return (
    <div className={`${APP_SHELL_PAGE_WIDE} space-y-6`}>
      <div className="mb-2">
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <StudioLink
            renderLink={renderLink}
            href="/dashboard"
            className="transition-colors hover:text-foreground"
          >
            Dashboard
          </StudioLink>
          <span aria-hidden>›</span>
          {projectId ? (
            <>
              <StudioLink
                renderLink={renderLink}
                href={studioProjectPath(projectId)}
                className="transition-colors hover:text-foreground"
              >
                {projectName || "Project"}
              </StudioLink>
              <span aria-hidden>›</span>
            </>
          ) : null}
          <span className="text-foreground">Content Studio</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Content Studio</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Draft, manage, and schedule content
              {projectName ? ` for ${projectName}` : ""}.
            </p>
          </div>
          {newContentAction}
        </div>
      </div>

      {newContentNote ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground">
          {newContentNote}
        </div>
      ) : null}

      <BrandAiProfileCard profile={brandProfile} loading={brandProfileLoading} />

      <StudioAiReadinessBanner
        ready={aiReady}
        activeProvider={activeProvider}
        settingsHref={aiSettingsHref}
        renderLink={renderLink}
      />

      <div className="flex gap-1 border-b border-border">
        <button
          type="button"
          className={cn(
            "-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "hub"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setActiveTab("hub")}
        >
          <LayoutGrid className="h-4 w-4" aria-hidden />
          Hub
          {pieces.length > 0 ? (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {pieces.length}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          className={cn(
            "-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "calendar"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setActiveTab("calendar")}
        >
          <CalendarDays className="h-4 w-4" aria-hidden />
          Calendar
          {scheduledCount > 0 ? (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {scheduledCount}
            </span>
          ) : null}
        </button>
      </div>

      {activeTab === "hub" ? (
        <>
          <StudioHubFilters
            filterFormat={filterFormat}
            filterStatus={filterStatus}
            sortKey={sortKey}
            viewMode={viewMode}
            totalCount={pieces.length}
            statsBreakdown={statsBreakdown}
            onFilterFormatChange={setFilterFormat}
            onFilterStatusChange={setFilterStatus}
            onSortKeyChange={setSortKey}
            onViewModeChange={setViewMode}
            onClearFilters={() => {
              setFilterFormat("all");
              setFilterStatus("all");
            }}
          />

          {loading ? (
            <div className="flex items-center justify-center p-16 text-sm text-muted-foreground">
              Loading content…
            </div>
          ) : sorted.length === 0 ? (
            <div className="py-12">
              {pieces.length === 0 ? (
                <>
                  <h2 className="text-base font-semibold">No content yet</h2>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    Start from a keyword, or optimize a live page.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    {newContentAction}
                    {projectId ? (
                      <StudioLink
                        renderLink={renderLink}
                        href={`/projects/${projectId}/content-studio?optimize=1`}
                        className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-input bg-card px-4 text-sm font-medium transition-colors hover:bg-secondary"
                      >
                        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                        Optimize a page
                      </StudioLink>
                    ) : null}
                    {projectId ? (
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
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    Clear filters to see all content.
                  </p>
                  <button
                    type="button"
                    className="mt-4 inline-flex h-9 items-center justify-center rounded-lg border border-input bg-card px-4 text-sm font-medium transition-colors hover:bg-secondary"
                    onClick={() => {
                      setFilterFormat("all");
                      setFilterStatus("all");
                    }}
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
                  ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
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
        </>
      ) : loading ? (
        <div className="flex items-center justify-center p-16 text-sm text-muted-foreground">
          Loading calendar…
        </div>
      ) : (
        <StudioCalendarView
          pieces={pieces}
          reschedulingId={reschedulingId}
          sensors={sensors}
          onDragStart={setActiveDragId}
          onDragEnd={handleDragEnd}
          activeDragId={activeDragId}
        />
      )}
    </div>
  );
}

export function StudioNewContentButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
      onClick={onClick}
    >
      <Plus className="mr-1.5 h-4 w-4" aria-hidden />
      Create content
    </button>
  );
}
