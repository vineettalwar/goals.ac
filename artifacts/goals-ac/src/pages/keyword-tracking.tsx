import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/app-layout";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Plus,
  X,
  Loader2,
  BarChart3,
  Globe,
  Zap,
  Lock,
  Trash2,
  AlertTriangle,
  Target,
  ListPlus,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/auth";
import { useActiveProject } from "@/context/active-project";
import {
  useCreateKeywordAnalysis,
  useListTrackedKeywords,
  useCreateTrackedKeyword,
  useDeleteTrackedKeyword,
  useGetTrackedKeywordSnapshots,
  getListTrackedKeywordsQueryKey,
  getGetTrackedKeywordSnapshotsQueryKey,
  type KeywordAnalysisResponse,
  type TrackedKeywordWithSnapshot,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface KeywordOpportunity {
  id: number;
  keyword: string;
  source: string;
  opportunityScore: number;
  difficulty: string | null;
  estimatedVolume: string | null;
  suggestedTitle: string;
  suggestedAngle: string;
  status: string;
  contentItemId: number | null;
}

interface KeywordRankAlert {
  id: number;
  keyword: string;
  previousPosition: number | null;
  currentPosition: number | null;
  severity: string;
  message: string;
}

const difficultyColors: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30",
  medium: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30",
  high: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30",
};

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay },
  };
}

export default function KeywordTracking() {
  const { user, token } = useAuth();
  const { activeProjectId, projects } = useActiveProject();
  const queryClient = useQueryClient();

  const [keywords, setKeywords] = useState<string[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<KeywordAnalysisResponse | null>(null);
  const [selectedTrackedId, setSelectedTrackedId] = useState<number | null>(null);
  const [trackInput, setTrackInput] = useState("");
  const [opportunities, setOpportunities] = useState<KeywordOpportunity[]>([]);
  const [alerts, setAlerts] = useState<KeywordRankAlert[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [queueingId, setQueueingId] = useState<number | null>(null);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  useEffect(() => {
    if (activeProject?.url && !websiteUrl) {
      setWebsiteUrl(activeProject.url);
    }
  }, [activeProject?.url, websiteUrl]);

  const loadIntelligence = useCallback(async () => {
    if (!token || !activeProjectId) {
      setOpportunities([]);
      setAlerts([]);
      return;
    }
    try {
      const [oppRes, alertRes] = await Promise.all([
        fetch(`${API_BASE}/api/website-projects/${activeProjectId}/keyword-opportunities?status=open`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/website-projects/${activeProjectId}/keyword-alerts`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (oppRes.ok) {
        const data = await oppRes.json() as { opportunities: KeywordOpportunity[] };
        setOpportunities(data.opportunities ?? []);
      }
      if (alertRes.ok) {
        const data = await alertRes.json() as { alerts: KeywordRankAlert[] };
        setAlerts(data.alerts ?? []);
      }
    } catch {
      /* ignore */
    }
  }, [token, activeProjectId]);

  useEffect(() => {
    loadIntelligence();
  }, [loadIntelligence]);

  const handleDiscoverGaps = async () => {
    if (!token || !activeProjectId) return;
    setIsDiscovering(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/website-projects/${activeProjectId}/keyword-opportunities/discover`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Discovery failed");
        return;
      }
      await loadIntelligence();
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleQueueOpportunity = async (id: number) => {
    if (!token) return;
    setQueueingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/keyword-opportunities/${id}/queue`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Failed to queue topic");
        return;
      }
      await loadIntelligence();
    } finally {
      setQueueingId(null);
    }
  };

  const handleDismissOpportunity = async (id: number) => {
    if (!token) return;
    await fetch(`${API_BASE}/api/keyword-opportunities/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "dismissed" }),
    });
    await loadIntelligence();
  };

  const handleDismissAlert = async (id: number) => {
    if (!token) return;
    await fetch(`${API_BASE}/api/keyword-rank-alerts/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "dismissed" }),
    });
    await loadIntelligence();
  };

  const analyzeMutation = useCreateKeywordAnalysis({
    mutation: {
      onSuccess: (data) => {
        setResult(data);
        setError(null);
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
      },
    },
  });

  const trackedQuery = useListTrackedKeywords(
    { projectId: activeProjectId ?? 0 },
    {
      query: {
        enabled: Boolean(user && activeProjectId),
        queryKey: getListTrackedKeywordsQueryKey({ projectId: activeProjectId ?? 0 }),
      },
    },
  );

  const snapshotsQuery = useGetTrackedKeywordSnapshots(selectedTrackedId ?? 0, {
    query: {
      enabled: Boolean(selectedTrackedId),
      queryKey: getGetTrackedKeywordSnapshotsQueryKey(selectedTrackedId ?? 0),
    },
  });

  const trackMutation = useCreateTrackedKeyword({
    mutation: {
      onSuccess: () => {
        setTrackInput("");
        if (activeProjectId) {
          queryClient.invalidateQueries({ queryKey: [`/api/tracked-keywords`] });
        }
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : "Failed to add keyword to tracking.");
      },
    },
  });

  const deleteMutation = useDeleteTrackedKeyword({
    mutation: {
      onSuccess: () => {
        if (activeProjectId) {
          queryClient.invalidateQueries({ queryKey: [`/api/tracked-keywords`] });
        }
        if (selectedTrackedId) setSelectedTrackedId(null);
      },
    },
  });

  const trackedKeywords: TrackedKeywordWithSnapshot[] =
    trackedQuery.data?.trackedKeywords ?? [];

  const addKeyword = () => {
    const kw = inputVal.trim().toLowerCase();
    if (!kw || keywords.includes(kw) || keywords.length >= 10) return;
    setKeywords((prev) => [...prev, kw]);
    setInputVal("");
  };

  const removeKeyword = (kw: string) => {
    setKeywords((prev) => prev.filter((k) => k !== kw));
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addKeyword();
    }
  };

  const handleAnalyze = () => {
    if (keywords.length === 0) return;
    setError(null);
    setResult(null);
    analyzeMutation.mutate({
      data: {
        keywords,
        websiteUrl: websiteUrl || undefined,
        website_project_id: user && activeProjectId ? activeProjectId : undefined,
      },
    });
  };

  const handleTrackKeyword = (keyword: string) => {
    if (!activeProjectId) return;
    trackMutation.mutate({
      data: {
        website_project_id: activeProjectId,
        keyword: keyword.trim().toLowerCase(),
        target_url: websiteUrl || activeProject?.url,
      },
    });
  };

  const chartData = (snapshotsQuery.data?.snapshots ?? [])
    .slice()
    .reverse()
    .map((s) => ({
      date: new Date(s.checkedAt).toLocaleDateString(),
      position: s.position ?? 101,
    }));

  return (
    <AppLayout>
      <SEO
        title="Keyword Rank Tracking | goals.ac"
        description="Track SERP positions for target keywords and get AI-powered difficulty and visibility analysis."
      />

      <div className="relative bg-mesh-dark text-zinc-50 py-16 md:py-20 border-b border-white/[0.06] overflow-hidden">
        <div className="orb orb-primary w-[400px] h-[300px] top-[-10%] right-[20%]" />
        <div className="container relative z-10 mx-auto px-4 md:px-8 max-w-3xl text-center">
          <motion.div {...fadeUp(0)}>
            <div className="inline-flex items-center rounded-full border border-blue-400/20 bg-blue-500/[0.08] px-3 py-1 text-xs font-semibold text-blue-300 mb-5">
              <BarChart3 className="w-3 h-3 mr-1.5" /> KEYWORD INTELLIGENCE
            </div>
          </motion.div>
          <motion.h1 {...fadeUp(0.07)} className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Keyword Tracking
          </motion.h1>
          <motion.p {...fadeUp(0.13)} className="text-lg text-zinc-400 max-w-xl mx-auto">
            Analyze keyword opportunities with AI, then track real Google rankings over time for your project.
          </motion.p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-12 max-w-3xl space-y-10">
        {!user && (
          <motion.div {...fadeUp(0)} className="rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 px-4 py-3 flex items-center gap-3">
            <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <Link to="/signup" className="font-semibold underline underline-offset-2">Sign up free</Link> to save analyses and track keyword rankings on your project.
            </p>
          </motion.div>
        )}

        {user && activeProject && (
          <motion.div {...fadeUp(0)} className="rounded-xl border border-border bg-muted/40 px-4 py-3 flex items-center gap-3">
            <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">
              Project: <span className="font-semibold text-foreground">{activeProject.name}</span>
            </p>
          </motion.div>
        )}

        {user && activeProjectId && (
          <motion.div {...fadeUp(0.05)} className="space-y-4">
            <h2 className="text-lg font-semibold">Rank Tracking</h2>
            <Card className="shadow-none">
              <CardContent className="pt-4 space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Keyword to track in Google"
                    value={trackInput}
                    onChange={(e) => setTrackInput(e.target.value)}
                    disabled={trackMutation.isPending}
                  />
                  <Button
                    variant="outline"
                    onClick={() => handleTrackKeyword(trackInput)}
                    disabled={!trackInput.trim() || trackMutation.isPending}
                  >
                    {trackMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {trackedQuery.isLoading && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading tracked keywords…
                  </p>
                )}

                {trackedKeywords.length === 0 && !trackedQuery.isLoading && (
                  <p className="text-sm text-muted-foreground">
                    No tracked keywords yet. Add one above or track from analysis results below.
                  </p>
                )}

                <div className="space-y-2">
                  {trackedKeywords.map((tk) => (
                    <div
                      key={tk.id}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                        selectedTrackedId === tk.id ? "border-blue-500 bg-blue-50/50 dark:bg-blue-500/5" : "border-border"
                      }`}
                      onClick={() => setSelectedTrackedId(tk.id)}
                    >
                      <div>
                        <p className="text-sm font-medium">{tk.keyword}</p>
                        <p className="text-xs text-muted-foreground">
                          {tk.latestSnapshot?.position != null
                            ? `Position #${tk.latestSnapshot.position}`
                            : "Not ranked in top 100"}
                          {tk.lastCheckedAt && ` · Last checked ${new Date(tk.lastCheckedAt).toLocaleDateString()}`}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate({ id: tk.id });
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>

                {selectedTrackedId && chartData.length > 0 && (
                  <div className="h-48 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis reversed domain={[1, 101]} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => (v > 100 ? "Not ranked" : `#${v}`)} />
                        <Line type="monotone" dataKey="position" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {user && activeProjectId && alerts.length > 0 && (
          <motion.div {...fadeUp(0.05)} className="mb-8 space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
                  alert.severity === "critical"
                    ? "border-red-300 bg-red-50 dark:bg-red-500/10 dark:border-red-500/30"
                    : "border-amber-300 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30"
                }`}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{alert.message}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDismissAlert(alert.id)}>
                  Dismiss
                </Button>
              </div>
            ))}
          </motion.div>
        )}

        {user && activeProjectId && (
          <motion.div {...fadeUp(0.08)} className="mb-8">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-500" />
                Keyword Opportunities
              </h2>
              <Button variant="outline" size="sm" onClick={handleDiscoverGaps} disabled={isDiscovering}>
                {isDiscovering ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ListPlus className="w-4 h-4 mr-2" />
                )}
                Discover gaps
              </Button>
            </div>
            <Card className="shadow-none">
              <CardContent className="pt-4 space-y-3">
                {opportunities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Run competitor analysis and keyword research, then click Discover gaps to find topics to queue into your content strategy.
                  </p>
                ) : (
                  opportunities.map((opp) => (
                    <div key={opp.id} className="rounded-lg border px-4 py-3 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-sm">{opp.keyword}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{opp.suggestedTitle}</p>
                        </div>
                        <Badge className="shrink-0">{opp.opportunityScore} score</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{opp.suggestedAngle}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {opp.difficulty && (
                          <Badge variant="outline" className={`text-xs capitalize ${difficultyColors[opp.difficulty] ?? ""}`}>
                            {opp.difficulty}
                          </Badge>
                        )}
                        {opp.estimatedVolume && (
                          <span className="text-xs text-muted-foreground">{opp.estimatedVolume}</span>
                        )}
                        <span className="text-xs text-muted-foreground capitalize">{opp.source.replace("_", " ")}</span>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          onClick={() => handleQueueOpportunity(opp.id)}
                          disabled={queueingId === opp.id}
                        >
                          {queueingId === opp.id ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : null}
                          Queue to strategy
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDismissOpportunity(opp.id)}>
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div {...fadeUp(0.1)}>
          <h2 className="text-lg font-semibold mb-4">AI Keyword Analysis</h2>
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Analyze Keywords</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. B2B SaaS growth strategy"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={handleKey}
                  disabled={analyzeMutation.isPending || keywords.length >= 10}
                />
                <Button
                  variant="outline"
                  onClick={addKeyword}
                  disabled={!inputVal.trim() || keywords.length >= 10}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {keywords.map((kw) => (
                    <Badge key={kw} variant="secondary" className="gap-1.5 pr-1.5 text-sm">
                      {kw}
                      <button onClick={() => removeKeyword(kw)} className="hover:text-destructive transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-1.5 block">Your Website URL (optional)</label>
                <Input
                  placeholder="https://yourstartup.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  disabled={analyzeMutation.isPending}
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                className="w-full glow-primary bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 border-0 text-white"
                onClick={handleAnalyze}
                disabled={analyzeMutation.isPending || keywords.length === 0}
              >
                {analyzeMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing keywords…</>
                ) : (
                  <><TrendingUp className="w-4 h-4 mr-2" />Analyze Keywords</>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
              className="space-y-5"
            >
              <Card className="shadow-none border-blue-200 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-500/5">
                <CardContent className="pt-4">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Top Opportunity
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">{result.topOpportunity}</p>
                </CardContent>
              </Card>

              <p className="text-sm text-muted-foreground">{result.summary}</p>

              <div className="space-y-4">
                {result.keywords.map((kw, i) => (
                  <Card key={i} className="shadow-none">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="font-semibold text-sm">{kw.keyword}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Est. monthly searches: {kw.estimatedVolume}</p>
                        </div>
                        <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                          <Badge className={`text-xs capitalize ${difficultyColors[kw.difficulty]}`}>
                            {kw.difficulty} difficulty
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            AI visibility: {kw.aiVisibility}%
                          </Badge>
                          {user && activeProjectId && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => handleTrackKeyword(kw.keyword)}
                              disabled={trackMutation.isPending}
                            >
                              Track rank
                            </Button>
                          )}
                        </div>
                      </div>
                      <ul className="space-y-1 mb-3">
                        {kw.opportunities.map((op, j) => (
                          <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="w-1 h-1 rounded-full bg-blue-500 shrink-0 mt-2" />{op}
                          </li>
                        ))}
                      </ul>
                      <div className="bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Suggested content:</span> {kw.suggestedContent}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
