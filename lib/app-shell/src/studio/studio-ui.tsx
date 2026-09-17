import { useMemo, useState, type ReactNode } from "react";
import { PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { cn } from "../cn";
import { APP_SHELL_PAGE_WIDE } from "../shell-constants";
import { BrandAiProfileCard, StudioAiReadinessBanner, type BrandProfileSummary } from "./brand-ai-profile-card";
import { StudioCalendarView } from "./studio-calendar";
import { StudioHubPanel, StudioLink, type HubViewMode } from "./studio-list";
import {
  filterStudioPieces,
  sortStudioPieces,
  studioProjectPath,
  studioStatusCounts,
  type StudioLinkProps,
  type StudioPiece,
  type StudioSortKey,
} from "./types";

type StudioTab = "hub" | "calendar" | "ideas";

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
  ideasPanel,
  ideasCount,
  initialTab = "hub",
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
  /** Host-only article ideas list (Next Keyword opportunities hub). */
  ideasPanel?: ReactNode;
  ideasCount?: number;
  initialTab?: StudioTab;
  onDeletePiece?: (id: number) => void | Promise<void>;
  onMarkReady?: (id: number) => void | Promise<void>;
  onReschedulePiece?: (id: number, plannedDate: string | null) => void | Promise<void>;
  deletingId?: number | null;
  markingReadyId?: number | null;
  reschedulingId?: number | null;
}) {
  const [activeTab, setActiveTab] = useState<StudioTab>(
    ideasPanel && initialTab === "ideas" ? "ideas" : initialTab === "calendar" ? "calendar" : "hub",
  );
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

  function clearFilters() {
    setFilterFormat("all");
    setFilterStatus("all");
  }

  return (
    <div className={`${APP_SHELL_PAGE_WIDE} space-y-8`}>
      <header className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
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

        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <h1 className="min-w-0 text-2xl font-semibold tracking-tight">Content Studio</h1>
          {newContentAction}
        </div>
      </header>

      {newContentNote ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3.5 text-sm text-muted-foreground">
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

      <div className="space-y-6">
        <div className="flex gap-1 border-b border-border">
          <button
            type="button"
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
              activeTab === "hub"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setActiveTab("hub")}
          >
            Hub
            {pieces.length > 0 ? (
              <span className="inline-flex items-center rounded-sm bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                {pieces.length}
              </span>
            ) : null}
          </button>
          {ideasPanel ? (
            <button
              type="button"
              className={cn(
                "-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                activeTab === "ideas"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setActiveTab("ideas")}
            >
              Ideas
              {ideasCount ? (
                <span className="inline-flex items-center rounded-sm bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                  {ideasCount}
                </span>
              ) : null}
            </button>
          ) : null}
          <button
            type="button"
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
              activeTab === "calendar"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setActiveTab("calendar")}
          >
            Calendar
            {scheduledCount > 0 ? (
              <span className="inline-flex items-center rounded-sm bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                {scheduledCount}
              </span>
            ) : null}
          </button>
        </div>

      {activeTab === "hub" ? (
        <StudioHubPanel
          projectId={projectId}
          pieces={pieces}
          sorted={sorted}
          loading={loading}
          filterFormat={filterFormat}
          filterStatus={filterStatus}
          sortKey={sortKey}
          viewMode={viewMode}
          statsBreakdown={statsBreakdown}
          newContentAction={newContentAction}
          ideasPanel={ideasPanel}
          renderLink={renderLink}
          renderPieceExtras={renderPieceExtras}
          onDeletePiece={onDeletePiece}
          onMarkReady={onMarkReady}
          deletingId={deletingId}
          markingReadyId={markingReadyId}
          onFilterFormatChange={setFilterFormat}
          onFilterStatusChange={setFilterStatus}
          onSortKeyChange={setSortKey}
          onViewModeChange={setViewMode}
          onClearFilters={clearFilters}
          onBrowseIdeas={() => setActiveTab("ideas")}
        />
      ) : activeTab === "ideas" && ideasPanel ? (
        ideasPanel
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
    </div>
  );
}

export function StudioNewContentButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
      onClick={onClick}
    >
      <Plus className="mr-1.5 h-4 w-4" aria-hidden />
      Create
    </button>
  );
}
