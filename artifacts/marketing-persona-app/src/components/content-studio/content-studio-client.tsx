"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { aiProviderUnavailableMessage } from "@/lib/platform/ai-providers-status";
import type { AiProviderId } from "@workspace/ai-providers/config";
import { BrandAiProfileCard } from "./brand-ai-profile-card";
import { CreateContentModal, type BriefContentDraft } from "./create-content-modal";
import { FormatBadge, StatusBadge, type ContentFormatType } from "./content-studio-format-meta";
import { ArticlePerformanceBadge } from "./article-performance-badge";
import { FORMAT_OPTIONS } from "@/lib/content/content-format-options";

export { FORMAT_OPTIONS };

function draftFromCreateParams(searchParams: URLSearchParams): BriefContentDraft | null {
  if (searchParams.get("create") !== "1") return null;

  const keyword = searchParams.get("keyword")?.trim() ?? "";
  const title = searchParams.get("title")?.trim() ?? "";
  const angle = searchParams.get("angle")?.trim() ?? "";
  const format = searchParams.get("format")?.trim();
  const validFormats = new Set<string>(FORMAT_OPTIONS.map((option) => option.value));

  if (!keyword && !title) return null;

  return {
    keyword: keyword || title,
    workingTitle: title || undefined,
    angleHint: angle || undefined,
    formatType:
      format && validFormats.has(format) ? (format as ContentFormatType) : "blog_post",
  };
}

export interface ContentPieceRow {
  id: number;
  title: string;
  formatType: string;
  targetKeyword: string;
  status: string;
  wordCount: number;
  plannedDate: string | null;
  createdAt: string;
  publishedUrl?: string | null;
}

interface StudioPiece extends ContentPieceRow {
  source: "studio";
}

interface LegacyItem {
  id: number;
  title: string;
  keyword: string;
  wordCount: number;
  status: string;
  createdAt: string;
  source: "seo_article" | "content_strategy" | "geo_audit" | "roadmap";
  linkTo: string;
  subtitle?: string;
}

type HubItem = StudioPiece | LegacyItem;
type SortKey = "newest" | "oldest" | "words_desc" | "words_asc" | "title_asc";

function isStudioPiece(item: HubItem): item is StudioPiece {
  return item.source === "studio";
}

function sortItems(items: HubItem[], sortKey: SortKey): HubItem[] {
  return [...items].sort((a, b) => {
    switch (sortKey) {
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "words_desc":
        return b.wordCount - a.wordCount;
      case "words_asc":
        return a.wordCount - b.wordCount;
      case "title_asc":
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });
}

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function eachDayInMonth(month: Date): Date[] {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const days: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  return days;
}

interface Props {
  projectId: string;
}

function briefToDraft(brief: {
  id: number;
  workingTitle: string;
  targetKeywordCluster: string | null;
  angle: string | null;
  format: string | null;
}): BriefContentDraft {
  const parts = [`Title: ${brief.workingTitle}`];
  if (brief.targetKeywordCluster) parts.push(`Keywords: ${brief.targetKeywordCluster}`);
  if (brief.angle) parts.push(brief.angle);

  const formatType =
    brief.format && FORMAT_OPTIONS.some((f) => f.value === brief.format)
      ? (brief.format as ContentFormatType)
      : "blog_post";

  return {
    briefId: brief.id,
    keyword: brief.targetKeywordCluster?.trim() || brief.workingTitle,
    angleHint: parts.join("\n"),
    formatType,
    workingTitle: brief.workingTitle,
  };
}

export function ContentStudioClient({ projectId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projectName, setProjectName] = useState("");
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const [activeProvider, setActiveProvider] = useState<AiProviderId>("gemini");
  const [tab, setTab] = useState<"hub" | "calendar">("hub");
  const [pieces, setPieces] = useState<StudioPiece[]>([]);
  const [legacyItems, setLegacyItems] = useState<LegacyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [briefDraft, setBriefDraft] = useState<BriefContentDraft | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [filterFormat, setFilterFormat] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [activeDragId, setActiveDragId] = useState<number | null>(null);
  const [reschedulingId, setReschedulingId] = useState<number | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const loadData = useCallback(async () => {
    const [projRes, piecesRes, legacyRes, aiStatusRes] = await Promise.all([
      fetch(`/api/website-projects/${projectId}`),
      fetch(`/api/website-projects/${projectId}/content-pieces`),
      fetch(`/api/website-projects/${projectId}/content`),
      fetch("/api/ai-providers/status"),
    ]);

    if (projRes.ok) {
      const proj = await projRes.json();
      setProjectName(proj.name ?? "");
    }

    if (aiStatusRes.ok) {
      const status = await aiStatusRes.json();
      setActiveProvider(status.activeProvider ?? "gemini");
      setAiReady(Boolean(status.ready));
    }

    if (piecesRes.ok) {
      const data = await piecesRes.json();
      setPieces((data.pieces ?? []).map((p: ContentPieceRow) => ({ ...p, source: "studio" as const })));
    }

    if (legacyRes.ok) {
      const legacy = await legacyRes.json();
      const strategyMap = new Map((legacy.contentStrategies ?? []).map((s: { id: number; industry: string; location: string }) => [s.id, s]));
      const items: LegacyItem[] = [
        ...(legacy.seoArticles ?? []).map((a: { id: number; title: string; primaryKeyword: string; wordCount: number; status: string; createdAt: string }) => ({
          id: a.id,
          title: a.title,
          keyword: a.primaryKeyword,
          wordCount: a.wordCount,
          status: a.status,
          createdAt: a.createdAt,
          source: "seo_article" as const,
          linkTo: `/seo-article/${a.id}`,
        })),
        ...(legacy.contentItems ?? []).map((ci: { id: number; strategyId: number; day: number; title: string; primaryKeyword: string; status: string; createdAt: string }) => {
          const strategy = strategyMap.get(ci.strategyId) as { industry: string; location: string } | undefined;
          return {
            id: ci.id,
            title: ci.title,
            keyword: ci.primaryKeyword,
            wordCount: 0,
            status: ci.status,
            createdAt: ci.createdAt,
            source: "content_strategy" as const,
            linkTo: `/admin/content-strategies`,
            subtitle: strategy ? `Day ${ci.day} · ${strategy.industry} · ${strategy.location}` : `Day ${ci.day}`,
          };
        }),
        ...(legacy.geoAudits ?? []).map((g: { id: number; url: string; status: string; createdAt: string }) => ({
          id: g.id,
          title: `GEO Audit — ${g.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}`,
          keyword: g.url.replace(/^https?:\/\//, "").split("/")[0],
          wordCount: 0,
          status: g.status ?? "ready",
          createdAt: g.createdAt,
          source: "geo_audit" as const,
          linkTo: `/audit/${g.id}`,
        })),
        ...(legacy.roadmaps ?? []).map((r: { id: number; slug: string; industry: string; location: string; createdAt: string }) => ({
          id: r.id,
          title: `${r.industry} Growth Roadmap — ${r.location}`,
          keyword: r.industry,
          wordCount: 0,
          status: "ready",
          createdAt: r.createdAt,
          source: "roadmap" as const,
          linkTo: `/roadmap/${r.slug}`,
        })),
      ];
      setLegacyItems(items);
    }
  }, [projectId]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  useEffect(() => {
    const briefIdParam = searchParams.get("briefId");
    const geoDraft = draftFromCreateParams(searchParams);

    if (geoDraft) {
      setBriefDraft(geoDraft);
      setCreateOpen(true);
      router.replace(`/projects/${projectId}/content-studio`, { scroll: false });
      return;
    }

    if (!briefIdParam) return;

    const briefId = Number(briefIdParam);
    if (Number.isNaN(briefId)) return;

    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/briefs/${briefId}`);
      if (!res.ok || cancelled) return;
      const brief = await res.json();
      if (cancelled) return;
      setBriefDraft(briefToDraft(brief));
      setCreateOpen(true);
      router.replace(`/projects/${projectId}/content-studio`, { scroll: false });
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, projectId, router]);

  async function handleDelete(pieceId: number) {
    if (!confirm("Delete this content piece?")) return;
    const res = await fetch(`/api/content-pieces/${pieceId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete");
      return;
    }
    setPieces((prev) => prev.filter((p) => p.id !== pieceId));
    toast.success("Deleted");
  }

  async function handleMarkReady(pieceId: number) {
    setPieces((prev) => prev.map((p) => (p.id === pieceId ? { ...p, status: "ready" } : p)));
    const res = await fetch(`/api/content-pieces/${pieceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ready" }),
    });
    if (!res.ok) {
      setPieces((prev) => prev.map((p) => (p.id === pieceId ? { ...p, status: "draft" } : p)));
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
    setPieces((prev) => prev.map((p) => (p.id === pieceId ? { ...p, plannedDate: updated.plannedDate, status: updated.status } : p)));
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
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect value={filterSource} onChange={setFilterSource} options={[
              { value: "all", label: "All sources" },
              { value: "studio", label: "Studio" },
              { value: "seo_article", label: "SEO Articles" },
              { value: "content_strategy", label: "Strategy Items" },
              { value: "geo_audit", label: "GEO Audits" },
              { value: "roadmap", label: "Roadmaps" },
            ]} />
            <FilterSelect value={filterFormat} onChange={setFilterFormat} options={[
              { value: "all", label: "All formats" },
              ...FORMAT_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
            ]} />
            <FilterSelect value={filterStatus} onChange={setFilterStatus} options={[
              { value: "all", label: "All statuses" },
              { value: "draft", label: "Draft" },
              { value: "ready", label: "Ready" },
              { value: "published", label: "Published" },
              { value: "prepared", label: "Prepared" },
            ]} />
            <FilterSelect value={sortKey} onChange={(v) => setSortKey(v as SortKey)} options={[
              { value: "newest", label: "Newest first" },
              { value: "oldest", label: "Oldest first" },
              { value: "words_desc", label: "Most words" },
              { value: "words_asc", label: "Fewest words" },
              { value: "title_asc", label: "A → Z" },
            ]} icon={<ArrowUpDown className="h-3 w-3" />} />
            {(filterFormat !== "all" || filterStatus !== "all" || filterSource !== "all") && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setFilterFormat("all"); setFilterStatus("all"); setFilterSource("all"); }}>
                <RefreshCw className="h-3 w-3 mr-1" /> Clear
              </Button>
            )}
          </div>

          {statsBreakdown.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{allItems.length} total</span>
              {statsBreakdown.map((s) => (
                <span key={s.label} className="flex items-center gap-1.5">
                  <span className="w-px h-3 bg-border" />
                  <span className={cn("font-medium", s.color)}>{s.count}</span>
                  <span>{s.label}</span>
                </span>
              ))}
            </div>
          )}
        </div>
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
        onCreated={(piece) => {
          setPieces((prev) => [{ ...piece, source: "studio" }, ...prev.filter((p) => p.id !== piece.id)]);
          setBriefDraft(null);
          loadData();
        }}
      />
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  icon,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  icon?: React.ReactNode;
}) {
  return (
    <div className="relative">
      {icon && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>}
      <select
        className={cn("h-8 rounded-lg border border-dashed border-input bg-card text-xs px-2", icon && "pl-7")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function StudioPieceCard({
  piece,
  projectId,
  onDelete,
  onMarkReady,
}: {
  piece: StudioPiece;
  projectId: string;
  onDelete: (id: number) => void;
  onMarkReady: (id: number) => void;
}) {
  return (
    <div className="paper-card rounded-xl p-5 flex items-start justify-between gap-4 group">
      <div className="min-w-0 flex-1">
        <Link href={`/content-piece/${piece.id}`} className="font-medium hover:text-primary truncate block">
          {piece.title}
        </Link>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <FormatBadge type={piece.formatType} />
          {piece.targetKeyword && <span className="text-xs text-muted-foreground">{piece.targetKeyword}</span>}
          <span className="text-xs text-muted-foreground">{piece.wordCount} words</span>
          {piece.plannedDate && (
            <span className="text-xs text-muted-foreground">· {piece.plannedDate}</span>
          )}
          <ArticlePerformanceBadge
            projectId={projectId}
            contentPieceId={piece.id}
            publishedUrl={piece.publishedUrl}
          />
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge status={piece.status} />
        {piece.status === "draft" && (
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Mark ready" onClick={() => onMarkReady(piece.id)}>
            <CheckCircle2 className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" title="Delete" onClick={() => onDelete(piece.id)}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
        <Link href={`/content-piece/${piece.id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

function LegacyCard({ item }: { item: LegacyItem }) {
  const sourceLabel = {
    seo_article: "SEO Article",
    content_strategy: "Strategy Item",
    geo_audit: "GEO Audit",
    roadmap: "Roadmap",
  }[item.source];

  return (
    <div className="paper-card rounded-xl p-5 flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <Link href={item.linkTo} className="font-medium hover:text-primary line-clamp-2 flex items-center gap-1">
          {item.title}
          <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
        </Link>
        {item.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>}
        <div className="flex items-center gap-2 mt-1.5">
          <Badge variant="muted">{sourceLabel}</Badge>
          <span className="text-xs text-muted-foreground">{item.keyword}</span>
        </div>
      </div>
      <Badge variant="muted">{item.status}</Badge>
    </div>
  );
}

function MonthCalendar({
  pieces,
  reschedulingId,
  sensors,
  onDragStart,
  onDragEnd,
  activeDragId,
}: {
  pieces: StudioPiece[];
  reschedulingId: number | null;
  sensors: ReturnType<typeof useSensors>;
  onDragStart: (id: number) => void;
  onDragEnd: (event: DragEndEvent) => void;
  activeDragId: number | null;
}) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  const days = eachDayInMonth(currentMonth);
  const firstDayOfWeek = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const unscheduledPieces = pieces.filter((p) => !p.plannedDate);
  const piecesByDate: Record<string, StudioPiece[]> = {};
  for (const piece of pieces) {
    if (!piece.plannedDate) continue;
    piecesByDate[piece.plannedDate] = piecesByDate[piece.plannedDate] ?? [];
    piecesByDate[piece.plannedDate].push(piece);
  }

  const monthLabel = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const todayKey = formatYmd(new Date());

  function handleStart(event: DragStartEvent) {
    const pieceId = Number(String(event.active.id).replace("piece-", ""));
    onDragStart(pieceId);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">{monthLabel}</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>‹</Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>›</Button>
        </div>
      </div>

      {pieces.length === 0 && (
        <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg px-4 py-3 border">
          Create content pieces and drag them between days to reschedule.
        </p>
      )}

      <DndContext sensors={sensors} onDragStart={handleStart} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border">
          {weekDays.map((d) => (
            <div key={d} className="bg-muted/50 text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
          ))}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-background min-h-[80px]" />
          ))}
          {days.map((day) => {
            const key = formatYmd(day);
            const dayPieces = piecesByDate[key] ?? [];
            const isToday = key === todayKey;
            return (
              <CalendarDay key={key} dateKey={key}>
                <span className={cn(
                  "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                  isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}>
                  {day.getDate()}
                </span>
                <div className="space-y-0.5">
                  {dayPieces.slice(0, 2).map((p) => (
                    <CalendarDraggablePiece key={p.id} piece={p} isRescheduling={reschedulingId === p.id} />
                  ))}
                  {dayPieces.length > 2 && (
                    <div className="text-xs text-muted-foreground px-1">+{dayPieces.length - 2} more</div>
                  )}
                </div>
              </CalendarDay>
            );
          })}
        </div>

        <CalendarDay dateKey="Unscheduled">
          <p className="text-xs font-medium text-muted-foreground mb-2">Unscheduled</p>
          <p className="text-[10px] text-muted-foreground mb-2">Drop here to remove from the calendar</p>
          <div className="flex flex-wrap gap-1 min-h-[40px]">
            {unscheduledPieces.map((p) => (
              <CalendarDraggablePiece key={p.id} piece={p} isRescheduling={reschedulingId === p.id} />
            ))}
            {unscheduledPieces.length === 0 && (
              <span className="text-[10px] text-muted-foreground italic">No unscheduled pieces</span>
            )}
          </div>
        </CalendarDay>

        <DragOverlay>
          {activeDragId ? (
            <div className="paper-card rounded px-2 py-1 text-xs shadow-lg opacity-95 max-w-[120px] truncate">
              {pieces.find((p) => p.id === activeDragId)?.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function CalendarDay({ dateKey, children }: { dateKey: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${dateKey}` });
  return (
    <div ref={setNodeRef} className={cn("bg-background min-h-[80px] p-1", isOver && "ring-1 ring-primary/30 bg-primary/5")}>
      {children}
    </div>
  );
}

function CalendarDraggablePiece({ piece, isRescheduling }: { piece: StudioPiece; isRescheduling: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `piece-${piece.id}` });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const label = FORMAT_OPTIONS.find((o) => o.value === piece.formatType)?.label ?? piece.formatType;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={cn("cursor-grab rounded px-1 py-0.5 text-[10px] bg-primary/10 truncate", isRescheduling && "opacity-50")}>
      {label}: {piece.title.slice(0, 20)}
    </div>
  );
}
