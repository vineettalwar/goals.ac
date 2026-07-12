import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Search, ShieldAlert, TrendingUp, AlertTriangle,
  FileText, Zap, Lightbulb, ChevronRight,
} from "lucide-react";
import {
  useListIndustries,
  useListLocations,
  useCreateCompetitorAnalysis,
  GenerateRoadmapRequestStage,
  type CompetitorAnalysisResponse,
} from "@workspace/api-client-react";
import { useAuth } from "@/context/auth";
import { useActiveProject } from "@/context/active-project";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const threatColors: Record<string, string> = {
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

  useEffect(() => {
    if (!activeProjectId || !token) {
      setSavedCompetitorUrls([]);
      return;
    }
    fetch(`${API_BASE}/api/website-projects/${activeProjectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data: { brandProfile?: { competitorUrls?: string[]; industry?: string } }) => {
        if (data.brandProfile?.competitorUrls?.length) {
          setSavedCompetitorUrls(data.brandProfile.competitorUrls);
        }
        if (data.brandProfile?.industry && !industry) {
          setIndustry(data.brandProfile.industry);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId, token]);

  const stages = [
    { value: GenerateRoadmapRequestStage["pre-seed"], label: "Pre-Seed" },
    { value: GenerateRoadmapRequestStage.seed, label: "Seed" },
    { value: GenerateRoadmapRequestStage["series-a"], label: "Series A" },
    { value: GenerateRoadmapRequestStage["series-b"], label: "Series B" },
    { value: GenerateRoadmapRequestStage.growth, label: "Growth / Late Stage" },
  ];

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
    <AppLayout>
      <SEO
        title="Competitor Analysis | goals.ac"
        description="Analyze your competitors and uncover content gaps, GEO weaknesses, and quick wins to outrank them."
      />

      <div className="relative bg-mesh-dark text-zinc-50 py-16 md:py-20 border-b border-white/[0.06] overflow-hidden">
        <div className="orb orb-primary w-[400px] h-[300px] top-[-10%] left-[30%] -translate-x-1/2" />
        <div className="container relative z-10 mx-auto px-4 md:px-8 max-w-3xl text-center">
          <motion.div {...fadeUp(0)}>
            <div className="inline-flex items-center rounded-full border border-blue-400/20 bg-blue-500/[0.08] px-3 py-1 text-xs font-semibold text-blue-300 mb-5">
              <Search className="w-3 h-3 mr-1.5" /> COMPETITOR INTELLIGENCE
            </div>
          </motion.div>
          <motion.h1 {...fadeUp(0.07)} className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Competitor Analysis
          </motion.h1>
          <motion.p {...fadeUp(0.13)} className="text-lg text-zinc-400 max-w-xl mx-auto">
            Enter a competitor's URL and get a tactical breakdown of their strengths, gaps, and where you can win.
          </motion.p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-12 max-w-3xl">
        <motion.div {...fadeUp(0.1)}>
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
        </motion.div>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
              className="mt-8 space-y-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{result.competitorName}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{result.summary}</p>
                </div>
                <Badge className={`capitalize ml-4 shrink-0 ${threatColors[result.threatLevel]}`}>
                  <ShieldAlert className="w-3 h-3 mr-1" />
                  {result.threatLevel} threat
                </Badge>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <Card className="shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="w-4 h-4" /> Their Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <ChevronRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500" />{s}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-red-600 dark:text-red-400">
                      <AlertTriangle className="w-4 h-4" /> Their Weaknesses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.weaknesses.map((w, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <ChevronRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />{w}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <FileText className="w-4 h-4" /> Content Gaps to Exploit
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.contentGaps.map((g, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <ChevronRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-500" />{g}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-purple-600 dark:text-purple-400">
                      <Zap className="w-4 h-4" /> GEO Visibility Gaps
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.geoGaps.map((g, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <ChevronRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-purple-500" />{g}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-none border-blue-200 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <Lightbulb className="w-4 h-4" /> 90-Day Quick Wins
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2.5">
                    {result.quickWins.map((w, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 dark:bg-blue-500 text-white text-[10px] font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-muted-foreground">{w}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
