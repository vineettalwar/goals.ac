import { useState } from "react";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Plus, X, Loader2, BarChart3, Globe, Zap, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/auth";
import { useActiveProject } from "@/context/active-project";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface KeywordResult {
  keyword: string;
  estimatedVolume: string;
  difficulty: "low" | "medium" | "high";
  aiVisibility: number;
  opportunities: string[];
  suggestedContent: string;
}

interface TrackingAnalysis {
  keywords: KeywordResult[];
  topOpportunity: string;
  summary: string;
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
  const { user } = useAuth();
  const { activeProjectId, projects } = useActiveProject();
  const [keywords, setKeywords] = useState<string[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackingAnalysis | null>(null);

  const activeProject = projects.find((p) => p.id === activeProjectId);

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
    if (e.key === "Enter") { e.preventDefault(); addKeyword(); }
  };

  const handleAnalyze = async () => {
    if (keywords.length === 0) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/keyword-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords, websiteUrl: websiteUrl || undefined }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Analysis failed");
      }
      const data = await res.json() as TrackingAnalysis;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <SEO
        title="Keyword Rank Tracking | goals.ac"
        description="Track your target keywords, understand AI search visibility, and find opportunities to outrank competitors."
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
            Add your target keywords and get an AI-powered analysis of search volume, difficulty, and GEO visibility opportunities.
          </motion.p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-12 max-w-3xl">
        {!user && (
          <motion.div {...fadeUp(0)} className="mb-6 rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 px-4 py-3 flex items-center gap-3">
            <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <Link to="/signup" className="font-semibold underline underline-offset-2">Sign up free</Link> to save keyword tracking to your project and get alerts.
            </p>
          </motion.div>
        )}

        {user && activeProject && (
          <motion.div {...fadeUp(0)} className="mb-6 rounded-xl border border-border bg-muted/40 px-4 py-3 flex items-center gap-3">
            <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">
              Tracking for <span className="font-semibold text-foreground">{activeProject.name}</span>
            </p>
          </motion.div>
        )}

        <motion.div {...fadeUp(0.1)}>
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Add Keywords to Track</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. B2B SaaS growth strategy"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={handleKey}
                  disabled={loading || keywords.length >= 10}
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
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground mt-1">Helps personalize recommendations</p>
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                className="w-full glow-primary bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 border-0 text-white"
                onClick={handleAnalyze}
                disabled={loading || keywords.length === 0}
              >
                {loading ? (
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
              className="mt-8 space-y-5"
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
                        <div className="flex gap-2 shrink-0">
                          <Badge className={`text-xs capitalize ${difficultyColors[kw.difficulty]}`}>
                            {kw.difficulty} difficulty
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            AI visibility: {kw.aiVisibility}%
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Opportunities</p>
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
    </Layout>
  );
}
