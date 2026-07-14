"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  ExternalLink,
  FileText,
  Calendar,
  LayoutGrid,
  Trash2,
  CheckCircle2,
  RefreshCw,
  ArrowUpDown,
} from "lucide-react";
import { PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { aiProviderUnavailableMessage } from "@/lib/platform/ai-providers-status";
import type { AiProviderId } from "@workspace/ai-providers/config";
import { BrandAiProfileCard } from "./brand-ai-profile-card";
import { CreateContentModal, type BriefContentDraft } from "./create-content-modal";
import { loadContentStudioData, type LegacyItem } from "./content-studio-load-data";
import { FORMAT_OPTIONS } from "@/lib/content/content-format-options";
import type { CmsConnectionSnapshot } from "@/lib/projects/publishing-destinations";
import { cn } from "@/lib/utils";
import { MonthCalendar } from "./content-studio-calendar";
import { LegacyCard, StudioPieceCard } from "./content-studio-list-items";
import { ContentStudioHubFilters } from "./content-studio-hub-filters";
import {
  isStudioPiece,
  sortItems,
  type ContentPieceRow,
  type HubItem,
  type SortKey,
  type StudioPiece,
} from "./content-studio-utils";

export { FORMAT_OPTIONS };
export type { ContentPieceRow };

interface Props {
  projectId: string;
  initialBriefDraft?: BriefContentDraft | null;
  initialCreateOpen?: boolean;
}

type StudioLoadState = {
  projectName: string;
  aiReady: boolean | null;
  activeProvider: AiProviderId;
  pieces: StudioPiece[];
  legacyItems: LegacyItem[];
  cmsConnections: CmsConnectionSnapshot;
  primaryBlogDestination: string | null;
};

const initialStudioLoadState: StudioLoadState = {
  projectName: "",
  aiReady: null,
  activeProvider: "gemini",
  pieces: [],
  legacyItems: [],
  cmsConnections: {},
  primaryBlogDestination: null,
};

function studioLoadReducer(
  state: StudioLoadState,
  action:
    | { type: "load"; payload: StudioLoadState }
    | { type: "setPieces"; updater: (pieces: StudioPiece[]) => StudioPiece[] },
): StudioLoadState {
  if (action.type === "load") return action.payload;
  return { ...state, pieces: action.updater(state.pieces) };
}

export function ContentStudioClient({
  projectId,
  initialBriefDraft = null,
  initialCreateOpen = false,
}: Props) {
  const router = useRouter();
  const [studioData, dispatchStudioData] = useReducer(studioLoadReducer, initialStudioLoadState);
  const {
    projectName,
    aiReady,
    activeProvider,
    pieces,
    legacyItems,
    cmsConnections,
    primaryBlogDestination,
  } = studioData;
  const [tab, setTab] = useState<"hub" | "calendar">("hub");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(initialCreateOpen);
  const [briefDraft, setBriefDraft] = useState<BriefContentDraft | null>(initialBriefDraft);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [filterFormat, setFilterFormat] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [activeDragId, setActiveDragId] = useState<number | null>(null);
  const [reschedulingId, setReschedulingId] = useState<number | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const loadData = useCallback(async () => {
    const data = await loadContentStudioData(projectId);
    dispatchStudioData({
      type: "load",
      payload: {
        projectName: data.projectName,
        aiReady: data.aiReady,
        activeProvider: data.activeProvider,
        pieces: data.pieces,
        legacyItems: data.legacyItems,
        cmsConnections: data.cmsConnections,
        primaryBlogDestination: data.primaryBlogDestination,
      },
    });
  }, [projectId]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  async function handleDelete(pieceId: number) {
    if (!confirm("Delete this content piece?")) return;
    const res = await fetch(`/api/content-pieces/${pieceId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete");
      return;
    }
    dispatchStudioData({ type: "setPieces", updater: (prev) => prev.filter((p) => p.id !== pieceId) });
    toast.success("Deleted");
  }

  async function handleMarkReady(pieceId: number) {
    dispatchStudioData({ type: "setPieces", updater: (prev) => prev.map((p) => (p.id === pieceId ? { ...p, status: "ready" } : p)) });
    const res = await fetch(`/api/content-pieces/${pieceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ready" }),
    });
    if (!res.ok) {
      dispatchStudioData({ type: "setPieces", updater: (prev) => prev.map((p) => (p.id === pieceId ? { ...p, status: "draft" } : p)) });
      toast.error("Failed to update status");
    }
  }

  async function reschedulePiece(pieceId: number, plannedDate: string | null) {
    setReschedulingId(pieceId);
    const res = await fetch(`/api/content-pieces/${pieceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plannedDate, status: "ready" }),
    });
    setReschedulingId(null);
    if (!res.ok) {
      toast.error("Failed to reschedule");
      return;
    }
    const updated = (await res.json()) as ContentPieceRow;
    dispatchStudioData({
      type: "setPieces",
      updater: (prev) =>
        prev.map((p) =>
          p.id === pieceId ? { ...p, plannedDate: updated.plannedDate, status: updated.status } : p,
        ),
    });
  }

  const allItems: HubItem[] = useMemo(() => [...pieces, ...legacyItems], [pieces, legacyItems]);

  const filtered = allItems.filter((item) => {
    if (filterSource !== "all" && item.source !== filterSource) return false;
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    if (filterFormat !== "all") {
      if (!isStudioPiece(item)) return false;
      if (item.formatType !== filterFormat) return false;
    }
    return true;
  });

  const sorted = sortItems(filtered, sortKey);
  const studioSorted = sorted.filter(isStudioPiece);
  const legacySorted = sorted.filter((i) => !isStudioPiece(i)) as LegacyItem[];

  const statsBreakdown = [
    { label: "Studio", count: pieces.length, color: "text-primary" },
    { label: "Strategy Items", count: legacyItems.filter((i) => i.source === "content_strategy").length, color: "text-purple-500" },
    { label: "SEO Articles", count: legacyItems.filter((i) => i.source === "seo_article").length, color: "text-blue-500" },
    { label: "GEO Audits", count: legacyItems.filter((i) => i.source === "geo_audit").length, color: "text-emerald-500" },
    { label: "Roadmaps", count: legacyItems.filter((i) => i.source === "roadmap").length, color: "text-amber-500" },
  ].filter((s) => s.count > 0);

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;
    const pieceId = Number(String(active.id).replace("piece-", ""));
    const newDate = String(over.id).replace("day-", "");
    if (newDate === "Unscheduled") {
      reschedulePiece(pieceId, null);
      return;
    }
    reschedulePiece(pieceId, newDate);
  }

  return (
    <div className="px-8 py-8 max-w-6xl space-y-6">
      <div className="mb-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <span>›</span>
          <Link href={`/projects/${projectId}`} className="hover:text-foreground transition-colors">
            {projectName || "Project"}
          </Link>
          <span>›</span>
          <span className="text-foreground">Content Studio</span>
        </div>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Content Studio</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate, manage and schedule AI-powered content
              {projectName ? ` for ${projectName}` : ""}.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Create content
          </Button>
        </div>
      </div>

      <BrandAiProfileCard projectId={projectId} />

      {aiReady === false && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground">
          {aiProviderUnavailableMessage(activeProvider)}{" "}
          <Link href="/settings" className="text-primary hover:underline">Open AI settings</Link>
        </div>
      )}

      <div className="flex gap-1 border-b border-border">
        {(
          [
            { id: "hub" as const, label: "Hub", icon: LayoutGrid },
            { id: "calendar" as const, label: "Calendar", icon: Calendar },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm border-b-2 -mb-px transition-colors",
              tab === id ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
            {id === "hub" && allItems.length > 0 && (
              <Badge variant="muted" className="text-xs">{allItems.length}</Badge>
            )}
          </button>
        ))}
      </div>

      {tab === "hub" && (
        <ContentStudioHubFilters
          filterSource={filterSource}
          filterFormat={filterFormat}
          filterStatus={filterStatus}
          sortKey={sortKey}
          allItems={allItems}
          statsBreakdown={statsBreakdown}
          onFilterSourceChange={setFilterSource}
          onFilterFormatChange={setFilterFormat}
          onFilterStatusChange={setFilterStatus}
          onSortKeyChange={(v) => setSortKey(v as SortKey)}
          onClearFilters={() => { setFilterFormat("all"); setFilterStatus("all"); setFilterSource("all"); }}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center p-16"><Spinner size="lg" /></div>
      ) : tab === "hub" ? (
        sorted.length === 0 ? (
          <div className="paper-card rounded-xl flex flex-col items-center justify-center p-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">{allItems.length === 0 ? "No content yet" : "No items match filters"}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {studioSorted.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Studio pieces</h3>
                {studioSorted.map((piece) => (
                  <StudioPieceCard
                    key={piece.id}
                    piece={piece}
                    projectId={projectId}
                    onDelete={handleDelete}
                    onMarkReady={handleMarkReady}
                  />
                ))}
              </section>
            )}
            {legacySorted.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Legacy content <Badge variant="muted" className="ml-2">{legacySorted.length}</Badge>
                </h3>
                {legacySorted.map((item) => (
                  <LegacyCard key={`${item.source}-${item.id}`} item={item} />
                ))}
              </section>
            )}
          </div>
        )
      ) : (
        <MonthCalendar
          pieces={pieces}
          reschedulingId={reschedulingId}
          sensors={sensors}
          onDragStart={(id) => setActiveDragId(id)}
          onDragEnd={handleDragEnd}
          activeDragId={activeDragId}
        />
      )}

      <CreateContentModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setBriefDraft(null);
        }}
        projectId={projectId}
        existingPieces={pieces}
        initialDraft={briefDraft}
        cmsConnections={cmsConnections}
        primaryBlogDestination={primaryBlogDestination}
        onCreated={(piece) => {
          dispatchStudioData({
            type: "setPieces",
            updater: (prev) => [{ ...piece, source: "studio" }, ...prev.filter((p) => p.id !== piece.id)],
          });
          setBriefDraft(null);
          loadData();
        }}
      />
    </div>
  );
}
