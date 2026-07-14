"use client";

import Link from "next/link";
import { PenLine, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { KeywordOpportunity } from "@/lib/queries/types";

const SOURCE_LABELS: Record<string, string> = {
  semrush: "Semrush",
  gsc_query: "Search Console",
  csv_import: "CSV import",
  google_sheets: "Google Sheets",
  manual: "Manual",
  ai_analysis: "AI analysis",
  competitor_gap: "Competitor gap",
  rank_drop: "Rank drop",
};

const DIFFICULTY_COLORS = {
  low: "success" as const,
  medium: "warning" as const,
  high: "destructive" as const,
};

function contentStudioHref(projectId: number, opp: KeywordOpportunity): string {
  const params = new URLSearchParams({
    create: "1",
    format: "blog_article",
    keyword: opp.keyword,
    title: opp.suggestedTitle,
    angle: opp.suggestedAngle,
  });
  return `/projects/${projectId}/content-studio?${params.toString()}`;
}

type GscQueryMetrics = {
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
};

export function ArticleIdeasOpportunityList({
  opportunities,
  queryMetrics,
  activeProjectId,
  onQueue,
  onDismiss,
}: {
  opportunities: KeywordOpportunity[];
  queryMetrics: Map<string, GscQueryMetrics>;
  activeProjectId: number | null;
  onQueue: (id: number) => void;
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="space-y-2">
      {opportunities.map((opp) => {
        const metrics = queryMetrics.get(opp.keyword.toLowerCase());
        return (
          <div
            key={opp.id}
            className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{opp.keyword}</p>
                <Badge variant="secondary" className="text-xs">
                  {SOURCE_LABELS[opp.source] ?? opp.source}
                </Badge>
                {opp.difficulty && (
                  <Badge
                    variant={
                      DIFFICULTY_COLORS[opp.difficulty as keyof typeof DIFFICULTY_COLORS] ??
                      "secondary"
                    }
                    className="text-xs"
                  >
                    {opp.difficulty}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {opp.opportunityScore}
                </span>
              </div>
              <p className="text-sm mt-1">{opp.suggestedTitle}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{opp.suggestedAngle}</p>
              {(metrics || opp.estimatedVolume) && (
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics
                    ? `${metrics.impressions.toLocaleString()} imp · pos ${metrics.position.toFixed(1)} · CTR ${(metrics.ctr * 100).toFixed(1)}%`
                    : opp.estimatedVolume}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <Button size="sm" variant="outline" onClick={() => onQueue(opp.id)}>
                Queue
              </Button>
              {activeProjectId != null ? (
                <Button asChild size="sm" variant="ghost">
                  <Link href={contentStudioHref(activeProjectId, opp)}>
                    <PenLine className="h-3.5 w-3.5 mr-1" />
                    Studio
                  </Link>
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" onClick={() => onDismiss(opp.id)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
