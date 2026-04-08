import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SEO } from "@/components/seo";
import { Layout } from "@/components/layout";
import {
  useGetRoadmap,
  getGetRoadmapQueryKey,
  useListContentStrategies,
  useGenerateContentStrategy,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ChevronRight, Eye, Target, TrendingUp, BarChart, Loader2, FileText, Zap } from "lucide-react";
import { LeadCaptureModal } from "@/components/lead-capture-modal";
import { format } from "date-fns";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function RoadmapDetail() {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [generatingStrategy, setGeneratingStrategy] = useState(false);
  const [showSeoForm, setShowSeoForm] = useState(false);
  const [seoLoading, setSeoLoading] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  const { data: roadmap, isLoading, isError } = useGetRoadmap(slug, {
    query: {
      enabled: !!slug,
      queryKey: getGetRoadmapQueryKey(slug),
    },
  });

  const { data: allStrategies } = useListContentStrategies({
    query: { enabled: !!roadmap?.id },
  });

  const existingStrategy = allStrategies?.find(
    (s) => s.roadmapId === roadmap?.id
  );

  const generateStrategy = useGenerateContentStrategy();

  const handleViewContentStrategy = async () => {
    if (!roadmap) return;

    if (existingStrategy) {
      navigate(`/content-strategy/${existingStrategy.id}`);
      return;
    }

    setGeneratingStrategy(true);
    try {
      const result = await generateStrategy.mutateAsync({
        data: {
          roadmap_id: roadmap.id,
          industry: roadmap.industry,
          location: roadmap.location,
          stage: roadmap.stage,
        },
      });
      navigate(`/content-strategy/${result.id}`);
    } finally {
      setGeneratingStrategy(false);
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
    try {
      const res = await fetch(`${API_BASE}/api/seo-articles/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_name: brandName,
          website_url: websiteUrl,
          industry: roadmap.industry,
          location: roadmap.location,
          stage: roadmap.stage,
          roadmap_id: roadmap.id,
        }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const article = await res.json() as { id: number };
      navigate(`/seo-article/${article.id}`);
    } catch {
      setSeoLoading(false);
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

      {/* Header */}
      <div className="bg-zinc-950 text-zinc-50 py-16 md:py-24 border-b border-border">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Badge variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/30 border-primary/20">
              {roadmap.industry}
            </Badge>
            <ChevronRight className="w-4 h-4 text-zinc-600" />
            <Badge variant="outline" className="text-zinc-300 border-zinc-700">
              {roadmap.location}
            </Badge>
            <ChevronRight className="w-4 h-4 text-zinc-600" />
            <Badge variant="outline" className="text-zinc-300 border-zinc-700">
              {formatStage(roadmap.stage)} Stage
            </Badge>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
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
          <h2 className="text-2xl font-bold tracking-tight mb-6 border-b pb-4">Executive Summary</h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            {roadmap.content.executiveSummary}
          </p>
        </section>

        <div className="space-y-16">
          {roadmap.content.phases.map((phase, index) => (
            <section key={index} className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-px bg-border/60 hidden md:block" />

              <div className="md:pl-10">
                <div className="flex items-baseline gap-4 mb-6">
                  <Badge className="bg-primary text-primary-foreground font-mono text-xs px-2 py-1 rounded-md">
                    {phase.timeframe}
                  </Badge>
                  <h3 className="text-2xl font-bold tracking-tight">{phase.title}</h3>
                </div>

                <div className="grid gap-6">
                  <Card className="border-border/50 shadow-sm">
                    <CardHeader className="bg-muted/30 pb-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Target className="w-5 h-5 text-primary" /> Core Objectives
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <ul className="space-y-3">
                        {phase.objectives.map((obj, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{obj}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="border-border/50 shadow-sm">
                    <CardHeader className="bg-muted/30 pb-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" /> Key Tactics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <ul className="space-y-3">
                        {phase.tactics.map((tactic, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-2" />
                            <span className="leading-relaxed">{tactic}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="border-border/50 shadow-sm bg-zinc-50 dark:bg-zinc-900/50">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BarChart className="w-5 h-5 text-primary" /> Success KPIs
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {phase.kpis.map((kpi, i) => (
                          <div key={i} className="bg-background border border-border/50 p-4 rounded-lg font-medium text-sm">
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
      <div className="sticky bottom-0 z-40 border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 shadow-lg shadow-black/5">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl space-y-3">
          {showSeoForm && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pb-3 border-b border-border/40">
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
              <Button onClick={handleGenerateSeo} disabled={seoLoading || !brandName || !websiteUrl}>
                {seoLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</> : "Generate"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowSeoForm(false)} disabled={seoLoading}>Cancel</Button>
            </div>
          )}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-semibold text-foreground">Need help executing this?</h4>
              <p className="text-sm text-muted-foreground">Our team at Lead.sh can automate this entire outbound strategy.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
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
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                {generatingStrategy
                  ? "Generating…"
                  : existingStrategy
                  ? "View Content Strategy"
                  : "Generate Content Strategy"}
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
              <LeadCaptureModal roadmapSlug={roadmap.slug} />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
