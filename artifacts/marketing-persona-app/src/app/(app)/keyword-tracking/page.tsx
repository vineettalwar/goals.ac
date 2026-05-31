"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Search, TrendingUp, BarChart3, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

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

const DIFFICULTY_COLORS = {
  low: "success" as const,
  medium: "warning" as const,
  high: "destructive" as const,
};

export default function KeywordTrackingPage() {
  const [keywordInput, setKeywordInput] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  async function handleAnalyze() {
    const keywords = keywordInput.split(",").map((k) => k.trim()).filter(Boolean);
    if (keywords.length === 0) { toast.error("Enter at least one keyword"); return; }
    if (keywords.length > 10) { toast.error("Maximum 10 keywords"); return; }

    setLoading(true);
    setAnalysis(null);
    const res = await fetch("/api/keyword-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords, websiteUrl: websiteUrl || undefined }),
    });
    setLoading(false);
    if (!res.ok) { toast.error("Analysis failed"); return; }
    setAnalysis(await res.json());
  }

  return (
    <div className="px-8 py-8 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Keyword Analysis</h1>
        <p className="mt-1 text-sm text-muted-foreground">Analyze SEO difficulty, volume estimates, and AI visibility scores</p>
      </div>

      <div className="paper-card p-6 rounded-xl space-y-4">
        <div className="space-y-1.5">
          <Label>Keywords (comma-separated, max 10)</Label>
          <Input
            placeholder="e.g. B2B lead generation, SaaS marketing automation, content strategy"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Your website URL (optional)</Label>
          <Input placeholder="https://yoursite.com" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
        </div>
        <Button onClick={handleAnalyze} disabled={loading}>
          {loading ? <><Spinner size="sm" /> Analyzing…</> : <><Search className="h-4 w-4" /> Analyze keywords</>}
        </Button>
      </div>

      {analysis && (
        <div className="space-y-4">
          <div className="paper-card rounded-xl p-5">
            <h2 className="font-semibold flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-primary" /> Top opportunity
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{analysis.topOpportunity}</p>
            <p className="text-sm leading-relaxed mt-2">{analysis.summary}</p>
          </div>

          <div className="space-y-3">
            {analysis.keywords.map((kw, i) => (
              <div key={i} className="paper-card rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-semibold">{kw.keyword}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{kw.estimatedVolume}</span>
                    <Badge variant={DIFFICULTY_COLORS[kw.difficulty]}>{kw.difficulty} difficulty</Badge>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${kw.aiVisibility}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium w-12 text-right">AI: {kw.aiVisibility}%</span>
                </div>

                {kw.suggestedContent && (
                  <div className="flex items-start gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">Suggested: <span className="text-foreground font-medium">{kw.suggestedContent}</span></span>
                  </div>
                )}

                {kw.opportunities.length > 0 && (
                  <ul className="space-y-1 ml-6">
                    {kw.opportunities.map((opp, j) => (
                      <li key={j} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-primary shrink-0">•</span>{opp}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
