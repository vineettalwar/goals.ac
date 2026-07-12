import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/app-layout";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth";
import { useActiveProject } from "@/context/active-project";
import {
  Loader2,
  Sparkles,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface VisibilitySettings {
  llmTrackingEnabled: boolean;
  geoReauditEnabled: boolean;
  lastVisibilityCheckAt?: string;
  lastGeoReauditAt?: string;
}

interface VisibilitySummary {
  settings: VisibilitySettings;
  visibilityScore: number;
  promptCount: number;
  trend: Array<{ date: string; score: number; cited: number; total: number }>;
  byEngine: Array<{ engine: string; cited: number; total: number; score: number }>;
  competitorMentions: Array<{ name: string; count: number }>;
  geoScoreTrend: Array<{ date: string; score: number }>;
  latestGeoScore: number | null;
  recentSnapshots: Array<{
    id: number;
    prompt: string;
    engine: string;
    cited: boolean;
    competitorsMentioned: string[];
    checkedAt: string;
  }>;
}

const ENGINE_LABELS: Record<string, string> = {
  chatgpt: "ChatGPT",
  perplexity: "Perplexity",
  claude: "Claude",
  gemini: "Gemini",
};

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 60 ? "text-emerald-500" : score >= 30 ? "text-amber-500" : "text-red-500";
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/30" />
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeDasharray={`${score} 100`}
          className={color}
        />
      </svg>
      <div className="absolute text-center">
        <span className={`text-2xl font-bold ${color}`}>{score}</span>
        <p className="text-[10px] text-muted-foreground">visibility</p>
      </div>
    </div>
  );
}

export default function AiVisibility() {
  const { token } = useAuth();
  const { activeProjectId } = useActiveProject();
  const [summary, setSummary] = useState<VisibilitySummary | null>(null);
  const [settings, setSettings] = useState<VisibilitySettings>({
    llmTrackingEnabled: false,
    geoReauditEnabled: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !activeProjectId) {
      setSummary(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [settingsRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE}/api/website-projects/${activeProjectId}/visibility-settings`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/website-projects/${activeProjectId}/visibility`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (settingsRes.ok) {
        setSettings((await settingsRes.json()) as VisibilitySettings);
      }
      if (summaryRes.ok) {
        setSummary((await summaryRes.json()) as VisibilitySummary);
      } else {
        setSummary(null);
      }
    } catch {
      setError("Failed to load visibility data");
    } finally {
      setIsLoading(false);
    }
  }, [token, activeProjectId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveSettings = async (next: VisibilitySettings) => {
    if (!token || !activeProjectId) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/website-projects/${activeProjectId}/visibility-settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(next),
      });
      if (!res.ok) {
        setError("Failed to save settings");
        return;
      }
      const saved = (await res.json()) as VisibilitySettings;
      setSettings(saved);

      if (saved.llmTrackingEnabled && (summary?.promptCount ?? 0) === 0) {
        await fetch(`${API_BASE}/api/website-projects/${activeProjectId}/visibility/seed-prompts`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      await load();
    } finally {
      setIsSaving(false);
    }
  };

  const runCheckNow = async () => {
    if (!token || !activeProjectId) return;
    setIsChecking(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/website-projects/${activeProjectId}/visibility/check-now`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` },
        body: JSON.stringify({ async: true }),
      });
      if (!res.ok) {
        setError("Failed to queue visibility check");
        return;
      }
      setTimeout(() => load(), 3000);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <AppLayout>
      <SEO
        title="AI Visibility Tracking | goals.ac"
        description="Track how often your brand is cited across AI search engines — ChatGPT, Perplexity, Claude, and Gemini."
      />
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-violet-500" />
              AI Visibility
            </h1>
            <p className="text-muted-foreground mt-1 text-sm max-w-xl">
              Track whether AI engines cite your brand when users ask questions in your niche.
              Runs weekly when enabled — or check now.
            </p>
          </div>
          {activeProjectId && (
            <Button onClick={runCheckNow} disabled={isChecking || isLoading} variant="outline" className="shrink-0">
              {isChecking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Check now
            </Button>
          )}
        </div>

        {!activeProjectId && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              Select a project from the dashboard to track AI visibility.
            </CardContent>
          </Card>
        )}

        {activeProjectId && (
          <>
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-4 py-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tracking settings</CardTitle>
                <CardDescription>Enable weekly automated checks for this project</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
                  <div>
                    <Label>LLM citation tracking</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Weekly checks across ChatGPT, Perplexity, Claude, and Gemini-style answers
                    </p>
                  </div>
                  <Switch
                    checked={settings.llmTrackingEnabled}
                    disabled={isSaving}
                    onCheckedChange={(checked) => {
                      const next = { ...settings, llmTrackingEnabled: checked };
                      setSettings(next);
                      saveSettings(next);
                    }}
                  />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
                  <div>
                    <Label>Weekly GEO re-audit</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Re-run technical GEO audit on your homepage every Sunday
                    </p>
                  </div>
                  <Switch
                    checked={settings.geoReauditEnabled}
                    disabled={isSaving}
                    onCheckedChange={(checked) => {
                      const next = { ...settings, geoReauditEnabled: checked };
                      setSettings(next);
                      saveSettings(next);
                    }}
                  />
                </div>
                {settings.lastVisibilityCheckAt && (
                  <p className="text-xs text-muted-foreground">
                    Last visibility check: {new Date(settings.lastVisibilityCheckAt).toLocaleString()}
                  </p>
                )}
                {settings.lastGeoReauditAt && (
                  <p className="text-xs text-muted-foreground">
                    Last GEO re-audit: {new Date(settings.lastGeoReauditAt).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>

            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : summary ? (
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
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={summary.trend}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {summary.geoScoreTrend.length > 1 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">GEO score trend</CardTitle>
                    </CardHeader>
                    <CardContent className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={summary.geoScoreTrend}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
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
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={summary.competitorMentions.slice(0, 8)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
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
            ) : null}
          </>
        )}
      </div>
    </AppLayout>
  );
}
