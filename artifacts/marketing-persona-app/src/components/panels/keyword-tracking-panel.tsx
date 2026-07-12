"use client";

import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Search,
  TrendingUp,
  BarChart3,
  Lightbulb,
  Plus,
  Trash2,
  Target,
  AlertTriangle,
  ListPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { PageSkeleton } from "@/components/page-skeleton";
import { useActiveProject } from "@/context/active-project";
import {
  useKeywordIntelligence,
  useKeywordSnapshots,
  useTrackedKeywords,
} from "@/lib/queries";
import { queryKeys } from "@/lib/queries/keys";

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

interface TrackedKeyword {
  id: number;
  keyword: string;
  targetUrl: string | null;
  latestSnapshot: { position: number | null; checkedAt: string } | null;
}

interface KeywordOpportunity {
  id: number;
  keyword: string;
  opportunityScore: number;
  difficulty: string | null;
  suggestedTitle: string;
  status: string;
}

interface KeywordAlert {
  id: number;
  keyword: string;
  previousPosition: number | null;
  currentPosition: number | null;
  severity: string;
  message: string;
}

const DIFFICULTY_COLORS = {
  low: "success" as const,
  medium: "warning" as const,
  high: "destructive" as const,
};

export function KeywordTrackingPanel({ embedded = false }: { embedded?: boolean }) {
  const queryClient = useQueryClient();
  const { activeProjectId, activeProject } = useActiveProject();
  const projectId = activeProjectId != null ? String(activeProjectId) : "";
  const [keywordInput, setKeywordInput] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [trackInput, setTrackInput] = useState("");
  const [selectedTrackedId, setSelectedTrackedId] = useState<number | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);

  const { data: tracked = [], isLoading: trackedLoading } = useTrackedKeywords(projectId);
  const {
    opportunities,
    alerts,
    isLoading: intelligenceLoading,
    refetch: refetchIntelligence,
  } = useKeywordIntelligence(projectId);
  const { data: snapshots = [] } = useKeywordSnapshots(selectedTrackedId);

  useEffect(() => {
    if (activeProject?.url && !websiteUrl) {
      setWebsiteUrl(activeProject.url);
    }
  }, [activeProject?.url, websiteUrl]);

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
      body: JSON.stringify({ keywords, websiteUrl: websiteUrl || undefined }),
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

  async function handleDiscoverGaps() {
    if (!projectId) return;
    setIsDiscovering(true);
    const res = await fetch(`/api/website-projects/${projectId}/keyword-opportunities`, {
      method: "POST",
    });
    setIsDiscovering(false);
    if (!res.ok) {
      toast.error("Discovery failed");
      return;
    }
    toast.success("Opportunities discovered");
    await refetchIntelligence();
  }

  async function handleQueueOpportunity(id: number) {
    const res = await fetch(`/api/keyword-opportunities/${id}`, { method: "POST" });
    if (!res.ok) {
      toast.error("Failed to queue");
      return;
    }
    toast.success("Queued to content strategy");
    await refetchIntelligence();
  }

  const showInitialLoad =
    projectId && trackedLoading && intelligenceLoading && tracked.length === 0;

  const containerClass = embedded ? "space-y-8" : "px-8 py-8 max-w-5xl space-y-8";

  return (
    <div className={containerClass}>
      {!embedded ? (
        <div>
          <h1 className="text-2xl font-bold">Keyword Tracking</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Analyze keywords, track SERP ranks, and discover content gaps
          </p>
        </div>
      ) : null}

      {!projectId ? (
        <div className="paper-card p-6 rounded-xl text-sm text-muted-foreground">
          Choose a project in the sidebar to track keywords.
        </div>
      ) : showInitialLoad ? (
        <PageSkeleton />
      ) : (
        <>
          {activeProject && (
            <p className="text-sm text-muted-foreground">
              Project: <span className="font-medium text-foreground">{activeProject.name}</span>
            </p>
          )}

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
              {(tracked as TrackedKeyword[]).map((kw) => (
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
            {selectedTrackedId && (
              <KeywordRankChart
                snapshots={snapshots as Array<{ checkedAt: string; position: number | null }>}
              />
            )}
          </div>

          <div className="paper-card p-6 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Target className="h-4 w-4" /> Keyword gaps
              </h2>
              <Button variant="outline" size="sm" onClick={handleDiscoverGaps} disabled={isDiscovering}>
                {isDiscovering ? <Spinner size="sm" /> : <ListPlus className="h-4 w-4" />}
                Discover gaps
              </Button>
            </div>
            {(opportunities as KeywordOpportunity[]).map((opp) => (
              <div
                key={opp.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border"
              >
                <div>
                  <p className="font-medium">{opp.keyword}</p>
                  <p className="text-xs text-muted-foreground">{opp.suggestedTitle}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleQueueOpportunity(opp.id)}>
                  Queue
                </Button>
              </div>
            ))}
            {opportunities.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No open opportunities. Run discovery to find gaps.
              </p>
            )}
          </div>

          {(alerts as KeywordAlert[]).length > 0 && (
            <div className="paper-card p-6 rounded-xl space-y-3">
              <h2 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Rank alerts
              </h2>
              {(alerts as KeywordAlert[]).map((a) => (
                <div
                  key={a.id}
                  className="text-sm p-3 rounded-lg bg-amber-500/5 border border-amber-500/20"
                >
                  <span className="font-medium">{a.keyword}</span>: {a.message}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <p className="text-sm text-muted-foreground">
        Also see{" "}
        <Link href="/search/visibility" className="text-primary hover:underline">
          Visibility
        </Link>{" "}
        for LLM citation tracking.
      </p>
    </div>
  );
}
