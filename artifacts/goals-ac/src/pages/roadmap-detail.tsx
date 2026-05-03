import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { SEO } from "@/components/seo";
import { Layout } from "@/components/layout";
import {
  useGetRoadmap,
  getGetRoadmapQueryKey,
} from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ChevronRight, Eye, Target, TrendingUp, BarChart, Loader2, FileText, Zap, FolderOpen, BookmarkPlus, BookmarkCheck, Plus, KeyRound } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/context/auth";
import { useActiveProject } from "@/context/active-project";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function RoadmapDetail() {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { projects, activeProjectId, setActiveProjectId } = useActiveProject();

  const [generatingStrategy, setGeneratingStrategy] = useState(false);
  const [strategyBatch, setStrategyBatch] = useState<{ current: number; total: number } | null>(null);
  const [showSeoForm, setShowSeoForm] = useState(false);
  const [seoLoading, setSeoLoading] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [isPinning, setIsPinning] = useState(false);

  const { data: roadmap, isLoading, isError } = useGetRoadmap(slug, {
    query: {
      enabled: !!slug,
      queryKey: getGetRoadmapQueryKey(slug),
    },
  });

  useEffect(() => {
    if (!roadmap?.id || !activeProjectId || !token) {
      setIsPinned(false);
      return;
    }
    fetch(`${API_BASE}/api/website-projects/${activeProjectId}/content`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { roadmaps?: { id: number }[] } | null) => {
        if (data?.roadmaps) {
          setIsPinned(data.roadmaps.some((rm) => rm.id === roadmap.id));
        }
      })
      .catch(() => {});
  }, [roadmap?.id, activeProjectId, token]);

  const { data: existingStrategy } = useQuery<{ id: number } | null>({
    queryKey: ["content-strategy-for-roadmap", roadmap?.id, token],
    enabled: !!roadmap?.id && !!user && !!token,
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/api/content-strategies?roadmap_id=${roadmap!.id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) return null;
      const list = await res.json() as { id: number }[];
      return list.length > 0 ? list[0] : null;
    },
  });

  const handleViewContentStrategy = async () => {
    if (!roadmap) return;
    if (existingStrategy) {
      navigate(`/content-strategy/${existingStrategy.id}`);
      return;
    }
    setGeneratingStrategy(true);
    setStrategyBatch(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/api/content-strategies/generate/stream`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          roadmap_id: roadmap.id,
          industry: roadmap.industry,
          location: roadmap.location,
          stage: roadmap.stage,
          ...(activeProjectId ? { website_project_id: activeProjectId } : {}),
        }),
      });

      if (!res.ok || !res.body) {
        const fallback = await fetch(`${API_BASE}/api/content-strategies/generate`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            roadmap_id: roadmap.id,
            industry: roadmap.industry,
            location: roadmap.location,
            stage: roadmap.stage,
            ...(activeProjectId ? { website_project_id: activeProjectId } : {}),
          }),
        });
        if (!fallback.ok) throw new Error("Strategy generation failed");
        const result = await fallback.json() as { id: number };
        navigate(`/content-strategy/${result.id}`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let strategyId: number | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("event: progress")) continue;
          if (line.startsWith("event: done")) continue;
          if (line.startsWith("event: error")) throw new Error("Strategy generation failed");
          if (line.startsWith("data: ")) {
            const raw = line.slice(6);
            try {
              const parsed = JSON.parse(raw) as { batchNum?: number; totalBatches?: number; id?: number };
              if (parsed.batchNum !== undefined && parsed.totalBatches !== undefined) {
                setStrategyBatch({ current: parsed.batchNum, total: parsed.totalBatches });
              } else if (parsed.id !== undefined) {
                strategyId = parsed.id;
              }
            } catch { /* partial */ }
          }
        }
      }

      if (strategyId) {
        navigate(`/content-strategy/${strategyId}`);
      } else {
        throw new Error("Strategy generation completed without result");
      }
    } catch {
      setGeneratingStrategy(false);
      setStrategyBatch(null);
    } finally {
      setGeneratingStrategy(false);
      setStrategyBatch(null);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 md:px-8 py-12 max-w-4xl space-y-8">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="space-y-4 pt-8">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-5/6" />
          </div>
          <div className="grid gap-6 pt-8">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </Layout>
    );
  }

  if (isError || !roadmap) {
    return (
      <Layout>
        <div className="container mx-auto px-4 md:px-8 py-24 text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-4">Roadmap Not Found</h1>
          <p className="text-muted-foreground">The strategy document you are looking for does not exist or has been removed.</p>
        </div>
      </Layout>
    );
  }

  const handleGenerateSeo = async () => {
    if (!roadmap || !brandName || !websiteUrl) return;
    setSeoLoading(true);
    const body = JSON.stringify({
      brand_name: brandName,
      website_url: websiteUrl,
      industry: roadmap.industry,
      location: roadmap.location,
      stage: roadmap.stage,
      roadmap_id: roadmap.id,
      ...(activeProjectId ? { website_project_id: activeProjectId } : {}),
    });
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      let articleId: number | null = null;
      try {
        const res = await fetch(`${API_BASE}/api/seo-articles/generate/stream`, { method: "POST", headers, body });
        if (res.ok && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const line of lines) {
              if (line.startsWith("event: error")) throw new Error("SEO article generation failed");
              if (line.startsWith("data: ")) {
                try {
                  const parsed = JSON.parse(line.slice(6)) as { id?: number };
                  if (parsed.id !== undefined) articleId = parsed.id;
                } catch { /* partial */ }
              }
            }
          }
        }
      } catch {
        /* stream failed — fall back to non-streaming */
      }

      if (!articleId) {
        const fallback = await fetch(`${API_BASE}/api/seo-articles/generate`, { method: "POST", headers, body });
        if (!fallback.ok) throw new Error("SEO article generation failed");
        const article = await fallback.json() as { id: number };
        articleId = article.id;
      }

      if (articleId) navigate(`/seo-article/${articleId}`);
    } catch {
      setSeoLoading(false);
    }
  };

  const handlePinRoadmap = async () => {
    if (!roadmap || !activeProjectId || !token) return;
    setIsPinning(true);
    try {
      const method = isPinned ? "DELETE" : "POST";
      await fetch(`${API_BASE}/api/website-projects/${activeProjectId}/roadmaps/${roadmap.id}`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsPinned(!isPinned);
    } catch {
    } finally {
      setIsPinning(false);
    }
  };

  const formatStage = (stage: string) => {
    return stage.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  return (
    <Layout>
      <SEO
        title={`${roadmap.industry} Growth Roadmap for ${roadmap.location} Startups | goals.ac`}
        description={roadmap.content.executiveSummary.substring(0, 155) + "..."}
      />

      {/* Header with gradient orbs */}
      <div className="relative bg-mesh-dark text-zinc-50 py-16 md:py-24 border-b border-white/[0.06] overflow-hidden">
        <div className="orb orb-primary w-[500px] h-[400px] top-[-20%] left-[40%] -translate-x-1/2" />
        <div className="orb orb-violet w-[300px] h-[300px] bottom-[-10%] right-[5%]" />

        <div className="container relative z-10 mx-auto px-4 md:px-8 max-w-4xl">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30">
              {roadmap.industry}
            </Badge>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <Badge variant="outline">
              {roadmap.location}
            </Badge>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <Badge variant="outline">
              {formatStage(roadmap.stage)} Stage
            </Badge>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight text-gradient">
            12-Month Growth Strategy
          </h1>

          <div className="flex items-center gap-6 text-sm text-zinc-400">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span>{roadmap.viewCount.toLocaleString()} views</span>
            </div>
            <div>Generated {format(new Date(roadmap.createdAt), "MMMM d, yyyy")}</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 md:px-8 py-16 max-w-4xl">
        <section className="mb-16">
          <h2 className="text-2xl font-bold tracking-tight mb-6 border-b border-border/50 pb-4">Executive Summary</h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            {roadmap.content.executiveSummary}
          </p>
        </section>

        <div className="space-y-16">
          {roadmap.content.phases.map((phase, index) => (
            <section key={index} className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/40 via-blue-500/20 to-transparent hidden md:block" />

              <div className="md:pl-10">
                <div className="flex items-baseline gap-4 mb-6">
                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 font-mono text-xs px-2.5 py-1 rounded-md">
                    {phase.timeframe}
                  </Badge>
                  <h3 className="text-2xl font-bold tracking-tight">{phase.title}</h3>
                </div>

                <div className="grid gap-5">
                  <Card className="border-white/[0.07] glass-card-md shadow-none">
                    <CardHeader className="bg-blue-500/5 pb-4 rounded-t-xl">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-400" /> Core Objectives
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-5">
                      <ul className="space-y-3">
                        {phase.objectives.map((obj, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-blue-400/60 shrink-0 mt-0.5" />
                            <span className="leading-relaxed text-muted-foreground">{obj}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="border-white/[0.07] glass-card-md shadow-none">
                    <CardHeader className="bg-blue-500/5 pb-4 rounded-t-xl">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-400" /> Key Tactics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-5">
                      <ul className="space-y-3">
                        {phase.tactics.map((tactic, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-2" />
                            <span className="leading-relaxed text-muted-foreground">{tactic}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="border-white/[0.07] glass-card-md shadow-none">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BarChart className="w-5 h-5 text-blue-400" /> Success KPIs
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {phase.kpis.map((kpi, i) => (
                          <div key={i} className="glass-inner p-4 text-sm font-medium text-foreground">
                            {kpi}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Sticky CTA Bar */}
      <div className="sticky bottom-0 z-40 border-t border-white/[0.06] bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 py-4 shadow-sm">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl space-y-3">
          {showSeoForm && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pb-3 border-b">
              <Input
                placeholder="Brand name"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="flex-1"
                disabled={seoLoading}
              />
              <Input
                placeholder="Website URL"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="flex-1"
                disabled={seoLoading}
              />
              <Button onClick={handleGenerateSeo} disabled={seoLoading || !brandName || !websiteUrl} className="glow-primary bg-gradient-to-r from-blue-500 to-blue-600 border-0">
                {seoLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating…
                    {user?.hasGeminiKey && (
                      <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-white/15 px-1.5 py-0.5 text-xs font-medium">
                        <KeyRound className="w-3 h-3" />
                        Using your API key
                      </span>
                    )}
                  </>
                ) : "Generate"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowSeoForm(false)} disabled={seoLoading}>Cancel</Button>
            </div>
          )}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-semibold text-foreground">Ready to execute your strategy?</h4>
              <p className="text-sm text-muted-foreground">
                {user && projects.length === 0 ? (
                  <>
                    <Link to="/dashboard" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
                      Add a website project
                    </Link>{" "}
                    to save generated content and track results.
                  </>
                ) : user ? (
                  <>Generate content and audits — they'll be saved to your project.</>
                ) : (
                  <>Sign up to save your results and build a brand profile.</>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              {user && projects.length === 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-400/30 dark:text-blue-300 dark:hover:bg-blue-500/10"
                >
                  <Link to="/dashboard">
                    <Plus className="w-3.5 h-3.5" />
                    Add project
                  </Link>
                </Button>
              )}
              {user && projects.length > 0 && (
                <>
                  <Select
                    value={activeProjectId ? String(activeProjectId) : "__none__"}
                    onValueChange={(v) => { setActiveProjectId(v === "__none__" ? null : Number(v)); setIsPinned(false); }}
                  >
                    <SelectTrigger className="w-[180px] h-9 text-sm gap-1.5">
                      <FolderOpen className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                      <SelectValue placeholder="No project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No project</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {activeProjectId && (
                    <Button
                      variant={isPinned ? "secondary" : "outline"}
                      size="sm"
                      onClick={handlePinRoadmap}
                      disabled={isPinning}
                      className="gap-2"
                    >
                      {isPinning ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isPinned ? (
                        <BookmarkCheck className="w-4 h-4 text-blue-500" />
                      ) : (
                        <BookmarkPlus className="w-4 h-4" />
                      )}
                      {isPinned ? "Saved" : "Save roadmap"}
                    </Button>
                  )}
                </>
              )}
              {!showSeoForm && (
                <Button variant="outline" size="sm" onClick={() => setShowSeoForm(true)}>
                  <FileText className="w-4 h-4 mr-2" />
                  Generate SEO Article
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewContentStrategy}
                disabled={generatingStrategy}
                className="gap-2"
              >
                {generatingStrategy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {strategyBatch
                      ? `Batch ${strategyBatch.current}/${strategyBatch.total}…`
                      : "Generating…"}
                    {user?.hasGeminiKey && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-1.5 py-0.5 text-xs font-medium text-blue-300">
                        <KeyRound className="w-3 h-3" />
                        Using your API key
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    {existingStrategy ? "View Content Strategy" : "Generate Content Strategy"}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/geo-audit?roadmap_id=${roadmap.id}`)}
                className="gap-2"
              >
                <Zap className="w-4 h-4" />
                Run GEO Audit
              </Button>
              {!user && (
                <Button
                  size="sm"
                  asChild
                  className="glow-primary bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white"
                >
                  <a href="/signup">Sign up free</a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
