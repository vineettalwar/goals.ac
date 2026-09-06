import type { ReactNode } from "react";
import { ArrowLeft, Calendar } from "lucide-react";
import {
  growthRoadmapsListPath,
  type GrowthRoadmap,
  type GrowthRoadmapLinkProps,
} from "./types";

type RoadmapPhase = {
  title: string;
  timeframe: string;
  objectives: string[];
  tactics: string[];
  kpis: string[];
};

type RoadmapContent = {
  executiveSummary?: string;
  phases?: RoadmapPhase[];
};

function parseRoadmapContent(content: unknown): RoadmapContent {
  if (!content || typeof content !== "object") return {};
  return content as RoadmapContent;
}

function RoadmapLink({
  renderLink,
  ...props
}: GrowthRoadmapLinkProps & { renderLink: (props: GrowthRoadmapLinkProps) => ReactNode }) {
  return <>{renderLink(props)}</>;
}

export function GrowthRoadmapView({
  roadmap,
  slug,
  error,
  loading,
  renderLink,
}: {
  roadmap: GrowthRoadmap | null;
  slug: string;
  error?: string | null;
  loading?: boolean;
  renderLink: (props: GrowthRoadmapLinkProps) => ReactNode;
}) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading roadmap…</p>;
  }

  const title = roadmap
    ? `${roadmap.industry} · ${roadmap.location}`
    : slug.replace(/-/g, " ");

  return (
    <div className="w-full">

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        {roadmap ? (
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-medium capitalize">
              {roadmap.industry}
            </span>
            <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-medium">
              {roadmap.location}
            </span>
            <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-medium capitalize">
              {roadmap.stage}
            </span>
          </div>
        ) : null}
      </header>

      {!roadmap && !error ? (
        <p className="text-sm text-muted-foreground">Roadmap not found.</p>
      ) : null}

      {roadmap ? (
        <div className="space-y-4">
          {(() => {
            const parsed = parseRoadmapContent(roadmap.content);
            if (parsed.executiveSummary) {
              return (
                <div className="paper-card p-5">
                  <h2 className="text-sm font-semibold">Executive summary</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{parsed.executiveSummary}</p>
                </div>
              );
            }
            return null;
          })()}
          {(parseRoadmapContent(roadmap.content).phases ?? []).map((phase, index) => (
            <div key={`${phase.title}-${index}`} className="paper-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="text-lg font-semibold">{phase.title}</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                  <Calendar className="h-3 w-3" />
                  {phase.timeframe}
                </span>
              </div>
              {phase.objectives.length > 0 ? (
                <div className="mt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Objectives</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                    {phase.objectives.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {phase.tactics.length > 0 ? (
                <div className="mt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tactics</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {phase.tactics.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {phase.kpis.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {phase.kpis.map((kpi) => (
                    <span key={kpi} className="rounded-full border border-border px-2 py-1 text-xs">
                      {kpi}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          {(parseRoadmapContent(roadmap.content).phases ?? []).length === 0 ? (
            <details className="paper-card">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Raw roadmap data</summary>
              <pre className="overflow-auto border-t border-border p-4 text-xs">
                {JSON.stringify(roadmap.content ?? roadmap, null, 2)}
              </pre>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
