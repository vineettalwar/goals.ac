"use client";

import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Search,
  TrendingUp,
  BarChart3,
  Lightbulb,
  Plus,
  Trash2,
  AlertTriangle,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { PageSkeleton } from "@/components/page-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActiveProject } from "@/context/active-project";
import {
  useKeywordIntelligence,
  useKeywordSnapshots,
  useTrackedKeywords,
} from "@/lib/queries";
import { queryKeys } from "@/lib/queries/keys";
import { ArticleIdeasHub, type SourceFilter } from "@/components/panels/article-ideas-hub";
import { ArticleIdeasImportPanel } from "@/components/panels/article-ideas-import-panel";

const KeywordRankChart = dynamic(
  () => import("@/components/keyword-rank-chart").then((m) => m.KeywordRankChart),
  { loading: () => <div className="h-48 animate-pulse rounded-lg bg-secondary/50" /> },
);

interface KeywordResult {
  keyword: string;
  estimatedVolume: string;
  difficulty: "low" | "medium" | "high";
  aiVisibility: number;
  opportunities: string[];
  suggestedContent: string;
}

interface Analysis {
  keywords: KeywordResult[];
  topOpportunity: string;
  summary: string;
}

const DIFFICULTY_COLORS = {
  low: "success" as const,
  medium: "warning" as const,
  high: "destructive" as const,
};

const RESEARCH_SOURCE_FILTERS = new Set<SourceFilter>([
  "semrush",
  "gsc_query",
  "csv_import",
  "google_sheets",
  "manual",
  "imports",
  "ai_analysis",
  "competitor_gap",
  "rank_drop",
]);

function isSourceFilter(value: string | null): value is SourceFilter {
  return value != null && RESEARCH_SOURCE_FILTERS.has(value as SourceFilter);
}

export function KeywordTrackingPanel({ embedded = false }: { embedded?: boolean }) {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { activeProjectId, activeProject, isLoading: projectLoading } = useActiveProject();
  const projectId = activeProjectId != null ? String(activeProjectId) : "";
  const [activeTab, setActiveTab] = useState("ideas");
  const [keywordInput, setKeywordInput] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [trackInput, setTrackInput] = useState("");
  const [selectedTrackedId, setSelectedTrackedId] = useState<number | null>(null);
  const [ideasSourceFilter, setIdeasSourceFilter] = useState<SourceFilter>("all");

  const { data: tracked = [], isLoading: trackedLoading } = useTrackedKeywords(projectId);
  const {
    alerts,
    isLoading: intelligenceLoading,
    refetch: refetchIntelligence,
  } = useKeywordIntelligence(projectId);
  const { data: snapshots = [] } = useKeywordSnapshots(selectedTrackedId);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "import" || tab === "tracking" || tab === "analyzer" || tab === "ideas") {
      setActiveTab(tab);
    }
    const source = searchParams.get("source");
    if (isSourceFilter(source)) {
      setIdeasSourceFilter(source);
    }
    if (searchParams.get("sheets") === "connected") {
      toast.success("Google Sheets connected");
    }
    if (searchParams.get("sheets") === "error") {
      toast.error("Google Sheets connection failed");
    }
    if (searchParams.get("sheets") === "forbidden") {
      toast.error("Only site admins can connect Google Sheets for this project");
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeProject?.url) {
      setWebsiteUrl(activeProject.url);
    }
    setAnalysis(null);
    setSelectedTrackedId(null);
    setKeywordInput("");
    setTrackInput("");
  }, [activeProjectId, activeProject?.url]);

  async function handleAnalyze() {
    const keywords = keywordInput
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    if (keywords.length === 0) {
      toast.error("Enter at least one keyword");
      return;
    }

    setLoading(true);
    setAnalysis(null);
    const res = await fetch("/api/keyword-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keywords,
        websiteUrl: websiteUrl || undefined,
        websiteProjectId: activeProjectId ?? undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error("Analysis failed");
      return;
    }
    setAnalysis(await res.json());
  }

  async function handleTrackKeyword() {
    if (!projectId || !trackInput.trim()) return;
    const res = await fetch("/api/tracked-keywords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        websiteProjectId: Number(projectId),
        keyword: trackInput.trim(),
        targetUrl: websiteUrl || undefined,
      }),
    });
    if (!res.ok) {
      toast.error("Failed to track keyword");
      return;
    }
    setTrackInput("");
    await queryClient.invalidateQueries({ queryKey: queryKeys.trackedKeywords(projectId) });
    toast.success("Keyword tracked");
  }

  async function handleDeleteTracked(id: number) {
    await fetch(`/api/tracked-keywords?id=${id}`, { method: "DELETE" });
    await queryClient.invalidateQueries({ queryKey: queryKeys.trackedKeywords(projectId) });
    if (selectedTrackedId === id) setSelectedTrackedId(null);
  }

  const showInitialLoad =
    projectId && trackedLoading && intelligenceLoading && tracked.length === 0;

  const containerClass = embedded ? "space-y-6" : "px-8 py-8 max-w-5xl space-y-6";

  return (
    <div className={containerClass}>
      {!embedded ? (
        <div>
          <h1 className="text-2xl font-bold">Keyword research</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Article ideas from Search Console, imports, rank tracking, and AI analysis
          </p>
        </div>
      ) : null}

      {!projectId ? (
        projectLoading ? (
          <PageSkeleton />
        ) : (
          <div className="paper-card p-6 rounded-xl text-sm text-muted-foreground">
            Choose a project in the sidebar to research keywords.
          </div>
        )
      ) : showInitialLoad ? (
        <PageSkeleton />
      ) : (
        <>
          {activeProject && (
            <p className="text-sm text-muted-foreground">
              Project: <span className="font-medium text-foreground">{activeProject.name}</span>
            </p>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="ideas">
                <Lightbulb className="h-4 w-4 mr-1" />
                Article ideas
              </TabsTrigger>
              <TabsTrigger value="import">
                <Upload className="h-4 w-4 mr-1" />
                Import
              </TabsTrigger>
              <TabsTrigger value="tracking">
                <TrendingUp className="h-4 w-4 mr-1" />
                Rank tracking
              </TabsTrigger>
              <TabsTrigger value="analyzer">
                <Search className="h-4 w-4 mr-1" />
                AI analyzer
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ideas" className="space-y-6 mt-6">
              <ArticleIdeasHub
                projectId={projectId}
                initialSourceFilter={ideasSourceFilter}
                onRefetch={() => refetchIntelligence()}
              />

              {alerts.length > 0 && (
                <div className="paper-card p-6 rounded-xl space-y-3">
                  <h2 className="font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" /> Rank alerts
                  </h2>
                  {alerts.map((a) => (
                    <div
                      key={a.id}
                      className="text-sm p-3 rounded-lg bg-amber-500/5 border border-amber-500/20"
                    >
                      <span className="font-medium">{a.keyword}</span>: {a.message}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="import" className="mt-6">
              <ArticleIdeasImportPanel
                projectId={projectId}
                onImported={() => refetchIntelligence()}
              />
            </TabsContent>

            <TabsContent value="tracking" className="space-y-6 mt-6">
              <div className="paper-card p-6 rounded-xl space-y-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Rank tracking
                </h2>
                <div className="flex gap-2">
                  <Input
                    placeholder="Keyword to track"
                    value={trackInput}
                    onChange={(e) => setTrackInput(e.target.value)}
                  />
                  <Button onClick={handleTrackKeyword}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {tracked.map((kw) => (
                    <div
                      key={kw.id}
                      className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border"
                    >
                      <button
                        type="button"
                        className="text-left flex-1"
                        onClick={() => setSelectedTrackedId(kw.id)}
                      >
                        <span className="font-medium">{kw.keyword}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {kw.latestSnapshot?.position != null
                            ? `#${kw.latestSnapshot.position}`
                            : "—"}
                        </span>
                      </button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteTracked(kw.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                {selectedTrackedId && <KeywordRankChart snapshots={snapshots} />}
              </div>
            </TabsContent>

            <TabsContent value="analyzer" className="space-y-6 mt-6">
              <div className="paper-card p-6 rounded-xl space-y-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <Search className="h-4 w-4" /> Keyword analysis
                </h2>
                <div className="space-y-1.5">
                  <Label>Keywords (comma-separated)</Label>
                  <Input
                    placeholder="B2B lead generation, SaaS marketing"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Website URL (optional)</Label>
                  <Input
                    placeholder="https://yoursite.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                  />
                </div>
                <Button onClick={handleAnalyze} disabled={loading}>
                  {loading ? (
                    <>
                      <Spinner size="sm" /> Analyzing…
                    </>
                  ) : (
                    "Analyze keywords"
                  )}
                </Button>
              </div>

              {analysis && (
                <div className="space-y-4">
                  <div className="paper-card rounded-xl p-5">
                    <h2 className="font-semibold flex items-center gap-2 mb-2">
                      <Lightbulb className="h-4 w-4 text-primary" /> Top opportunity
                    </h2>
                    <p className="text-sm text-muted-foreground">{analysis.topOpportunity}</p>
                    <p className="text-sm mt-2">{analysis.summary}</p>
                  </div>
                  {analysis.keywords.map((kw, i) => (
                    <div key={i} className="paper-card rounded-xl p-5 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h3 className="font-semibold">{kw.keyword}</h3>
                        <Badge variant={DIFFICULTY_COLORS[kw.difficulty]}>{kw.difficulty}</Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${kw.aiVisibility}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">AI: {kw.aiVisibility}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      <p className="text-sm text-muted-foreground">
        Also see{" "}
        <Link href="/search/visibility" className="text-primary hover:underline">
          Visibility
        </Link>{" "}
        for LLM citation tracking and Search Console connection.
      </p>
    </div>
  );
}
