import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { LazyMotion, domAnimation, m } from "framer-motion";
import {
  Loader2, Search,
} from "lucide-react";
import {
  useListIndustries,
  useListLocations,
  useCreateCompetitorAnalysis,
  GenerateRoadmapRequestStage,
  type CompetitorAnalysisResponse,
} from "@workspace/api-client-react";
import { useAuth } from "@/context/use-auth";
import { useActiveProject } from "@/context/use-active-project";
import { CompetitorAnalysisResults } from "./competitor-analysis-results";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay },
  };
}

const stages = [
  { value: GenerateRoadmapRequestStage["pre-seed"], label: "Pre-Seed" },
  { value: GenerateRoadmapRequestStage.seed, label: "Seed" },
  { value: GenerateRoadmapRequestStage["series-a"], label: "Series A" },
  { value: GenerateRoadmapRequestStage["series-b"], label: "Series B" },
  { value: GenerateRoadmapRequestStage.growth, label: "Growth / Late Stage" },
];

export default function CompetitorAnalysis() {
  const { user, token } = useAuth();
  const { activeProjectId } = useActiveProject();

  const [competitorUrl, setCompetitorUrl] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [stage, setStage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompetitorAnalysisResponse | null>(null);
  const [savedCompetitorUrls, setSavedCompetitorUrls] = useState<string[]>([]);

  const { data: industries } = useListIndustries();
  const { data: locations } = useListLocations();

  const analyzeMutation = useCreateCompetitorAnalysis({
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

  const { data: projectBrandData } = useQuery({
    queryKey: ["website-project-brand", activeProjectId, token],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/website-projects/${activeProjectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load project");
      return res.json() as Promise<{ brandProfile?: { competitorUrls?: string[]; industry?: string } }>;
    },
    enabled: Boolean(activeProjectId && token),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!projectBrandData?.brandProfile) return;
    if (projectBrandData.brandProfile.competitorUrls?.length) {
      setSavedCompetitorUrls(projectBrandData.brandProfile.competitorUrls);
    }
    if (projectBrandData.brandProfile.industry) {
      setIndustry((current) => current || projectBrandData.brandProfile!.industry!);
    }
  }, [projectBrandData]);

  const handleAnalyze = () => {
    if (!competitorUrl || !industry || !location || !stage) return;
    setError(null);
    setResult(null);
    analyzeMutation.mutate({
      data: {
        competitorUrl,
        industry,
        location,
        stage,
        website_project_id: user && activeProjectId ? activeProjectId : undefined,
      },
    });
  };

  return (
    <LazyMotion features={domAnimation} strict>
    <AppLayout>
      <SEO
        title="Competitor Analysis | goals.ac"
        description="Analyze your competitors and uncover content gaps, GEO weaknesses, and quick wins to outrank them."
      />

      <div className="relative bg-mesh-dark text-zinc-50 py-16 md:py-20 border-b border-white/6 overflow-hidden">
        <div className="orb orb-primary w-[400px] h-[300px] top-[-10%] left-[30%] -translate-x-1/2" />
        <div className="container relative z-10 mx-auto px-4 md:px-8 max-w-3xl text-center">
          <m.div {...fadeUp(0)}>
            <div className="inline-flex items-center rounded-full border border-blue-400/20 bg-blue-500/8 px-3 py-1 text-xs font-semibold text-blue-300 mb-5">
              <Search className="w-3 h-3 mr-1.5" /> COMPETITOR INTELLIGENCE
            </div>
          </m.div>
          <m.h1 {...fadeUp(0.07)} className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Competitor Analysis
          </m.h1>
          <m.p {...fadeUp(0.13)} className="text-lg text-zinc-400 max-w-xl mx-auto">
            Enter a competitor's URL and get a tactical breakdown of their strengths, gaps, and where you can win.
          </m.p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-12 max-w-3xl">
        <m.div {...fadeUp(0.1)}>
          <Card className="shadow-none">
            <CardContent className="pt-6 space-y-5">
              {savedCompetitorUrls.length > 0 && (
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Saved Competitors</Label>
                  <div className="flex flex-wrap gap-2">
                    {savedCompetitorUrls.map((url) => (
                      <Button
                        key={url}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setCompetitorUrl(url)}
                      >
                        {url.replace(/^https?:\/\//, "").split("/")[0]}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-sm font-semibold mb-1.5 block">Competitor URL</Label>
                <Input
                  placeholder="https://competitor.com"
                  value={competitorUrl}
                  onChange={(e) => setCompetitorUrl(e.target.value)}
                  disabled={analyzeMutation.isPending}
                />
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-semibold mb-1.5 block">Your Industry</Label>
                  <Select value={industry} onValueChange={setIndustry} disabled={analyzeMutation.isPending}>
                    <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                    <SelectContent>
                      {industries?.map((ind) => (
                        <SelectItem key={ind.slug} value={ind.slug}>{ind.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-semibold mb-1.5 block">Your Location</Label>
                  <Select value={location} onValueChange={setLocation} disabled={analyzeMutation.isPending}>
                    <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                    <SelectContent>
                      {locations?.map((loc) => (
                        <SelectItem key={loc.slug} value={loc.slug}>{loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-semibold mb-1.5 block">Your Stage</Label>
                  <Select value={stage} onValueChange={setStage} disabled={analyzeMutation.isPending}>
                    <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                    <SelectContent>
                      {stages.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                className="w-full glow-primary bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 border-0 text-white"
                onClick={handleAnalyze}
                disabled={analyzeMutation.isPending || !competitorUrl || !industry || !location || !stage}
              >
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing competitor…
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Run Analysis
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </m.div>

        {result ? <CompetitorAnalysisResults result={result} /> : null}
      </div>
    </AppLayout>
    </LazyMotion>
  );
}
