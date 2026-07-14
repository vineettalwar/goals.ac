"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Map, TrendingUp, Zap, CircleCheck, CircleDashed, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useActiveProject } from "@/context/use-active-project";

interface SupportingTopic {
  title: string;
  keyword: string;
  searchVolume: string;
  difficulty: "low" | "medium" | "high";
  covered: boolean;
  searchIntent: string;
}

interface TopicalCluster {
  pillarTopic: string;
  pillarKeyword: string;
  searchVolume: string;
  difficulty: "low" | "medium" | "high";
  covered: boolean;
  supportingTopics: SupportingTopic[];
}

interface TopicalMap {
  topicalAuthority: number;
  clusters: TopicalCluster[];
  quickWinKeywords: string[];
  contentGaps: string[];
  recommendedNextArticle: string;
}

const DIFF_COLOR = {
  low: "success" as const,
  medium: "warning" as const,
  high: "destructive" as const,
};

function ScoreRing({ score }: { score: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e8e5e0" strokeWidth="8" />
      <circle
        cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text x="50" y="55" textAnchor="middle" className="rotate-90 origin-center"
        style={{ fontSize: 22, fontWeight: 700, fill: color, transform: "rotate(90deg)", transformOrigin: "50px 50px" }}>
        {score}
      </text>
    </svg>
  );
}

export function TopicalMapPanel({ embedded = false }: { embedded?: boolean }) {
  const { activeProjectId, activeProject, isLoading: projectLoading } = useActiveProject();
  const [map, setMap] = useState<TopicalMap | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedCluster, setExpandedCluster] = useState<number | null>(0);

  useEffect(() => {
    setMap(null);
    setExpandedCluster(0);
  }, [activeProjectId]);

  async function handleGenerate() {
    if (!activeProjectId) {
      toast.error("Select a project first");
      return;
    }
    setLoading(true);
    setMap(null);
    const res = await fetch("/api/topical-map", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ websiteProjectId: activeProjectId }),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error("Failed to generate topical map");
      return;
    }
    const data = await res.json();
    setMap(data.map);
  }

  const containerClass = embedded ? "space-y-6" : "px-8 py-8 max-w-5xl space-y-6";

  if (projectLoading && !activeProjectId) {
    return (
      <div className={containerClass}>
        <div className="flex items-center justify-center p-16">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {!embedded ? (
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">Topical Authority Map</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              See your keyword coverage, find gaps, and get a priority order for next articles
            </p>
          </div>
          {activeProjectId ? (
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? <><Spinner size="sm" /> Analyzing…</> : <><Map className="h-4 w-4" /> Generate map</>}
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {activeProject ? (
            <p className="text-sm text-muted-foreground">
              Project: <span className="font-medium text-foreground">{activeProject.name}</span>
            </p>
          ) : (
            <span />
          )}
          {activeProjectId ? (
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? <><Spinner size="sm" /> Analyzing…</> : <><Map className="h-4 w-4" /> Generate map</>}
            </Button>
          ) : null}
        </div>
      )}

      {!activeProjectId ? (
        <div className="paper-card rounded-xl flex flex-col items-center justify-center p-16 text-center">
          <Map className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium">No project selected</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Choose a project in the sidebar to analyze topical authority for its site.
          </p>
          <Link href="/projects">
            <Button variant="outline">Manage projects</Button>
          </Link>
        </div>
      ) : null}

      {activeProjectId && loading && (
        <div className="paper-card rounded-xl p-12 flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-muted-foreground">Analyzing your niche and building keyword clusters…</p>
        </div>
      )}

      {activeProjectId && map && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="paper-card rounded-xl p-5 flex items-center gap-5">
              <ScoreRing score={map.topicalAuthority} />
              <div>
                <p className="font-semibold">Topical Authority</p>
                <p className="text-sm text-muted-foreground mt-0.5">Current coverage score</p>
              </div>
            </div>

            <div className="paper-card rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-green-700">
                <Zap className="h-4 w-4" />
                <p className="font-semibold text-sm">Quick wins</p>
              </div>
              <ul className="space-y-1">
                {map.quickWinKeywords.slice(0, 4).map((kw) => (
                  <li key={kw} className="text-xs flex gap-1.5">
                    <span className="text-green-600">↗</span>{kw}
                  </li>
                ))}
              </ul>
            </div>

            <div className="paper-card rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <TrendingUp className="h-4 w-4" />
                <p className="font-semibold text-sm">Write next</p>
              </div>
              <p className="text-sm font-medium leading-snug">{map.recommendedNextArticle}</p>
            </div>
          </div>

          {map.contentGaps.length > 0 && (
            <div className="paper-card rounded-xl p-5">
              <h2 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">Top content gaps</h2>
              <div className="flex flex-wrap gap-2">
                {map.contentGaps.map((gap) => (
                  <div key={gap} className="flex items-center gap-1.5 bg-muted rounded-lg px-3 py-1.5 text-sm">
                    <CircleDashed className="h-3.5 w-3.5 text-muted-foreground" /> {gap}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {map.clusters.map((cluster, ci) => (
              <div key={ci} className="paper-card rounded-xl overflow-hidden">
                <button type="button"
                  className="w-full p-5 flex items-center gap-4 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedCluster(expandedCluster === ci ? null : ci)}
                >
                  {cluster.covered
                    ? <CircleCheck className="h-5 w-5 text-green-600 shrink-0" />
                    : <CircleDashed className="h-5 w-5 text-muted-foreground shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{cluster.pillarTopic}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{cluster.pillarKeyword} · {cluster.searchVolume}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={DIFF_COLOR[cluster.difficulty]}>{cluster.difficulty}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {cluster.supportingTopics.filter((t) => t.covered).length}/{cluster.supportingTopics.length} covered
                    </span>
                    {expandedCluster === ci
                      ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>

                {expandedCluster === ci && (
                  <div className="border-t border-border">
                    <div className="grid grid-cols-1 divide-y divide-border">
                      {cluster.supportingTopics.map((topic, ti) => (
                        <div key={ti} className="px-5 py-3 flex items-center gap-3">
                          {topic.covered
                            ? <CircleCheck className="h-4 w-4 text-green-500 shrink-0" />
                            : <CircleDashed className="h-4 w-4 text-muted-foreground shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{topic.title}</p>
                            <p className="text-xs text-muted-foreground">{topic.keyword} · {topic.searchVolume}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge variant="muted" className="text-xs">{topic.searchIntent}</Badge>
                            <Badge variant={DIFF_COLOR[topic.difficulty]} className="text-xs">{topic.difficulty}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeProjectId && !map && !loading && (
        <div className="paper-card rounded-xl flex flex-col items-center justify-center p-16 text-center">
          <Map className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium">No topical map yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Generate a map to see your keyword coverage and find content gaps
          </p>
          <Button onClick={handleGenerate}>
            <Map className="h-4 w-4" /> Generate topical map
          </Button>
        </div>
      )}
    </div>
  );
}
