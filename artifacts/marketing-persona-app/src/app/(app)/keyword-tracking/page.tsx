"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Search,
  TrendingUp,
  BarChart3,
  Lightbulb,
  Plus,
  Trash2,
  Target,
  AlertTriangle,
  ListPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useActiveProject } from "@/context/active-project";

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

interface TrackedKeyword {
  id: number;
  keyword: string;
  targetUrl: string | null;
  latestSnapshot: { position: number | null; checkedAt: string } | null;
}

interface KeywordOpportunity {
  id: number;
  keyword: string;
  opportunityScore: number;
  difficulty: string | null;
  suggestedTitle: string;
  status: string;
}

interface KeywordAlert {
  id: number;
  keyword: string;
  previousPosition: number | null;
  currentPosition: number | null;
  severity: string;
  message: string;
}

const DIFFICULTY_COLORS = {
  low: "success" as const,
  medium: "warning" as const,
  high: "destructive" as const,
};

export default function KeywordTrackingPage() {
  const { activeProjectId, activeProject } = useActiveProject();
  const projectId = activeProjectId != null ? String(activeProjectId) : "";
  const [keywordInput, setKeywordInput] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [tracked, setTracked] = useState<TrackedKeyword[]>([]);
  const [trackInput, setTrackInput] = useState("");
  const [selectedTrackedId, setSelectedTrackedId] = useState<number | null>(null);
  const [snapshots, setSnapshots] = useState<Array<{ checkedAt: string; position: number | null }>>([]);
  const [opportunities, setOpportunities] = useState<KeywordOpportunity[]>([]);
  const [alerts, setAlerts] = useState<KeywordAlert[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);

  useEffect(() => {
    if (activeProject?.url && !websiteUrl) {
      setWebsiteUrl(activeProject.url);
    }
  }, [activeProject?.url, websiteUrl]);

  const loadTracked = useCallback(async () => {
    if (!projectId) return;
    const res = await fetch(`/api/tracked-keywords?projectId=${projectId}`);
    if (res.ok) {
      const data = await res.json();
      setTracked(data.trackedKeywords ?? data.keywords ?? []);
    }
  }, [projectId]);

  const loadIntelligence = useCallback(async () => {
    if (!projectId) return;
    const [oppRes, alertRes] = await Promise.all([
      fetch(`/api/website-projects/${projectId}/keyword-opportunities?status=open`),
      fetch(`/api/website-projects/${projectId}/keyword-alerts`),
    ]);
    if (oppRes.ok) setOpportunities((await oppRes.json()).opportunities ?? []);
    if (alertRes.ok) setAlerts((await alertRes.json()).alerts ?? []);
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      loadTracked();
      loadIntelligence();
    }
  }, [projectId, loadTracked, loadIntelligence]);

  useEffect(() => {
    if (!selectedTrackedId) { setSnapshots([]); return; }
    fetch(`/api/tracked-keywords/${selectedTrackedId}/snapshots`)
      .then((r) => r.json())
      .then((d) => setSnapshots(d.snapshots ?? []))
      .catch(() => setSnapshots([]));
  }, [selectedTrackedId]);

  async function handleAnalyze() {
    const keywords = keywordInput.split(",").map((k) => k.trim()).filter(Boolean);
    if (keywords.length === 0) { toast.error("Enter at least one keyword"); return; }

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

  async function handleTrackKeyword() {
    if (!projectId || !trackInput.trim()) return;
    const res = await fetch("/api/tracked-keywords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ websiteProjectId: Number(projectId), keyword: trackInput.trim(), targetUrl: websiteUrl || undefined }),
    });
    if (!res.ok) { toast.error("Failed to track keyword"); return; }
    setTrackInput("");
    loadTracked();
    toast.success("Keyword tracked");
  }

  async function handleDeleteTracked(id: number) {
    await fetch(`/api/tracked-keywords?id=${id}`, { method: "DELETE" });
    loadTracked();
    if (selectedTrackedId === id) setSelectedTrackedId(null);
  }

  async function handleDiscoverGaps() {
    if (!projectId) return;
    setIsDiscovering(true);
    const res = await fetch(`/api/website-projects/${projectId}/keyword-opportunities`, { method: "POST" });
    setIsDiscovering(false);
    if (!res.ok) { toast.error("Discovery failed"); return; }
    toast.success("Opportunities discovered");
    loadIntelligence();
  }

  async function handleQueueOpportunity(id: number) {
    const res = await fetch(`/api/keyword-opportunities/${id}`, { method: "POST" });
    if (!res.ok) { toast.error("Failed to queue"); return; }
    toast.success("Queued to content strategy");
    loadIntelligence();
  }

  const chartData = [...snapshots].reverse().map((s) => ({
    date: new Date(s.checkedAt).toLocaleDateString(),
    position: s.position ?? 100,
  }));

  return (
    <div className="px-8 py-8 max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Keyword Tracking</h1>
        <p className="mt-1 text-sm text-muted-foreground">Analyze keywords, track SERP ranks, and discover content gaps</p>
      </div>

      {!projectId ? (
        <div className="paper-card p-6 rounded-xl text-sm text-muted-foreground">
          Choose a project in the sidebar to track keywords.
        </div>
      ) : (
        <>
          {activeProject && (
            <p className="text-sm text-muted-foreground">
              Project: <span className="font-medium text-foreground">{activeProject.name}</span>
            </p>
          )}

      {/* One-shot analysis */}
      <div className="paper-card p-6 rounded-xl space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Search className="h-4 w-4" /> Keyword analysis</h2>
        <div className="space-y-1.5">
          <Label>Keywords (comma-separated)</Label>
          <Input placeholder="B2B lead generation, SaaS marketing" value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Website URL (optional)</Label>
          <Input placeholder="https://yoursite.com" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
        </div>
        <Button onClick={handleAnalyze} disabled={loading}>
          {loading ? <><Spinner size="sm" /> Analyzing…</> : "Analyze keywords"}
        </Button>
      </div>

      {analysis && (
        <div className="space-y-4">
          <div className="paper-card rounded-xl p-5">
            <h2 className="font-semibold flex items-center gap-2 mb-2"><Lightbulb className="h-4 w-4 text-primary" /> Top opportunity</h2>
            <p className="text-sm text-muted-foreground">{analysis.topOpportunity}</p>
            <p className="text-sm mt-2">{analysis.summary}</p>
          </div>
          {analysis.keywords.map((kw, i) => (
            <div key={i} className="paper-card rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-semibold">{kw.keyword}</h3>
                <Badge variant={DIFFICULTY_COLORS[kw.difficulty]}>{kw.difficulty}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${kw.aiVisibility}%` }} />
                </div>
                <span className="text-xs font-medium">AI: {kw.aiVisibility}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rank tracking */}
      {projectId && (
        <div className="paper-card p-6 rounded-xl space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Rank tracking</h2>
          <div className="flex gap-2">
            <Input placeholder="Keyword to track" value={trackInput} onChange={(e) => setTrackInput(e.target.value)} />
            <Button onClick={handleTrackKeyword}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-2">
            {tracked.map((kw) => (
              <div key={kw.id} className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border">
                <button type="button" className="text-left flex-1" onClick={() => setSelectedTrackedId(kw.id)}>
                  <span className="font-medium">{kw.keyword}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {kw.latestSnapshot?.position != null ? `#${kw.latestSnapshot.position}` : "—"}
                  </span>
                </button>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteTracked(kw.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          {selectedTrackedId && chartData.length > 0 && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis reversed domain={[1, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="position" stroke="hsl(var(--primary))" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Opportunities & alerts */}
      {projectId && (
        <>
          <div className="paper-card p-6 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2"><Target className="h-4 w-4" /> Keyword gaps</h2>
              <Button variant="outline" size="sm" onClick={handleDiscoverGaps} disabled={isDiscovering}>
                {isDiscovering ? <Spinner size="sm" /> : <ListPlus className="h-4 w-4" />}
                Discover gaps
              </Button>
            </div>
            {opportunities.map((opp) => (
              <div key={opp.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border">
                <div>
                  <p className="font-medium">{opp.keyword}</p>
                  <p className="text-xs text-muted-foreground">{opp.suggestedTitle}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleQueueOpportunity(opp.id)}>Queue</Button>
              </div>
            ))}
            {opportunities.length === 0 && <p className="text-sm text-muted-foreground">No open opportunities. Run discovery to find gaps.</p>}
          </div>

          {alerts.length > 0 && (
            <div className="paper-card p-6 rounded-xl space-y-3">
              <h2 className="font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Rank alerts</h2>
              {alerts.map((a) => (
                <div key={a.id} className="text-sm p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <span className="font-medium">{a.keyword}</span>: {a.message}
                </div>
              ))}
            </div>
          )}
        </>
      )}
        </>
      )}

      <p className="text-sm text-muted-foreground">
        Also see <Link href="/ai-visibility" className="text-primary hover:underline">Visibility</Link> for LLM citation tracking.
      </p>
    </div>
  );
}
