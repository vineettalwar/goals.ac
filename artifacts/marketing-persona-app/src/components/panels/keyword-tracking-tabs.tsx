"use client";

import dynamic from "next/dynamic";
import { Plus, Trash2, Search, TrendingUp, Lightbulb, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

const KeywordRankChart = dynamic(
  () => import("@/components/visibility/keyword-rank-chart").then((m) => m.KeywordRankChart),
  { loading: () => <div className="h-48 animate-pulse rounded-lg bg-secondary/50" /> },
);

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
  tracked: Array<{ id: number; keyword: string; latestSnapshot?: { position?: number | null } | null }>;
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
      {selectedTrackedId != null && <KeywordRankChart snapshots={snapshots} />}
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
}: {
  keywordInput: string;
  websiteUrl: string;
  loading: boolean;
  analysis: Analysis | null;
  onKeywordInputChange: (v: string) => void;
  onWebsiteUrlChange: (v: string) => void;
  onAnalyze: () => void;
}) {
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
        <Button onClick={onAnalyze} disabled={loading}>
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
    </>
  );
}
