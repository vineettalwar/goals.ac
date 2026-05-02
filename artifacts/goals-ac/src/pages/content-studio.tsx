import { useState, useCallback, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/auth";
import {
  Plus, FileText, Loader2, AlertCircle, ArrowLeft, Calendar,
  BookOpen, Newspaper, GraduationCap, Map as MapIcon, FileSearch, LayoutTemplate,
  Globe, ImageIcon, BarChart3, Filter, RefreshCw, Trash2, ArrowUpDown, ExternalLink
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, parseISO } from "date-fns";
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type ContentFormatType =
  | "blog_post"
  | "news_article"
  | "tutorial"
  | "guide"
  | "whitepaper"
  | "pillar_page"
  | "location_page"
  | "infographic_outline";

interface ContentPiece {
  id: number;
  websiteProjectId: number;
  formatType: ContentFormatType;
  title: string;
  targetKeyword: string;
  bodyMarkdown: string;
  status: string;
  wordCount: number;
  plannedDate: string | null;
  createdAt: string;
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

type HubItem = ContentPiece | LegacyItem;

function isContentPiece(item: HubItem): item is ContentPiece {
  return item.source === "studio";
}

const FORMAT_META: Record<ContentFormatType, { label: string; icon: React.ElementType; color: string; description: string; example: string }> = {
  blog_post: {
    label: "Blog Post",
    icon: BookOpen,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    description: "Engaging, shareable articles that build authority and drive organic traffic.",
    example: "e.g. '5 Ways SaaS Startups Can Win at Local SEO'",
  },
  news_article: {
    label: "News Article",
    icon: Newspaper,
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    description: "Timely coverage of industry events, product launches, or market trends.",
    example: "e.g. 'AI Search Disrupts Traditional SEO — What Brands Need to Know'",
  },
  tutorial: {
    label: "Tutorial",
    icon: GraduationCap,
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    description: "Step-by-step how-to content that solves a specific problem for your audience.",
    example: "e.g. 'How to Set Up Google Search Console in 10 Minutes'",
  },
  guide: {
    label: "Comprehensive Guide",
    icon: MapIcon,
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    description: "In-depth evergreen guides covering a topic end-to-end. Great for link building.",
    example: "e.g. 'The Complete Guide to Technical SEO for B2B SaaS'",
  },
  whitepaper: {
    label: "Whitepaper",
    icon: FileSearch,
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    description: "Authoritative long-form research documents for lead gen and thought leadership.",
    example: "e.g. 'The State of GEO Optimisation for UK SMEs — 2025 Report'",
  },
  pillar_page: {
    label: "Pillar Page",
    icon: LayoutTemplate,
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    description: "Comprehensive hub pages that anchor your topic clusters and capture broad keywords.",
    example: "e.g. 'SEO for Startups: Everything You Need to Know'",
  },
  location_page: {
    label: "Location / Language Page",
    icon: Globe,
    color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
    description: "Location-specific or language-specific landing pages to capture local search intent.",
    example: "e.g. 'SEO Agency in Manchester — Goals.ac'",
  },
  infographic_outline: {
    label: "Infographic Outline",
    icon: ImageIcon,
    color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
    description: "A structured content brief for a visual infographic — ready for a designer.",
    example: "e.g. 'The Anatomy of a High-Converting SaaS Landing Page'",
  },
};

const SOURCE_META: Record<string, { label: string; color: string }> = {
  studio: { label: "Studio", color: "bg-primary/10 text-primary" },
  seo_article: { label: "SEO Article", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  content_strategy: { label: "Strategy", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  geo_audit: { label: "GEO Audit", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  roadmap: { label: "Roadmap", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  ready: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  published: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  pending: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  in_progress: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

function FormatBadge({ type }: { type: ContentFormatType }) {
  const meta = FORMAT_META[type];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${meta.color}`}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const meta = SOURCE_META[source] ?? { label: source, color: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${meta.color}`}>
      {meta.label}
    </span>
  );
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  ready: "Ready",
  published: "Published",
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? "bg-muted text-muted-foreground";
  const label = STATUS_LABELS[status] ?? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}

function CreateModal({
  open,
  onClose,
  onCreated,
  projectId,
  token,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (piece: ContentPiece) => void;
  projectId: string;
  token: string | null;
}) {
  const [step, setStep] = useState<"format" | "details">("format");
  const [selectedFormat, setSelectedFormat] = useState<ContentFormatType | null>(null);
  const [keyword, setKeyword] = useState("");
  const [angleHint, setAngleHint] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep("format");
    setSelectedFormat(null);
    setKeyword("");
    setAngleHint("");
    setError(null);
    setIsGenerating(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleGenerate = async () => {
    if (!selectedFormat || !keyword.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/website-projects/${projectId}/content-pieces/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ formatType: selectedFormat, targetKeyword: keyword.trim(), angleHint: angleHint.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Generation failed");
      }
      const piece = (await res.json()) as Omit<ContentPiece, "source">;
      onCreated({ ...piece, source: "studio" });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate content");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Content</DialogTitle>
          <DialogDescription>
            {step === "format" ? "Choose a content format to generate." : "Configure your content piece."}
          </DialogDescription>
        </DialogHeader>

        {step === "format" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            {(Object.entries(FORMAT_META) as [ContentFormatType, typeof FORMAT_META[ContentFormatType]][]).map(([type, meta]) => {
              const Icon = meta.icon;
              return (
                <button
                  key={type}
                  onClick={() => { setSelectedFormat(type); setStep("details"); }}
                  className="text-left p-4 rounded-lg border border-border hover:border-primary hover:bg-accent/50 transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`p-1.5 rounded-md ${meta.color}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="font-medium text-sm">{meta.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{meta.description}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1 italic">{meta.example}</p>
                </button>
              );
            })}
          </div>
        )}

        {step === "details" && selectedFormat && (
          <div className="space-y-5 mt-2">
            <button
              onClick={() => setStep("format")}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to format selection
            </button>

            <div className="flex items-center gap-2 p-3 bg-accent/40 rounded-lg">
              {(() => { const Icon = FORMAT_META[selectedFormat].icon; return <Icon className="w-4 h-4 text-muted-foreground" />; })()}
              <span className="text-sm font-medium">{FORMAT_META[selectedFormat].label}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keyword">Target keyword <span className="text-destructive">*</span></Label>
              <Input
                id="keyword"
                placeholder="e.g. local SEO for startups"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                disabled={isGenerating}
              />
              <p className="text-xs text-muted-foreground">The primary keyword this content should rank for.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="angle">Title hint or angle <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                id="angle"
                placeholder="e.g. Focus on e-commerce brands, include a case study"
                value={angleHint}
                onChange={(e) => setAngleHint(e.target.value)}
                disabled={isGenerating}
              />
              <p className="text-xs text-muted-foreground">Give the AI a specific angle or title direction.</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={!keyword.trim() || isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating with AI...</>
              ) : (
                <>Generate {FORMAT_META[selectedFormat].label}</>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PieceChip({ piece, faded }: { piece: ContentPiece; faded?: boolean }) {
  const meta = FORMAT_META[piece.formatType];
  return (
    <div
      className={`text-xs px-1.5 py-0.5 rounded truncate ${meta.color} transition-opacity cursor-grab active:cursor-grabbing ${faded ? "opacity-30" : "hover:opacity-80"}`}
      title={piece.title}
    >
      {piece.title}
    </div>
  );
}

function DraggablePiece({ piece, isRescheduling }: { piece: ContentPiece; isRescheduling?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `piece-${piece.id}`,
    data: { piece },
  });

  const style = { transform: CSS.Translate.toString(transform) };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={isDragging ? "opacity-30" : undefined}
    >
      <Link to={`/content-piece/${piece.id}`} onClick={(e) => isDragging && e.preventDefault()}>
        <PieceChip piece={piece} faded={isRescheduling && !isDragging} />
      </Link>
    </div>
  );
}

function DroppableDay({ dateKey, children }: { dateKey: string; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id: `day-${dateKey}`, data: { dateKey } });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[80px] p-1.5 transition-colors ${isOver ? "bg-primary/10 ring-1 ring-primary/30 rounded" : ""}`}
    >
      {children}
    </div>
  );
}

function ContentCalendar({
  pieces,
  reschedulingId,
  onReschedule,
}: {
  pieces: ContentPiece[];
  reschedulingId: number | null;
  onReschedule: (pieceId: number, newDate: string) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activePiece, setActivePiece] = useState<ContentPiece | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOfWeek = getDay(startOfMonth(currentMonth));

  const piecesByDate: Record<string, ContentPiece[]> = {};
  for (const piece of pieces) {
    const dateKey = piece.plannedDate ?? piece.createdAt.split("T")[0];
    if (!piecesByDate[dateKey]) piecesByDate[dateKey] = [];
    piecesByDate[dateKey].push(piece);
  }

  const handleDragStart = (event: DragStartEvent) => {
    const pieceId = Number((event.active.id as string).replace("piece-", ""));
    setActivePiece(pieces.find((p) => p.id === pieceId) ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActivePiece(null);
    if (!over) return;

    const pieceId = Number((active.id as string).replace("piece-", ""));
    const newDateKey = (over.id as string).replace("day-", "");

    const piece = pieces.find((p) => p.id === pieceId);
    if (!piece) return;
    const currentDate = piece.plannedDate ?? piece.createdAt.split("T")[0];
    if (currentDate === newDateKey) return;

    onReschedule(pieceId, newDateKey);
  };

  const prevMonth = () => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">{format(currentMonth, "MMMM yyyy")}</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={prevMonth}>‹</Button>
          <Button variant="outline" size="sm" onClick={nextMonth}>›</Button>
        </div>
      </div>

      {pieces.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg px-4 py-3 border border-border/50">
          <Calendar className="w-4 h-4 flex-shrink-0" />
          <span>Create content pieces and they'll appear here. Drag them between days to reschedule.</span>
        </div>
      )}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
          {weekDays.map((d) => (
            <div key={d} className="bg-muted/50 text-center text-xs font-medium text-muted-foreground py-2">
              {d}
            </div>
          ))}

          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-background min-h-[80px]" />
          ))}

          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayPieces = piecesByDate[key] ?? [];
            const isToday = key === format(new Date(), "yyyy-MM-dd");
            return (
              <div key={key} className="bg-background">
                <DroppableDay dateKey={key}>
                  <span className={`text-xs font-medium block mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                    {format(day, "d")}
                  </span>
                  <div className="space-y-0.5">
                    {dayPieces.slice(0, 2).map((p) => (
                      <DraggablePiece key={p.id} piece={p} isRescheduling={reschedulingId === p.id} />
                    ))}
                    {dayPieces.length > 2 && (
                      <div className="text-xs text-muted-foreground px-1">+{dayPieces.length - 2} more</div>
                    )}
                  </div>
                </DroppableDay>
              </div>
            );
          })}
        </div>

        <DragOverlay dropAnimation={null}>
          {activePiece ? (
            <div className="pointer-events-none rotate-1 shadow-xl opacity-95">
              <PieceChip piece={activePiece} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

type SortKey = "newest" | "oldest" | "words_desc" | "words_asc" | "title_asc";

function sortItems(items: HubItem[], sortKey: SortKey): HubItem[] {
  return [...items].sort((a, b) => {
    switch (sortKey) {
      case "newest": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "oldest": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "words_desc": return b.wordCount - a.wordCount;
      case "words_asc": return a.wordCount - b.wordCount;
      case "title_asc": return a.title.localeCompare(b.title);
      default: return 0;
    }
  });
}

export default function ContentStudio() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [projectName, setProjectName] = useState<string>("");
  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [legacyItems, setLegacyItems] = useState<LegacyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [filterFormat, setFilterFormat] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [reschedulingId, setReschedulingId] = useState<number | null>(null);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [projRes, piecesRes, legacyRes] = await Promise.all([
        fetch(`${API_BASE}/api/website-projects/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/website-projects/${id}/content-pieces`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/website-projects/${id}/content`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!projRes.ok) { setError("Project not found"); return; }
      const proj = await projRes.json() as { name: string };
      setProjectName(proj.name);

      if (piecesRes.ok) {
        const raw = await piecesRes.json() as Omit<ContentPiece, "source">[];
        setPieces(raw.map((p) => ({ ...p, source: "studio" as const })));
      }

      if (legacyRes.ok) {
        const legacy = await legacyRes.json() as {
          seoArticles: Array<{ id: number; title: string; primaryKeyword: string; wordCount: number; status: string; createdAt: string }>;
          contentStrategies: Array<{ id: number; industry: string; location: string; stage: string; createdAt: string }>;
          contentItems: Array<{ id: number; strategyId: number; day: number; title: string; format: string; topicAngle: string; primaryKeyword: string; status: string; createdAt: string }>;
          geoAudits: Array<{ id: number; url: string; geoScore: number; status: string; createdAt: string }>;
          roadmaps: Array<{ id: number; slug: string; industry: string; location: string; stage: string; createdAt: string }>;
        };

        const strategyMap = new Map((legacy.contentStrategies ?? []).map((s) => [s.id, s]));

        const items: LegacyItem[] = [
          ...(legacy.seoArticles ?? []).map((a) => ({
            id: a.id,
            title: a.title,
            keyword: a.primaryKeyword,
            wordCount: a.wordCount,
            status: a.status,
            createdAt: a.createdAt,
            source: "seo_article" as const,
            linkTo: `/seo-article/${a.id}`,
          })),
          ...(legacy.contentItems ?? []).map((ci) => {
            const strategy = strategyMap.get(ci.strategyId);
            return {
              id: ci.id,
              title: ci.title,
              keyword: ci.primaryKeyword,
              wordCount: 0,
              status: ci.status,
              createdAt: ci.createdAt,
              source: "content_strategy" as const,
              linkTo: `/content-strategy/${ci.strategyId}`,
              subtitle: strategy ? `Day ${ci.day} · ${strategy.industry} · ${strategy.location}` : `Day ${ci.day}`,
            };
          }),
          ...(legacy.geoAudits ?? []).map((g) => ({
            id: g.id,
            title: `GEO Audit — ${g.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}`,
            keyword: g.url.replace(/^https?:\/\//, "").split("/")[0],
            wordCount: 0,
            status: g.status ?? "ready",
            createdAt: g.createdAt,
            source: "geo_audit" as const,
            linkTo: `/geo-audit/${g.id}`,
          })),
          ...(legacy.roadmaps ?? []).map((r) => ({
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
    } catch {
      setError("Failed to load content studio");
    } finally {
      setIsLoading(false);
    }
  }, [token, id]);

  useEffect(() => { load(); }, [load]);

  const handleCreated = (piece: ContentPiece) => {
    setPieces((prev) => [piece, ...prev]);
    navigate(`/content-piece/${piece.id}`);
  };

  const handleDelete = async (pieceId: number) => {
    if (!confirm("Delete this content piece?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/content-pieces/${pieceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPieces((prev) => prev.filter((p) => p.id !== pieceId));
      } else {
        alert("Failed to delete content piece. Please try again.");
      }
    } catch {
      alert("Failed to delete content piece. Please check your connection.");
    }
  };

  const handleReschedule = async (pieceId: number, newDate: string) => {
    const prevPieces = pieces;
    setPieces((prev) => prev.map((p) => p.id === pieceId ? { ...p, plannedDate: newDate } : p));
    setReschedulingId(pieceId);
    setRescheduleError(null);
    try {
      const res = await fetch(`${API_BASE}/api/content-pieces/${pieceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plannedDate: newDate }),
      });
      if (res.ok) {
        const updated = await res.json() as Omit<ContentPiece, "source">;
        setPieces((prev) => prev.map((p) => p.id === pieceId ? { ...updated, source: "studio" as const } : p));
      } else {
        setPieces(prevPieces);
        setRescheduleError("Failed to reschedule — please try again.");
      }
    } catch {
      setPieces(prevPieces);
      setRescheduleError("Could not save — please check your connection.");
    } finally {
      setReschedulingId(null);
    }
  };

  const allItems: HubItem[] = [...pieces, ...legacyItems];

  const filtered = allItems.filter((item) => {
    if (filterSource !== "all" && item.source !== filterSource) return false;
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    if (filterFormat !== "all") {
      if (!isContentPiece(item)) return false;
      if (item.formatType !== filterFormat) return false;
    }
    return true;
  });

  const sorted = sortItems(filtered, sortKey);

  const statsBreakdown = [
    { label: "Studio", count: pieces.length, color: "text-primary" },
    { label: "Strategy Items", count: legacyItems.filter((i) => i.source === "content_strategy").length, color: "text-purple-500" },
    { label: "SEO Articles", count: legacyItems.filter((i) => i.source === "seo_article").length, color: "text-blue-500" },
    { label: "GEO Audits", count: legacyItems.filter((i) => i.source === "geo_audit").length, color: "text-emerald-500" },
    { label: "Roadmaps", count: legacyItems.filter((i) => i.source === "roadmap").length, color: "text-amber-500" },
  ].filter((s) => s.count > 0);

  const studioSorted = sorted.filter(isContentPiece);
  const legacySorted = sorted.filter((i) => !isContentPiece(i)) as LegacyItem[];

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button asChild><Link to="/dashboard">Back to Dashboard</Link></Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO title={`Content Studio — ${projectName} | goals.ac`} description="Manage and generate SEO content for your project." />
      <div className="container mx-auto px-4 md:px-8 max-w-6xl py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Link to="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
            <span>›</span>
            <Link to={`/projects/${id}`} className="hover:text-foreground transition-colors">{projectName}</Link>
            <span>›</span>
            <span className="text-foreground">Content Studio</span>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Content Studio</h1>
              <p className="text-muted-foreground mt-1">Generate, manage and schedule AI-powered content for {projectName}.</p>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Content
            </Button>
          </div>
        </div>

        <Tabs defaultValue="hub">
          <TabsList className="mb-6">
            <TabsTrigger value="hub" className="flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              Content Hub
              {allItems.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{allItems.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              Calendar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hub">
            <div className="flex flex-wrap items-center gap-3 mb-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Filter className="w-4 h-4" />
                  Filter:
                </div>
                <Select value={filterSource} onValueChange={setFilterSource}>
                  <SelectTrigger className="w-36 h-8 text-sm">
                    <SelectValue placeholder="All sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sources</SelectItem>
                    <SelectItem value="studio">Studio</SelectItem>
                    <SelectItem value="seo_article">SEO Articles</SelectItem>
                    <SelectItem value="content_strategy">Strategy Items</SelectItem>
                    <SelectItem value="geo_audit">GEO Audits</SelectItem>
                    <SelectItem value="roadmap">Roadmaps</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterFormat} onValueChange={setFilterFormat}>
                  <SelectTrigger className="w-44 h-8 text-sm">
                    <SelectValue placeholder="All formats" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All formats</SelectItem>
                    {Object.entries(FORMAT_META).map(([type, meta]) => (
                      <SelectItem key={type} value={type}>{meta.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-36 h-8 text-sm">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2 text-sm text-muted-foreground ml-2">
                  <ArrowUpDown className="w-4 h-4" />
                  Sort:
                </div>
                <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                  <SelectTrigger className="w-40 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest first</SelectItem>
                    <SelectItem value="oldest">Oldest first</SelectItem>
                    <SelectItem value="words_desc">Most words</SelectItem>
                    <SelectItem value="words_asc">Fewest words</SelectItem>
                    <SelectItem value="title_asc">A → Z</SelectItem>
                  </SelectContent>
                </Select>

                {(filterFormat !== "all" || filterStatus !== "all" || filterSource !== "all") && (
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setFilterFormat("all"); setFilterStatus("all"); setFilterSource("all"); }}>
                    <RefreshCw className="w-3 h-3 mr-1" /> Clear
                  </Button>
                )}
              </div>

            {statsBreakdown.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4 px-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{allItems.length} total</span>
                <span className="text-border">|</span>
                {statsBreakdown.map((s) => (
                  <span key={s.label}>
                    <span className={`font-semibold ${s.color}`}>{s.count}</span> {s.label}
                  </span>
                ))}
              </div>
            )}

            {sorted.length === 0 && allItems.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <BarChart3 className="w-7 h-7 text-primary" />
                  </div>
                  <CardTitle className="text-xl mb-2">Your Content Studio is empty</CardTitle>
                  <CardDescription className="max-w-sm mb-6">
                    Start generating AI-powered content tailored to your brand — blog posts, guides, whitepapers, and more.
                  </CardDescription>
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create your first piece
                  </Button>
                </CardContent>
              </Card>
            ) : sorted.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No content matches your current filters.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="hidden md:grid md:grid-cols-[1fr_140px_140px_110px_80px_90px_80px] gap-3 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b">
                  <span>Title</span>
                  <span>Source</span>
                  <span>Format / Type</span>
                  <span>Keyword</span>
                  <span>Status</span>
                  <span>Words</span>
                  <span>Date</span>
                </div>

                {filterSource === "all" && studioSorted.length > 0 && legacySorted.length > 0 ? (
                  <>
                    {studioSorted.length > 0 && (
                      <>
                        <div className="flex items-center gap-2 pt-1 pb-0.5">
                          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">Studio Content</span>
                          <div className="flex-1 h-px bg-border/50" />
                          <span className="text-xs text-muted-foreground">{studioSorted.length}</span>
                        </div>
                        {studioSorted.map((item) => (
                          <div key={`studio-${item.id}`} className="group flex flex-col md:grid md:grid-cols-[1fr_140px_140px_110px_80px_90px_80px] gap-3 items-start md:items-center px-4 py-3 rounded-lg border border-transparent hover:border-border hover:bg-accent/30 transition-all">
                            <div className="min-w-0">
                              <Link to={`/content-piece/${item.id}`} className="font-medium text-sm hover:text-primary transition-colors line-clamp-2">
                                {item.title}
                              </Link>
                            </div>
                            <SourceBadge source={item.source} />
                            <FormatBadge type={item.formatType} />
                            <span className="text-xs text-muted-foreground truncate">{item.targetKeyword}</span>
                            <StatusBadge status={item.status} />
                            <span className="text-xs text-muted-foreground">{item.wordCount > 0 ? item.wordCount.toLocaleString() : "—"}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {format(parseISO(item.createdAt), "d MMM yyyy")}
                              </span>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                    {legacySorted.length > 0 && (
                      <>
                        <div className="flex items-center gap-2 pt-3 pb-0.5">
                          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">Legacy Content</span>
                          <div className="flex-1 h-px bg-border/50" />
                          <span className="text-xs text-muted-foreground">{legacySorted.length}</span>
                        </div>
                        {legacySorted.map((item) => (
                          <div key={`${item.source}-${item.id}`} className="flex flex-col md:grid md:grid-cols-[1fr_140px_140px_110px_80px_90px_80px] gap-3 items-start md:items-center px-4 py-3 rounded-lg border border-transparent hover:border-border hover:bg-accent/30 transition-all">
                            <div className="min-w-0">
                              <Link to={item.linkTo} className="font-medium text-sm hover:text-primary transition-colors line-clamp-2 flex items-center gap-1">
                                {item.title}
                                <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              </Link>
                              {item.subtitle && (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.subtitle}</p>
                              )}
                            </div>
                            <SourceBadge source={item.source} />
                            <span className="text-xs text-muted-foreground">—</span>
                            <span className="text-xs text-muted-foreground truncate">{item.keyword}</span>
                            <StatusBadge status={item.status} />
                            <span className="text-xs text-muted-foreground">{item.wordCount > 0 ? item.wordCount.toLocaleString() : "—"}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(item.createdAt), "d MMM yyyy")}
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                  </>
                ) : (
                  sorted.map((item) => {
                    if (isContentPiece(item)) {
                      return (
                        <div key={`studio-${item.id}`} className="group flex flex-col md:grid md:grid-cols-[1fr_140px_140px_110px_80px_90px_80px] gap-3 items-start md:items-center px-4 py-3 rounded-lg border border-transparent hover:border-border hover:bg-accent/30 transition-all">
                          <div className="min-w-0">
                            <Link to={`/content-piece/${item.id}`} className="font-medium text-sm hover:text-primary transition-colors line-clamp-2">
                              {item.title}
                            </Link>
                          </div>
                          <SourceBadge source={item.source} />
                          <FormatBadge type={item.formatType} />
                          <span className="text-xs text-muted-foreground truncate">{item.targetKeyword}</span>
                          <StatusBadge status={item.status} />
                          <span className="text-xs text-muted-foreground">{item.wordCount > 0 ? item.wordCount.toLocaleString() : "—"}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(item.createdAt), "d MMM yyyy")}
                            </span>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div key={`${item.source}-${item.id}`} className="flex flex-col md:grid md:grid-cols-[1fr_140px_140px_110px_80px_90px_80px] gap-3 items-start md:items-center px-4 py-3 rounded-lg border border-transparent hover:border-border hover:bg-accent/30 transition-all">
                          <div className="min-w-0">
                            <Link to={item.linkTo} className="font-medium text-sm hover:text-primary transition-colors line-clamp-2 flex items-center gap-1">
                              {item.title}
                              <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            </Link>
                            {item.subtitle && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.subtitle}</p>
                            )}
                          </div>
                          <SourceBadge source={item.source} />
                          <span className="text-xs text-muted-foreground">—</span>
                          <span className="text-xs text-muted-foreground truncate">{item.keyword}</span>
                          <StatusBadge status={item.status} />
                          <span className="text-xs text-muted-foreground">{item.wordCount > 0 ? item.wordCount.toLocaleString() : "—"}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(item.createdAt), "d MMM yyyy")}
                          </span>
                        </div>
                      );
                    }
                  })
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="calendar">
            {rescheduleError && (
              <div className="flex items-center justify-between gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-2.5 mb-3">
                <span>{rescheduleError}</span>
                <button className="text-destructive/70 hover:text-destructive text-xs" onClick={() => setRescheduleError(null)}>✕</button>
              </div>
            )}
            <ContentCalendar
              pieces={pieces}
              reschedulingId={reschedulingId}
              onReschedule={handleReschedule}
            />
          </TabsContent>
        </Tabs>

        <div className="mt-10 border-t border-border/50 pt-8">
          <h2 className="text-base font-semibold mb-4 text-muted-foreground uppercase tracking-wide text-xs">Other project tools</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link to={`/projects/${id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="flex flex-col items-center py-5 text-center gap-2">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Project Overview</span>
                </CardContent>
              </Card>
            </Link>
            <Link to="/geo-audit">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="flex flex-col items-center py-5 text-center gap-2">
                  <Globe className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">GEO Audit</span>
                </CardContent>
              </Card>
            </Link>
            <Link to="/roadmaps">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="flex flex-col items-center py-5 text-center gap-2">
                  <MapIcon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Growth Roadmaps</span>
                </CardContent>
              </Card>
            </Link>
            <Link to="/dashboard">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="flex flex-col items-center py-5 text-center gap-2">
                  <BarChart3 className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Dashboard</span>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>

      <CreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
        projectId={id!}
        token={token}
      />
    </Layout>
  );
}
