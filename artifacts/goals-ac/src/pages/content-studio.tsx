import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/app-layout";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/use-auth";
import { safeJson } from "@/lib/safe-json";
import {
  Plus,
  FileText,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Calendar,
  BookOpen,
  Newspaper,
  GraduationCap,
  Map as MapIcon,
  FileSearch,
  LayoutTemplate,
  Globe,
  ImageIcon,
  BarChart3,
  RefreshCw,
  Trash2,
  ArrowUpDown,
  ExternalLink,
  Linkedin,
  Twitter,
  Instagram,
  Mail,
  Megaphone,
  MonitorPlay,
  Package,
  Radio,
  HelpCircle,
  KeyRound,
  Shuffle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  parseISO,
} from "date-fns";
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CreateModal } from "./content-studio-create-modal";
import { ContentStudioHubTab, type SortKey } from "./content-studio-hub-tab";
import { ContentCalendar } from "./content-studio-calendar";
import {
  API_BASE,
  type ContentPiece,
  type LegacyItem,
  type HubItem,
  isContentPiece,
  FormatBadge,
  StatusBadge,
} from "./content-studio-types";
import { FormatBadge, StatusBadge } from "./content-studio-format-badge";
import { FORMAT_META } from "./content-studio-types";

type SortKeyLocal = "newest" | "oldest" | "words_desc" | "words_asc" | "title_asc";

function sortItems(items: HubItem[], sortKey: SortKey): HubItem[] {
  return [...items].sort((a, b) => {
    switch (sortKey) {
      case "newest":
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case "oldest":
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
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

export default function ContentStudio() {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
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
        fetch(`${API_BASE}/api/website-projects/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/website-projects/${id}/content-pieces`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/website-projects/${id}/content`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!projRes.ok) {
        setError("Project not found");
        return;
      }
      const proj = await safeJson<{ name: string; brandProfile?: any }>(
        projRes,
      );
      if (proj && proj.name) setProjectName(proj.name);

      if (piecesRes.ok) {
        const raw = await safeJson<Omit<ContentPiece, "source">[]>(piecesRes);
        if (raw)
          setPieces(raw.map((p) => ({ ...p, source: "studio" as const })));
      }

      if (legacyRes.ok) {
        const legacy = await safeJson<{
          seoArticles: Array<{
            id: number;
            title: string;
            primaryKeyword: string;
            wordCount: number;
            status: string;
            createdAt: string;
          }>;
          contentStrategies: Array<{
            id: number;
            industry: string;
            location: string;
            stage: string;
            createdAt: string;
          }>;
          contentItems: Array<{
            id: number;
            strategyId: number;
            day: number;
            title: string;
            format: string;
            topicAngle: string;
            primaryKeyword: string;
            status: string;
            createdAt: string;
          }>;
          geoAudits: Array<{
            id: number;
            url: string;
            geoScore: number;
            status: string;
            createdAt: string;
          }>;
          roadmaps: Array<{
            id: number;
            slug: string;
            industry: string;
            location: string;
            stage: string;
            createdAt: string;
          }>;
        }>(legacyRes);
        if (legacy) {
          const strategyMap = new Map(
            (legacy.contentStrategies ?? []).map((s) => [s.id, s]),
          );

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
                subtitle: strategy
                  ? `Day ${ci.day} · ${strategy.industry} · ${strategy.location}`
                  : `Day ${ci.day}`,
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
      }
    } catch {
      setError("Failed to load content studio");
    } finally {
      setIsLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    load();
  }, [load]);

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

  const handleMarkReady = async (pieceId: number) => {
    setPieces((prev) =>
      prev.map((p) => (p.id === pieceId ? { ...p, status: "ready" } : p)),
    );
    try {
      const res = await fetch(`${API_BASE}/api/content-pieces/${pieceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "ready" }),
      });
      if (!res.ok) {
        setPieces((prev) =>
          prev.map((p) => (p.id === pieceId ? { ...p, status: "draft" } : p)),
        );
      }
    } catch {
      setPieces((prev) =>
        prev.map((p) => (p.id === pieceId ? { ...p, status: "draft" } : p)),
      );
    }
  };

  const handleReschedule = async (pieceId: number, newDate: string) => {
    const prevPieces = pieces;
    setPieces((prev) =>
      prev.map((p) => (p.id === pieceId ? { ...p, plannedDate: newDate } : p)),
    );
    setReschedulingId(pieceId);
    setRescheduleError(null);
    try {
      const res = await fetch(`${API_BASE}/api/content-pieces/${pieceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plannedDate: newDate, status: "ready" }),
      });
      if (res.ok) {
        const updated = await safeJson<Omit<ContentPiece, "source">>(res);
        if (updated)
          setPieces((prev) =>
            prev.map((p) =>
              p.id === pieceId ? { ...updated, source: "studio" as const } : p,
            ),
          );
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
    {
      label: "Strategy Items",
      count: legacyItems.filter((i) => i.source === "content_strategy").length,
      color: "text-purple-500",
    },
    {
      label: "SEO Articles",
      count: legacyItems.filter((i) => i.source === "seo_article").length,
      color: "text-blue-500",
    },
    {
      label: "GEO Audits",
      count: legacyItems.filter((i) => i.source === "geo_audit").length,
      color: "text-emerald-500",
    },
    {
      label: "Roadmaps",
      count: legacyItems.filter((i) => i.source === "roadmap").length,
      color: "text-amber-500",
    },
  ].filter((s) => s.count > 0);

  const studioSorted = sorted.filter(isContentPiece);
  const legacySorted = sorted.filter((i) => !isContentPiece(i)) as LegacyItem[];

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button asChild>
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SEO
        title={`Content Studio — ${projectName} | goals.ac`}
        description="Manage and generate SEO content for your project."
      />
      <div className="container mx-auto px-4 md:px-8 max-w-6xl py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Link
              to="/dashboard"
              className="hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
            <span>›</span>
            <Link
              to={`/projects/${id}`}
              className="hover:text-foreground transition-colors"
            >
              {projectName}
            </Link>
            <span>›</span>
            <span className="text-foreground">Content Studio</span>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Content Studio
              </h1>
              <p className="text-muted-foreground mt-1">
                Generate, manage and schedule AI-powered content for{" "}
                {projectName}.
              </p>
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
                <Badge variant="secondary" className="ml-1 text-xs">
                  {allItems.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              Calendar
            </TabsTrigger>
          </TabsList>

          <ContentStudioHubTab
            sorted={sorted}
            allItems={allItems}
            statsBreakdown={statsBreakdown}
            filterSource={filterSource}
            setFilterSource={setFilterSource}
            filterFormat={filterFormat}
            setFilterFormat={setFilterFormat}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            sortKey={sortKey}
            setSortKey={setSortKey}
            studioSorted={studioSorted}
            legacySorted={legacySorted}
            onCreateOpen={() => setCreateOpen(true)}
            onMarkReady={handleMarkReady}
            onDelete={handleDelete}
          />

          <TabsContent value="calendar">
            {rescheduleError && (
              <div className="flex items-center justify-between gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-2.5 mb-3">
                <span>{rescheduleError}</span>
                <button type="button"
                  className="text-destructive/70 hover:text-destructive text-xs"
                  onClick={() => setRescheduleError(null)}
                >
                  ✕
                </button>
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
          <h2 className="font-semibold mb-4 text-muted-foreground uppercase tracking-wide text-xs">
            Other project tools
          </h2>
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
        hasGeminiKey={!!user?.hasGeminiKey}
        pieces={pieces.filter((p) => p.source === "studio")}
      />
    </AppLayout>
  );
}
