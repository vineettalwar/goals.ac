import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ResearchCompetitorsView,
  ResearchOverviewView,
  ResearchSignalsView,
  buildResearchActionPaths,
  countKeywordSignals,
  flattenCompetitorAnalysis,
  loadSessionSignalThreads,
  saveSessionSignalThreads,
  type CompetitorAnalysisResult,
  type RedditThread,
} from "@workspace/app-shell";
import { SectionShell } from "@/components/SectionShell";
import { useActiveProject } from "@/hooks/use-active-project";
import {
  useCompetitorAnalyses,
  useKeywordIntelligence,
  useSemrushStatus,
} from "@/hooks/use-section-queries";
import { apiFetch } from "@/lib/api";
import { renderLink, researchTabs } from "@/pages/section-page-shared";

export function ResearchHubPage() {
  const { projectId } = useActiveProject();
  const { analyses, loading, error } = useCompetitorAnalyses(projectId);
  const { opportunities, refetch } = useKeywordIntelligence(projectId);
  const { status: semrushStatus } = useSemrushStatus(projectId);
  const brandQuery = useQuery({
    queryKey: ["research-brand-fit", projectId],
    queryFn: () =>
      apiFetch<{
        primaryKeywords?: string[];
        industry?: string;
        companyName?: string;
        targetAudience?: string;
      }>(`/api/website-projects/${projectId}/brand-profile`),
    enabled: Boolean(projectId),
    staleTime: 60_000,
  });
  const [signalThreads, setSignalThreads] = useState<RedditThread[]>([]);
  const [discoveringIdeas, setDiscoveringIdeas] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const keywordSignals = useMemo(() => countKeywordSignals(opportunities), [opportunities]);
  const brandFit = useMemo(() => {
    const b = brandQuery.data;
    if (!b) return null;
    return {
      primaryKeywords: b.primaryKeywords ?? [],
      industry: b.industry ?? null,
      companyName: b.companyName ?? null,
      targetAudience: b.targetAudience ?? null,
    };
  }, [brandQuery.data]);
  const paths = useMemo(
    () =>
      buildResearchActionPaths({
        projectId,
        studioBase: projectId ? `/projects/${projectId}/content-studio` : "/projects",
      }),
    [projectId],
  );

  useEffect(() => {
    setSignalThreads(loadSessionSignalThreads(projectId));
  }, [projectId]);

  async function discoverIdeas() {
    if (!projectId || discoveringIdeas) return;
    setDiscoveringIdeas(true);
    setDiscoverError(null);
    try {
      await apiFetch(`/api/website-projects/${projectId}/keyword-opportunities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "all" }),
      });
      await refetch();
    } catch (err) {
      setDiscoverError(err instanceof Error ? err.message : "Discovery failed");
    } finally {
      setDiscoveringIdeas(false);
    }
  }

  return (
    <SectionShell
      title="Research"
      description="Competitive landscape and demand signals for this project"
      tabs={researchTabs}
    >
      <ResearchOverviewView
        analyses={analyses}
        loading={loading}
        error={error ?? discoverError}
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
        renderLink={renderLink}
      />
    </SectionShell>
  );
}

export function ResearchCompetitorsPage() {
  const { projectId } = useActiveProject();
  return (
    <SectionShell
      title="Competitor research"
      description="Competitive intelligence from SERP and site signals."
      tabs={researchTabs}
    >
      <ResearchCompetitorsBody key={projectId ?? "none"} projectId={projectId} />
    </SectionShell>
  );
}

function ResearchCompetitorsBody({ projectId }: { projectId: string | null }) {
  const [searchParams] = useSearchParams();
  const industryParam = searchParams.get("industry")?.trim() ?? "";
  const analysisParam = searchParams.get("analysis");
  const initialAnalysisId = analysisParam ? Number(analysisParam) : null;
  const { analyses, loading, error, reload } = useCompetitorAnalyses(projectId);
  const { status: semrushStatus } = useSemrushStatus(projectId);
  const paths = useMemo(
    () =>
      buildResearchActionPaths({
        projectId,
        studioBase: projectId ? `/projects/${projectId}/content-studio` : "/projects",
      }),
    [projectId],
  );

  const { data: brandProfile } = useQuery({
    queryKey: ["brand-profile-industry", projectId],
    queryFn: () =>
      apiFetch<{ industry?: string } | null>(`/api/website-projects/${projectId}/brand-profile`),
    enabled: Boolean(projectId),
    staleTime: 60_000,
  });

  const [form, setForm] = useState({
    competitorUrl: "",
    industry: "",
    location: "",
    stage: "early",
  });
  const [formOpenOverride, setFormOpenOverride] = useState<boolean | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const preferredSelectedId = useMemo(() => {
    if (analyses.length === 0) return null;
    if (initialAnalysisId && analyses.some((row) => row.id === initialAnalysisId)) {
      return initialAnalysisId;
    }
    return analyses[0]?.id ?? null;
  }, [analyses, initialAnalysisId]);

  const activeSelectedId = selectedId ?? preferredSelectedId;
  const formOpen = formOpenOverride ?? analyses.length === 0;
  const formWithDefaults = {
    ...form,
    industry: form.industry || industryParam || brandProfile?.industry || "",
  };

  const detailQuery = useQuery({
    queryKey: ["competitor-analysis-detail", activeSelectedId],
    queryFn: async () => {
      const data = await apiFetch(`/api/competitor-analyses/${activeSelectedId}`);
      return flattenCompetitorAnalysis(data) as CompetitorAnalysisResult & {
        competitorUrl?: string;
        id?: number;
      };
    },
    enabled: activeSelectedId != null,
  });

  async function analyze() {
    if (!formWithDefaults.competitorUrl || !formWithDefaults.industry || !formWithDefaults.location) {
      return;
    }
    setAnalyzing(true);
    try {
      const data = await apiFetch("/api/competitor-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formWithDefaults,
          websiteProjectId: projectId ? Number(projectId) : undefined,
        }),
      });
      const flat = flattenCompetitorAnalysis(data) as CompetitorAnalysisResult & {
        competitorUrl?: string;
        id?: number;
      };
      if (flat?.id != null) setSelectedId(flat.id);
      setFormOpenOverride(false);
      await reload();
      await detailQuery.refetch();
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <ResearchCompetitorsView
      analyses={analyses}
      loading={loading}
      error={error}
      form={formWithDefaults}
      onFormChange={setForm}
      onAnalyze={() => void analyze()}
      analyzing={analyzing}
      result={detailQuery.data ?? null}
      resultLoading={detailQuery.isFetching}
      selectedId={activeSelectedId}
      onSelect={setSelectedId}
      formOpen={formOpen}
      onFormOpenChange={(open) => setFormOpenOverride(open)}
      semrushConfigured={
        projectId && semrushStatus != null ? Boolean(semrushStatus.configured) : null
      }
      paths={paths}
      renderLink={renderLink}
    />
  );
}

export function ResearchRedditPage() {
  const { projectId } = useActiveProject();
  const [threads, setThreads] = useState<RedditThread[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const paths = useMemo(
    () =>
      buildResearchActionPaths({
        projectId,
        studioBase: projectId ? `/projects/${projectId}/content-studio` : "/projects",
      }),
    [projectId],
  );

  useEffect(() => {
    setThreads(loadSessionSignalThreads(projectId));
    setError(null);
  }, [projectId]);

  async function discover() {
    if (!projectId) return;
    setDiscovering(true);
    setError(null);
    try {
      const data = await apiFetch<{ threads?: RedditThread[]; error?: string }>(
        "/api/reddit-discovery",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: Number(projectId) }),
        },
      );
      const next = data.threads ?? [];
      setThreads(next);
      saveSessionSignalThreads(projectId, next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discovery failed");
      setThreads([]);
    } finally {
      setDiscovering(false);
    }
  }

  return (
    <SectionShell
      title="Reddit signals"
      description="Real Reddit threads plus AI draft replies — you post manually."
      tabs={researchTabs}
    >
      <ResearchSignalsView
        projectId={projectId}
        threads={threads}
        discovering={discovering}
        error={error}
        onDiscover={() => void discover()}
        paths={paths}
        renderLink={renderLink}
      />
    </SectionShell>
  );
}
