import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, RefreshCw, TrendingUp, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";
import {
  VisibilityTrendChart,
  GeoScoreTrendChart,
  CompetitorMentionsBarChart,
} from "@/components/visibility/ai-visibility-charts";
import { ScoreRing } from "./ai-visibility-score-ring";
import { ENGINE_LABELS } from "./ai-visibility-constants";

interface VisibilitySummary {
  settings: { llmTrackingEnabled: boolean; geoReauditEnabled: boolean; lastVisibilityCheckAt?: string; lastGeoReauditAt?: string };
  visibilityScore: number;
  promptCount: number;
  trend: Array<{ date: string; score: number; cited: number; total: number }>;
  byEngine: Array<{ engine: string; cited: number; total: number; score: number }>;
  competitorMentions: Array<{ name: string; count: number }>;
  geoScoreTrend: Array<{ date: string; score: number }>;
  latestGeoScore: number | null;
  recentSnapshots: Array<{ id: number; prompt: string; engine: string; cited: boolean; competitorsMentioned: string[]; checkedAt: string }>;
}

export function AiVisibilitySummary({ summary, activeProjectId }: { summary: VisibilitySummary; activeProjectId: number }) {
  return (
    <>
              <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6 flex flex-col items-center">
            <ScoreRing score={summary.visibilityScore} />
            <p className="text-sm text-muted-foreground mt-2 text-center">
              {summary.promptCount} prompts tracked
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> GEO score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {summary.latestGeoScore ?? "—"}
              {summary.latestGeoScore != null && (
                <span className="text-base font-normal text-muted-foreground">/100</span>
              )}
            </p>
            <Link
              to="/geo-audit"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-flex items-center gap-1"
            >
              Run manual audit <ExternalLink className="w-3 h-3" />
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">By engine</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.byEngine.map((e) => (
              <div key={e.engine} className="flex items-center justify-between text-sm">
                <span>{ENGINE_LABELS[e.engine] ?? e.engine}</span>
                <Badge variant="secondary">{e.score}% cited</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {summary.trend.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visibility over time</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <VisibilityTrendChart data={summary.trend} />
          </CardContent>
        </Card>
      )}

      {summary.geoScoreTrend.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">GEO score trend</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <GeoScoreTrendChart data={summary.geoScoreTrend} />
          </CardContent>
        </Card>
      )}

      {summary.competitorMentions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Competitor mentions in AI answers</CardTitle>
            <CardDescription>
              How often competitors appear when your brand does not
            </CardDescription>
          </CardHeader>
          <CardContent className="h-56">
            <CompetitorMentionsBarChart data={summary.competitorMentions} />
          </CardContent>
        </Card>
      )}

      {summary.recentSnapshots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent checks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.recentSnapshots.map((snap) => (
              <div key={snap.id} className="rounded-lg border px-4 py-3 text-sm space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium line-clamp-2">{snap.prompt}</p>
                  {snap.cited ? (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 shrink-0">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Cited
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="shrink-0">Not cited</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {ENGINE_LABELS[snap.engine] ?? snap.engine} ·{" "}
                  {new Date(snap.checkedAt).toLocaleString()}
                  {snap.competitorsMentioned.length > 0 &&
                    ` · Competitors: ${snap.competitorsMentioned.join(", ")}`}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {summary.promptCount === 0 && (
        <Card>
          <CardContent className="py-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              No prompts yet. Add competitor URLs and keywords in your brand profile, then enable tracking.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to={`/projects/${activeProjectId}/brand`}>Edit brand profile</Link>
            </Button>
          </CardContent>
        </Card>
      )}
              </>
    </>
  );
}
