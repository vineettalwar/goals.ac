import { useMemo, useState, type ReactNode } from "react";
import { PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import {
  ArrowUpDown,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { cn } from "../cn";
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

function FormatBadge({ formatType }: { formatType: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
      <FileText className="h-3 w-3" aria-hidden />
      {formatTypeLabel(formatType)}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const dot = STATUS_DOT_COLORS[status] ?? "bg-muted-foreground";
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
      {statusLabel(status)}
    </span>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  icon,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  icon?: ReactNode;
  ariaLabel: string;
}) {
  return (
    <div className="relative">
      {icon ? (
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
      ) : null}
      <select
        aria-label={ariaLabel}
        className={cn(
          "h-8 rounded-lg border border-dashed border-input bg-card px-2 text-xs",
          icon && "pl-7",
        )}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function StudioPieceCard({
  piece,
  renderLink,
  viewMode,
  onDelete,
  onMarkReady,
  deletingId,
  markingReadyId,
}: {
  piece: StudioPiece;
  renderLink: (props: StudioLinkProps) => ReactNode;
  viewMode: HubViewMode;
  onDelete?: (id: number) => void | Promise<void>;
  onMarkReady?: (id: number) => void | Promise<void>;
  deletingId?: number | null;
  markingReadyId?: number | null;
}) {
  const isDeleting = deletingId === piece.id;
  const isMarkingReady = markingReadyId === piece.id;

  return (
    <div
      className={cn(
        "paper-card group flex rounded-xl p-5",
        viewMode === "grid" ? "h-full flex-col gap-3" : "items-start justify-between gap-4",
      )}
    >
      <div className="min-w-0 flex-1">
        <StudioLink
          renderLink={renderLink}
          href={studioContentPiecePath(piece.id)}
          className="block truncate font-medium hover:text-primary"
        >
          {piece.title}
        </StudioLink>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <FormatBadge formatType={piece.formatType} />
          {piece.targetKeyword ? (
            <span className="text-xs text-muted-foreground">{piece.targetKeyword}</span>
          ) : null}
          <span className="text-xs text-muted-foreground">{piece.wordCount} words</span>
          {piece.plannedDate ? (
            <span className="text-xs text-muted-foreground">· {piece.plannedDate}</span>
          ) : null}
        </div>
      </div>
      <div className={cn("flex shrink-0 items-center gap-2", viewMode === "grid" && "justify-between")}>
        <StatusBadge status={piece.status} />
        {piece.status === "draft" && onMarkReady ? (
          <button
            type="button"
            title="Mark ready"
            disabled={isMarkingReady || isDeleting}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
            onClick={() => void onMarkReady(piece.id)}
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
        {contentPieceCanGenerate(piece.status) ? (
          <StudioLink
            renderLink={renderLink}
            href={`${studioContentPiecePath(piece.id)}?generate=1`}
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-primary transition-colors hover:bg-secondary"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Generate
          </StudioLink>
        ) : null}
        <StudioLink
          renderLink={renderLink}
          href={studioContentPiecePath(piece.id)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </StudioLink>
        {onDelete ? (
          <button
            type="button"
            title="Delete"
            disabled={isDeleting || isMarkingReady}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50"
            onClick={() => {
              if (window.confirm(`Delete "${piece.title}"? This cannot be undone.`)) {
                void onDelete(piece.id);
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
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
    <div className="space-y-4">
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
          icon={<ArrowUpDown className="h-3 w-3" aria-hidden />}
          options={[
            { value: "newest", label: "Newest first" },
            { value: "oldest", label: "Oldest first" },
            { value: "words_desc", label: "Most words" },
            { value: "words_asc", label: "Fewest words" },
            { value: "title_asc", label: "A → Z" },
          ]}
        />
        <div className="ml-auto flex rounded-lg border border-input p-0.5">
          <button
            type="button"
            aria-label="List view"
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-md",
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
              "inline-flex h-7 w-7 items-center justify-center rounded-md",
              viewMode === "grid" ? "bg-secondary text-foreground" : "text-muted-foreground",
            )}
            onClick={() => onViewModeChange("grid")}
          >
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-lg px-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            onClick={onClearFilters}
          >
            <RefreshCw className="mr-1 h-3 w-3" aria-hidden />
            Clear
          </button>
        ) : null}
      </div>

      {totalCount > 0 ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{totalCount} total</span>
          {statsBreakdown.map((stat) => (
            <span key={stat.label} className="flex items-center gap-1.5">
              <span className="h-3 w-px bg-border" />
              <span className={cn("font-medium", stat.color)}>{stat.count}</span>
              <span>{stat.label}</span>
            </span>
          ))}
        </div>
      ) : null}
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
  renderLink,
  onDeletePiece,
  onMarkReady,
  onReschedulePiece,
  deletingId = null,
  markingReadyId = null,
  reschedulingId = null,
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
  renderLink: (props: StudioLinkProps) => ReactNode;
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
    <div className="max-w-6xl space-y-6 px-8 py-8">
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
            <h1 className="text-2xl font-bold">Content Studio</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate, manage and schedule AI-powered content
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
            <div className="paper-card flex flex-col items-center justify-center rounded-xl p-16 text-center">
              <FileText className="mb-3 h-10 w-10 text-muted-foreground" aria-hidden />
              <p className="font-medium">
                {pieces.length === 0 ? "No content yet" : "No items match filters"}
              </p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                {pieces.length === 0
                  ? "Create your first draft with the button above, then open it to generate or edit."
                  : "Try clearing filters to see all content."}
              </p>
              {pieces.length === 0 ? <div className="mt-4">{newContentAction}</div> : null}
            </div>
          ) : (
            <div
              className={cn(
                viewMode === "grid"
                  ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
                  : "space-y-3",
              )}
            >
              {sorted.map((piece) => (
                <StudioPieceCard
                  key={piece.id}
                  piece={piece}
                  renderLink={renderLink}
                  viewMode={viewMode}
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
