"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ResearchOverviewView, countKeywordSignals } from "@workspace/app-shell/research";
import { useActiveProject } from "@/context/use-active-project";
import { useBrandProfile, useKeywordIntelligence, useSemrushStatus } from "@/lib/queries";
import {
  useCompetitorAnalyses,
  useResearchActionPaths,
  useSessionSignalThreads,
} from "./use-research-data";

export function ResearchOverviewClient() {
  const { activeProjectId } = useActiveProject();
  const projectId = activeProjectId != null ? String(activeProjectId) : "";
  const { analyses, loading, error } = useCompetitorAnalyses(activeProjectId);
  const paths = useResearchActionPaths(activeProjectId);
  const signalThreads = useSessionSignalThreads(activeProjectId);
  const { opportunities, refetch } = useKeywordIntelligence(projectId);
  const { data: semrushStatus } = useSemrushStatus(projectId);
  const { data: brandProfile } = useBrandProfile(projectId);
  const keywordSignals = useMemo(() => countKeywordSignals(opportunities), [opportunities]);
  const brandFit = useMemo(
    () =>
      brandProfile
        ? {
            primaryKeywords: Array.isArray(brandProfile.primaryKeywords)
              ? brandProfile.primaryKeywords
              : [],
            industry: typeof brandProfile.industry === "string" ? brandProfile.industry : null,
            companyName:
              typeof brandProfile.companyName === "string" ? brandProfile.companyName : null,
            targetAudience:
              typeof brandProfile.targetAudience === "string" ? brandProfile.targetAudience : null,
          }
        : null,
    [brandProfile],
  );
  const [discoveringIdeas, setDiscoveringIdeas] = useState(false);

  async function discoverIdeas() {
    if (!projectId || discoveringIdeas) return;
    setDiscoveringIdeas(true);
    try {
      const res = await fetch(`/api/website-projects/${projectId}/keyword-opportunities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "all" }),
      });
      const data = (await res.json().catch(() => ({}))) as { inserted?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Discovery failed");
      toast.success(
        data.inserted && data.inserted > 0
          ? `Added ${data.inserted} article idea${data.inserted === 1 ? "" : "s"}`
          : "No new ideas — existing opportunities are up to date",
      );
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Discovery failed");
    } finally {
      setDiscoveringIdeas(false);
    }
  }

  return (
    <ResearchOverviewView
      analyses={analyses}
      loading={loading}
      error={error}
      signalThreads={signalThreads}
      keywordSignals={keywordSignals}
      opportunities={opportunities}
      brandFit={brandFit}
      discoveringIdeas={discoveringIdeas}
      onDiscoverIdeas={projectId ? discoverIdeas : undefined}
      semrushConfigured={
        projectId && semrushStatus != null ? Boolean(semrushStatus.configured) : null
      }
      paths={paths}
      renderLink={({ href, className, children }) => (
        <Link href={href} className={className}>
          {children}
        </Link>
      )}
    />
  );
}
