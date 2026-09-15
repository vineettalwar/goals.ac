"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

import {
  KeywordRankChart,
  SerpFeaturesPanel,
  parseSerpFeatures,
} from "@workspace/app-shell/section-panels";

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
    <div className="space-y-6">
      <form
        className="flex max-w-xl gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onTrackKeyword();
        }}
      >
        <Input
          placeholder="Keyword to track"
          value={trackInput}
          onChange={(e) => onTrackInputChange(e.target.value)}
          aria-label="Keyword to track"
        />
        <Button type="submit">Track</Button>
      </form>

      {tracked.length === 0 ? (
        <p className="max-w-prose text-sm text-muted-foreground">
          No keywords tracked yet. Add a query to watch its SERP position over time.
        </p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {tracked.map((kw) => (
            <li key={kw.id} className="flex items-center justify-between gap-2 py-3">
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => onSelectTracked(kw.id)}
              >
                <span className="font-medium">{kw.keyword}</span>
                <span className="ml-2 text-xs tabular-nums text-muted-foreground">
                  {kw.latestSnapshot?.position != null ? `#${kw.latestSnapshot.position}` : "—"}
                </span>
              </button>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Stop tracking ${kw.keyword}`}
                onClick={() => onDeleteTracked(kw.id)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      {selectedTrackedId != null ? (
        <div className="space-y-4">
          <KeywordRankChart snapshots={snapshots} />
          <SerpFeaturesPanel
            features={parseSerpFeatures(
              snapshots[0]?.serpFeatures ??
                tracked.find((kw) => kw.id === selectedTrackedId)?.latestSnapshot?.serpFeatures,
            )}
          />
        </div>
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
      <form
        className="max-w-xl space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onAnalyze();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="keyword-analysis-input">Keywords</Label>
          <Input
            id="keyword-analysis-input"
            placeholder="B2B lead generation, SaaS marketing"
            value={keywordInput}
            onChange={(e) => onKeywordInputChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Comma-separated. Analysis and clusters share this list.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="keyword-analysis-url">Website URL</Label>
          <Input
            id="keyword-analysis-url"
            placeholder="https://yoursite.com"
            value={websiteUrl}
            onChange={(e) => onWebsiteUrlChange(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Spinner size="sm" /> Analyzing…
              </>
            ) : (
              "Analyze"
            )}
          </Button>
          {projectId ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleCluster()}
              disabled={clustering || loading}
            >
              {clustering ? (
                <>
                  <Spinner size="sm" /> Clustering…
                </>
              ) : (
                "Build clusters"
              )}
            </Button>
          ) : null}
        </div>
      </form>

      {clusters ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold tracking-tight">Clusters</h2>
            <p className="text-xs tabular-nums text-muted-foreground">
              Authority {clusters.topicalAuthority}/100
              {clusters.semrushUsed ? " · Semrush volumes" : " · estimated volumes"}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Next article: {clusters.recommendedNextArticle}
          </p>
          <ul className="divide-y divide-border border-t border-border">
            {clusters.clusters.map((cluster) => (
              <li key={cluster.pillarKeyword} className="py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{cluster.pillarTopic}</p>
                  <Badge variant="secondary">{cluster.searchVolume}</Badge>
                  <Badge variant="outline">{cluster.difficulty}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{cluster.pillarKeyword}</p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {cluster.supportingTopics.slice(0, 4).map((topic) => (
                    <li key={topic.keyword}>{topic.title}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          {clusters.quickWinKeywords.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Quick wins: {clusters.quickWinKeywords.join(" · ")}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`/search/keywords?keyword=${encodeURIComponent(clusters.recommendedNextArticle)}`}
              >
                Open recommended keyword
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/search/keywords">Back to ideas</Link>
            </Button>
          </div>
        </div>
      ) : null}

      {analysis ? (
        <div className="space-y-6">
          <div>
            <h2 className="font-semibold tracking-tight">Top opportunity</h2>
            <p className="mt-2 text-sm text-muted-foreground">{analysis.topOpportunity}</p>
            <p className="mt-2 max-w-prose text-sm">{analysis.summary}</p>
          </div>
          <ul className="divide-y divide-border border-t border-border">
            {analysis.keywords.map((kw) => (
              <li key={kw.keyword} className="space-y-3 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-medium">{kw.keyword}</h3>
                  <Badge variant={DIFFICULTY_COLORS[kw.difficulty]}>{kw.difficulty}</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${kw.aiVisibility}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium tabular-nums">
                    Visibility {kw.aiVisibility}%
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
