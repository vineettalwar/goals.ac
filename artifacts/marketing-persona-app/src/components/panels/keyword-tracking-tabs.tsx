"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Search, TrendingUp, Lightbulb, BarChart3, Map } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

import { KeywordRankChart, SerpFeaturesPanel, parseSerpFeatures } from "@workspace/app-shell";

const DIFFICULTY_COLORS = {
  low: "success" as const,
  medium: "warning" as const,
  high: "destructive" as const,
};

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

export type { Analysis };

interface RankSnapshot {
  checkedAt: string;
  position: number | null;
  serpFeatures?: Record<string, unknown>;
}

export function KeywordRankTrackingTab({
  trackInput,
  onTrackInputChange,
  onTrackKeyword,
  tracked,
  selectedTrackedId,
  onSelectTracked,
  onDeleteTracked,
  snapshots,
}: {
  trackInput: string;
  onTrackInputChange: (v: string) => void;
  onTrackKeyword: () => void;
  tracked: Array<{
    id: number;
    keyword: string;
    latestSnapshot?: {
      position?: number | null;
      serpFeatures?: Record<string, unknown>;
    } | null;
  }>;
  selectedTrackedId: number | null;
  onSelectTracked: (id: number) => void;
  onDeleteTracked: (id: number) => void;
  snapshots: RankSnapshot[];
}) {
  return (
    <div className="paper-card p-6 rounded-xl space-y-4">
      <h2 className="font-semibold flex items-center gap-2">
        <TrendingUp className="h-4 w-4" /> Rank tracking
      </h2>
      <div className="flex gap-2">
        <Input
          placeholder="Keyword to track"
          value={trackInput}
          onChange={(e) => onTrackInputChange(e.target.value)}
        />
        <Button onClick={onTrackKeyword}>
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
              onClick={() => onSelectTracked(kw.id)}
            >
              <span className="font-medium">{kw.keyword}</span>
              <span className="text-xs text-muted-foreground ml-2">
                {kw.latestSnapshot?.position != null ? `#${kw.latestSnapshot.position}` : "—"}
              </span>
            </button>
            <Button variant="ghost" size="icon" onClick={() => onDeleteTracked(kw.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      {selectedTrackedId != null ? (
        <>
          <KeywordRankChart snapshots={snapshots} />
          <SerpFeaturesPanel
            features={parseSerpFeatures(
              snapshots[0]?.serpFeatures ??
                tracked.find((kw) => kw.id === selectedTrackedId)?.latestSnapshot?.serpFeatures,
            )}
          />
        </>
      ) : null}
    </div>
  );
}

export function KeywordAnalyzerTab({
  keywordInput,
  websiteUrl,
  loading,
  analysis,
  onKeywordInputChange,
  onWebsiteUrlChange,
  onAnalyze,
  projectId,
}: {
  keywordInput: string;
  websiteUrl: string;
  loading: boolean;
  analysis: Analysis | null;
  onKeywordInputChange: (v: string) => void;
  onWebsiteUrlChange: (v: string) => void;
  onAnalyze: () => void;
  projectId?: string;
}) {
  const [clustering, setClustering] = useState(false);
  const [clusters, setClusters] = useState<{
    topicalAuthority: number;
    clusters: Array<{
      pillarTopic: string;
      pillarKeyword: string;
      searchVolume: string;
      difficulty: string;
      supportingTopics: Array<{ title: string; keyword: string }>;
    }>;
    quickWinKeywords: string[];
    recommendedNextArticle: string;
    semrushUsed?: boolean;
  } | null>(null);

  async function handleCluster() {
    if (!projectId) return;
    const seeds = keywordInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (seeds.length === 0) return;
    setClustering(true);
    const res = await fetch(`/api/website-projects/${projectId}/keyword-clusters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seeds }),
    });
    setClustering(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error((data as { error?: string }).error ?? "Cluster generation failed");
      return;
    }
    setClusters(await res.json());
    toast.success("Topical clusters ready");
  }

  return (
    <>
      <div className="paper-card p-6 rounded-xl space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Search className="h-4 w-4" /> Keyword analysis
        </h2>
        <div className="space-y-1.5">
          <Label>Keywords (comma-separated)</Label>
          <Input
            placeholder="B2B lead generation, SaaS marketing"
            value={keywordInput}
            onChange={(e) => onKeywordInputChange(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Website URL (optional)</Label>
          <Input
            placeholder="https://yoursite.com"
            value={websiteUrl}
            onChange={(e) => onWebsiteUrlChange(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onAnalyze} disabled={loading}>
            {loading ? (
              <>
                <Spinner size="sm" /> Analyzing…
              </>
            ) : (
              "Analyze keywords"
            )}
          </Button>
          {projectId ? (
            <Button
              variant="outline"
              onClick={() => void handleCluster()}
              disabled={clustering || loading}
            >
              {clustering ? (
                <>
                  <Spinner size="sm" /> Clustering…
                </>
              ) : (
                <>
                  <Map className="h-4 w-4" />
                  Seed → clusters
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>

      {clusters ? (
        <div className="paper-card p-6 rounded-xl space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="font-semibold flex items-center gap-2">
              <Map className="h-4 w-4" /> Topical clusters
            </h2>
            <p className="text-xs text-muted-foreground">
              Authority {clusters.topicalAuthority}/100
              {clusters.semrushUsed ? " · Semrush volumes" : " · AI estimates"}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Next article: {clusters.recommendedNextArticle}
          </p>
          <div className="space-y-3">
            {clusters.clusters.map((cluster) => (
              <div key={cluster.pillarKeyword} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{cluster.pillarTopic}</p>
                  <Badge variant="secondary">{cluster.searchVolume}</Badge>
                  <Badge variant="outline">{cluster.difficulty}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{cluster.pillarKeyword}</p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {cluster.supportingTopics.slice(0, 4).map((topic) => (
                    <li key={topic.keyword}>→ {topic.title}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {clusters.quickWinKeywords.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Quick wins: {clusters.quickWinKeywords.join(" · ")}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`/search/keywords?keyword=${encodeURIComponent(clusters.recommendedNextArticle)}`}
              >
                Open recommended keyword
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/search/keywords">Promote clusters in Ideas</Link>
            </Button>
          </div>
        </div>
      ) : null}

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
    </>
  );
}
