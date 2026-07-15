"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  buildResearchActionPaths,
  flattenCompetitorAnalysis,
  flattenCompetitorAnalysisList,
  type CompetitorAnalysisResult,
  type CompetitorAnalysisRow,
  type CompetitorFormState,
  type RedditThread,
} from "@workspace/app-shell";
import { useActiveProject } from "@/context/use-active-project";
import { useBrandProfile } from "@/lib/queries";

export function useResearchActionPaths(projectId: string | number | null | undefined) {
  return useMemo(
    () =>
      buildResearchActionPaths({
        projectId,
        studioBase:
          projectId != null && projectId !== ""
            ? `/projects/${projectId}/content-studio`
            : "/studio",
      }),
    [projectId],
  );
}

export function useCompetitorAnalyses(projectId: string | number | null | undefined) {
  const [analyses, setAnalyses] = useState<CompetitorAnalysisRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!projectId) {
      setAnalyses([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/competitor-analysis?projectId=${projectId}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to load analyses");
      }
      setAnalyses(flattenCompetitorAnalysisList(data));
    } catch (err) {
      setAnalyses([]);
      setError(err instanceof Error ? err.message : "Failed to load analyses");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { analyses, loading, error, reload, setAnalyses };
}

export function useResearchCompetitorsController() {
  const { activeProjectId } = useActiveProject();
  const projectId = activeProjectId ?? null;
  const searchParams = useSearchParams();
  const industryParam = searchParams.get("industry")?.trim() ?? "";
  const analysisParam = searchParams.get("analysis");
  const initialAnalysisId = analysisParam ? Number(analysisParam) : null;

  const { data: brandProfile } = useBrandProfile(projectId != null ? String(projectId) : "");
  const { analyses, loading, error, reload, setAnalyses } = useCompetitorAnalyses(projectId);
  const paths = useResearchActionPaths(projectId);

  const [form, setForm] = useState<CompetitorFormState>({
    competitorUrl: "",
    industry: "",
    location: "",
    stage: "early",
  });
  const [formPrefillDone, setFormPrefillDone] = useState(false);
  const [formOpen, setFormOpen] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [result, setResult] = useState<(CompetitorAnalysisResult & { competitorUrl?: string; id?: number }) | null>(
    null,
  );
  const [resultLoading, setResultLoading] = useState(false);

  useEffect(() => {
    setResult(null);
    setSelectedId(null);
    setFormOpen(true);
    setFormPrefillDone(false);
  }, [projectId]);

  useEffect(() => {
    if (formPrefillDone) return;
    const industry =
      industryParam ||
      (typeof brandProfile?.industry === "string" ? brandProfile.industry : "") ||
      "";
    const location =
      (typeof brandProfile?.brandMemory === "object" &&
      brandProfile?.brandMemory &&
      typeof (brandProfile.brandMemory as { location?: unknown }).location === "string"
        ? (brandProfile.brandMemory as { location: string }).location
        : "") || "";

    setForm((prev) => ({
      ...prev,
      industry: prev.industry || industry,
      location: prev.location || location,
    }));
    if (brandProfile !== undefined || industryParam) {
      setFormPrefillDone(true);
    }
  }, [brandProfile, formPrefillDone, industryParam]);

  useEffect(() => {
    if (analyses.length === 0) {
      setFormOpen(true);
      return;
    }
    setFormOpen(false);
    if (selectedId != null) return;
    const preferred =
      initialAnalysisId && analyses.some((row) => row.id === initialAnalysisId)
        ? initialAnalysisId
        : analyses[0]!.id;
    setSelectedId(preferred);
  }, [analyses, initialAnalysisId, selectedId]);

  const loadAnalysis = useCallback(async (id: number) => {
    setSelectedId(id);
    setResultLoading(true);
    try {
      const res = await fetch(`/api/competitor-analyses/${id}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Failed to load analysis");
      const flat = flattenCompetitorAnalysis(data);
      setResult(flat);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load analysis");
      setResult(null);
    } finally {
      setResultLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId == null) return;
    void loadAnalysis(selectedId);
  }, [selectedId, loadAnalysis]);

  async function analyze() {
    if (!form.competitorUrl || !form.industry || !form.location) {
      toast.error("URL, industry, and location are required");
      return;
    }
    setAnalyzing(true);
    try {
      const res = await fetch("/api/competitor-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          websiteProjectId: projectId ?? undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Analysis failed");
      const flat = flattenCompetitorAnalysis(data);
      if (!flat) throw new Error("Invalid analysis response");
      setResult(flat);
      if (typeof flat.id === "number") {
        setSelectedId(flat.id);
        setAnalyses((prev) => {
          const row = {
            id: flat.id!,
            competitorUrl: flat.competitorUrl ?? form.competitorUrl,
            industry: flat.industry ?? form.industry,
            location: flat.location ?? form.location,
            stage: flat.stage ?? form.stage,
            createdAt: flat.createdAt,
            competitorName: flat.competitorName,
            summary: flat.summary,
            threatLevel: flat.threatLevel,
            strengths: flat.strengths,
            weaknesses: flat.weaknesses,
            contentGaps: flat.contentGaps,
            geoGaps: flat.geoGaps,
            quickWins: flat.quickWins,
          };
          return [row, ...prev.filter((item) => item.id !== row.id)];
        });
      } else {
        await reload();
      }
      setFormOpen(false);
      toast.success("Competitor analysis ready");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  return {
    projectId,
    analyses,
    loading,
    error,
    form,
    setForm,
    formOpen,
    setFormOpen,
    analyzing,
    analyze,
    result,
    resultLoading,
    selectedId,
    setSelectedId,
    paths,
  };
}

export function useResearchSignalsController() {
  const { activeProjectId } = useActiveProject();
  const projectId = activeProjectId ?? null;
  const paths = useResearchActionPaths(projectId);
  const [threads, setThreads] = useState<RedditThread[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setThreads([]);
    setError(null);
  }, [projectId]);

  async function discover() {
    if (!projectId) return;
    setDiscovering(true);
    setError(null);
    try {
      const res = await fetch("/api/reddit-discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Discovery failed");
      setThreads(data.threads ?? []);
    } catch (err) {
      setThreads([]);
      setError(err instanceof Error ? err.message : "Discovery failed");
      toast.error(err instanceof Error ? err.message : "Discovery failed");
    } finally {
      setDiscovering(false);
    }
  }

  return {
    projectId,
    threads,
    discovering,
    error,
    discover,
    paths,
  };
}
