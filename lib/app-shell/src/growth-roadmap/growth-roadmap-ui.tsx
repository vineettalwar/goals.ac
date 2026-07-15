import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import {
  growthRoadmapsListPath,
  type GrowthRoadmap,
  type GrowthRoadmapLinkProps,
} from "./types";

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
    <div className="max-w-4xl">
      <RoadmapLink
        renderLink={renderLink}
        href={growthRoadmapsListPath()}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Roadmaps
      </RoadmapLink>

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
        <details className="paper-card" open={roadmap.content == null}>
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
            Roadmap content
          </summary>
          <pre className="overflow-auto border-t border-border p-4 text-xs">
            {JSON.stringify(roadmap.content ?? roadmap, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
