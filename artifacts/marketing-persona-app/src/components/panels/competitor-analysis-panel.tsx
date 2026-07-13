"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Search, AlertTriangle, TrendingUp, Target, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useActiveProject } from "@/context/active-project";

interface Analysis {
  competitorName: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  contentGaps: string[];
  geoGaps: string[];
  quickWins: string[];
  threatLevel: "low" | "medium" | "high";
}

const THREAT_COLORS = {
  low: "success" as const,
  medium: "warning" as const,
  high: "destructive" as const,
};

export function CompetitorAnalysisPanel({ embedded = false }: { embedded?: boolean }) {
  const { activeProjectId } = useActiveProject();
  const [form, setForm] = useState({ competitorUrl: "", industry: "", location: "", stage: "early" });
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  useEffect(() => {
    setAnalysis(null);
  }, [activeProjectId]);

  async function handleAnalyze() {
    if (!form.competitorUrl || !form.industry || !form.location) {
      toast.error("All fields are required");
      return;
    }
    setLoading(true);
    setAnalysis(null);
    const res = await fetch("/api/competitor-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        websiteProjectId: activeProjectId ?? undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) { toast.error("Analysis failed"); return; }
    setAnalysis(await res.json());
  }

  return (
    <div className={embedded ? "space-y-6" : "px-8 py-8 max-w-3xl space-y-6"}>
      {!embedded ? (
        <div>
          <h1 className="text-2xl font-bold">Competitor Analysis</h1>
          <p className="mt-1 text-sm text-muted-foreground">AI-powered competitive intelligence with GEO gap identification</p>
        </div>
      ) : null}

      <div className="paper-card p-6 rounded-xl space-y-4">
        <div className="space-y-1.5">
          <Label>Competitor URL</Label>
          <Input placeholder="https://competitor.com" value={form.competitorUrl} onChange={(e) => setForm((p) => ({ ...p, competitorUrl: e.target.value }))} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Your industry</Label>
            <Input placeholder="e.g. B2B SaaS" value={form.industry} onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Input placeholder="e.g. UK" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Stage</Label>
            <select
              className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm"
              value={form.stage}
              onChange={(e) => setForm((p) => ({ ...p, stage: e.target.value }))}
            >
              {["early", "growth", "scale"].map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <Button onClick={handleAnalyze} disabled={loading} className="w-full sm:w-auto">
          {loading ? <><Spinner size="sm" /> Analyzing…</> : <><Search className="h-4 w-4" /> Analyze competitor</>}
        </Button>
      </div>

      {analysis && (
        <div className="space-y-4">
          <div className="paper-card rounded-xl p-5 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">{analysis.competitorName}</h2>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{analysis.summary}</p>
            </div>
            <Badge variant={THREAT_COLORS[analysis.threatLevel]}>
              {analysis.threatLevel} threat
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Section title="Strengths" icon={<Shield className="h-4 w-4" />} items={analysis.strengths} color="text-green-700" />
            <Section title="Weaknesses" icon={<AlertTriangle className="h-4 w-4" />} items={analysis.weaknesses} color="text-amber-700" />
            <Section title="Content gaps" icon={<Target className="h-4 w-4" />} items={analysis.contentGaps} color="text-blue-700" />
            <Section title="GEO / AI gaps" icon={<TrendingUp className="h-4 w-4" />} items={analysis.geoGaps} color="text-purple-700" />
          </div>

          <div className="paper-card rounded-xl p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-primary" /> Quick wins (90 days)
            </h3>
            <ul className="space-y-2">
              {analysis.quickWins.map((win, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                  {win}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, icon, items, color }: { title: string; icon: React.ReactNode; items: string[]; color: string }) {
  return (
    <div className="paper-card rounded-xl p-5">
      <h3 className={`font-semibold flex items-center gap-2 mb-3 ${color}`}>
        {icon} {title}
      </h3>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm flex gap-2">
            <span className="text-muted-foreground shrink-0">•</span>{item}
          </li>
        ))}
      </ul>
    </div>
  );
}
