"use client";

import Link from "next/link";
import { ResearchOverviewView } from "@workspace/app-shell/research";
import { useActiveProject } from "@/context/use-active-project";
import { useCompetitorAnalyses, useResearchActionPaths } from "./use-research-data";

export function ResearchOverviewClient() {
  const { activeProjectId } = useActiveProject();
  const { analyses, loading, error } = useCompetitorAnalyses(activeProjectId);
  const paths = useResearchActionPaths(activeProjectId);

  return (
    <ResearchOverviewView
      analyses={analyses}
      loading={loading}
      error={error}
      paths={paths}
      renderLink={({ href, className, children }) => (
        <Link href={href} className={className}>
          {children}
        </Link>
      )}
    />
  );
}
