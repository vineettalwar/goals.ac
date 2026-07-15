import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  isSiteAdmin,
  isSuperAdmin,
  type KeywordAnalysisResult,
  type KeywordSourceFilter,
} from "@workspace/app-shell";
import { useAuth } from "@/context/auth";
import { useActiveProject } from "@/hooks/use-active-project";
import {
  useArticleIdeasImports,
  useArticleIdeaSources,
  useGscQueries,
  useGscSyncStatus,
  useKeywordIntelligence,
  useKeywordSnapshots,
  useSemrushStatus,
  useTrackedKeywords,
} from "@/hooks/use-section-queries";
import { apiFetch, getApiBase, getAppOrigin } from "@/lib/api";
import { queryKeys } from "@/lib/queries/keys";

function sheetsReturnUrl() {
  return `${getAppOrigin()}/search/keywords?tab=import`;
}

export function useSearchKeywordsPage() {

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, orgRole } = useAuth();
  const { projectId, activeProject } = useActiveProject();
  const canImport = isSuperAdmin(user?.role) || isSiteAdmin(orgRole);
  const { keywords, loading: trackedLoading, refetch: refetchTracked } = useTrackedKeywords(projectId);
  const {
    opportunities,
    alerts,
    isLoading: intelligenceLoading,
    refetch: refetchIntelligence,
  } = useKeywordIntelligence(projectId);
  const { gscStatus, isFetching: gscFetching } = useGscSyncStatus(projectId);
  const { status: semrushStatus, isFetching: semrushFetching } = useSemrushStatus(projectId);
  const { queries: gscQueries } = useGscQueries(projectId, Boolean(gscStatus?.connected));

  const [activeTab, setActiveTab] = useState<"ideas" | "import" | "tracking" | "analyzer">("ideas");
  const [sourceFilter, setSourceFilter] = useState<KeywordSourceFilter>("all");
  const [trackInput, setTrackInput] = useState("");
  const [selectedTrackedId, setSelectedTrackedId] = useState<number | null>(null);
  const [keywordInput, setKeywordInput] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState(activeProject?.url ?? "");
  const [analysis, setAnalysis] = useState<KeywordAnalysisResult | null>(null);
  const [manualKeyword, setManualKeyword] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualAngle, setManualAngle] = useState("");
  const [discovering, setDiscovering] = useState<string | null>(null);
  const [syncingGsc, setSyncingGsc] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [queueingId, setQueueingId] = useState<number | null>(null);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [dismissingId, setDismissingId] = useState<number | null>(null);
  const [manualImporting, setManualImporting] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sheetLabel, setSheetLabel] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [creatingSheetSource, setCreatingSheetSource] = useState(false);
  const [syncingSheetId, setSyncingSheetId] = useState<number | null>(null);
  const [sheetsStatusMessage, setSheetsStatusMessage] = useState<string | null>(null);

  const { snapshots: trackedSnapshots } = useKeywordSnapshots(selectedTrackedId);
  const { imports: importHistory, loading: importLoading, refetch: refetchImports } =
    useArticleIdeasImports(projectId);
  const {
    sources: sheetSources,
    loading: sheetSourcesLoading,
    refetch: refetchSheetSources,
  } = useArticleIdeaSources(projectId);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "import" || tab === "tracking" || tab === "analyzer" || tab === "ideas") {
      setActiveTab(tab);
    }
    const source = searchParams.get("source");
    if (
      source === "all" ||
      source === "semrush" ||
      source === "gsc_query" ||
      source === "csv_import" ||
      source === "google_sheets" ||
      source === "manual" ||
      source === "imports" ||
      source === "ai_analysis" ||
      source === "competitor_gap" ||
      source === "rank_drop"
    ) {
      setSourceFilter(source);
    }
    const keyword = searchParams.get("keyword")?.trim();
    if (keyword) {
      setKeywordInput(keyword);
      setTrackInput(keyword);
      if (!tab) setActiveTab("analyzer");
    }
    const sheets = searchParams.get("sheets");
    if (sheets === "connected") {
      setSheetsStatusMessage("Google Sheets connected.");
      void refetchSheetSources();
      void refetchImports();
      void refetchIntelligence();
    } else if (sheets === "error") {
      setSheetsStatusMessage("Google Sheets connection failed.");
    } else if (sheets === "forbidden") {
      setSheetsStatusMessage("Only site admins can connect Google Sheets for this project.");
    }
  }, [searchParams, refetchSheetSources, refetchImports, refetchIntelligence]);

  useEffect(() => {
    if (activeProject?.url) setWebsiteUrl(activeProject.url);
    setAnalysis(null);
    setSelectedTrackedId(null);
    setKeywordInput("");
    setTrackInput("");
  }, [projectId, activeProject?.url]);

  const showInitialLoad =
    Boolean(projectId) && trackedLoading && intelligenceLoading && keywords.length === 0;

  async function invalidateKeywordQueries() {
    if (!projectId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.keywordOpportunities(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.keywordAlerts(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.gscSyncStatus(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.semrushStatus(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.gscQueries(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.articleIdeas(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.articleIdeaSources(projectId) }),
    ]);
  }


  function sheetsConnectUrl(sourceId: number) {
    const params = new URLSearchParams({
      projectId: String(projectId),
      sourceId: String(sourceId),
      returnUrl: sheetsReturnUrl(),
    });
    return `${getApiBase()}/api/auth/google-sheets?${params}`;
  }

  async function handleGscSync() {
    if (!projectId) return;
    setSyncingGsc(true);
    setActionError(null);
    try {
      await apiFetch(`/api/website-projects/${projectId}/search-properties/gsc/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      await invalidateKeywordQueries();
      await refetchIntelligence();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "GSC sync failed");
    } finally {
      setSyncingGsc(false);
    }
  }

  async function handleDiscover(source: "semrush" | "gsc" | "ai", refresh = false) {
    if (!projectId) return;
    setDiscovering(source);
    setActionError(null);
    try {
      await apiFetch(`/api/website-projects/${projectId}/keyword-opportunities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, refresh }),
      });
      await invalidateKeywordQueries();
      await refetchIntelligence();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Discovery failed");
    } finally {
      setDiscovering(null);
    }
  }

  async function handleQueueOpportunity(id: number) {
    setQueueingId(id);
    setActionError(null);
    try {
      await apiFetch(`/api/keyword-opportunities/${id}`, { method: "POST" });
      await refetchIntelligence();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to queue opportunity");
    } finally {
      setQueueingId(null);
    }
  }

  async function handleQueueAndGenerate(id: number) {
    setGeneratingId(id);
    setActionError(null);
    try {
      const result = await apiFetch<{ primaryPieceId?: number }>(`/api/keyword-opportunities/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generate: true }),
      });
      await refetchIntelligence();
      if (result.primaryPieceId) {
        navigate(`/content-piece/${result.primaryPieceId}`);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to generate from opportunity");
    } finally {
      setGeneratingId(null);
    }
  }

  async function handleDismissOpportunity(id: number) {
    setDismissingId(id);
    setActionError(null);
    try {
      await apiFetch(`/api/keyword-opportunities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });
      await refetchIntelligence();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to dismiss");
    } finally {
      setDismissingId(null);
    }
  }

  async function handleTrackKeyword() {
    if (!projectId || !trackInput.trim()) return;
    setTracking(true);
    setActionError(null);
    try {
      await apiFetch("/api/tracked-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteProjectId: Number(projectId),
          keyword: trackInput.trim(),
          targetUrl: websiteUrl || undefined,
        }),
      });
      setTrackInput("");
      await refetchTracked();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to track keyword");
    } finally {
      setTracking(false);
    }
  }

  async function handleDeleteTracked(id: number) {
    setActionError(null);
    try {
      await apiFetch(`/api/tracked-keywords/${id}`, { method: "DELETE" });
      if (selectedTrackedId === id) setSelectedTrackedId(null);
      await refetchTracked();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to remove keyword");
    }
  }

  async function handleAnalyze() {
    const keywordsToAnalyze = keywordInput
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (keywordsToAnalyze.length === 0) {
      setActionError("Enter at least one keyword");
      return;
    }
    setAnalyzing(true);
    setAnalysis(null);
    setActionError(null);
    try {
      const result = await apiFetch<KeywordAnalysisResult>("/api/keyword-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: keywordsToAnalyze,
          websiteUrl: websiteUrl || undefined,
          websiteProjectId: projectId ? Number(projectId) : undefined,
        }),
      });
      setAnalysis(result);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleManualImport() {
    if (!projectId || !manualKeyword.trim() || !manualTitle.trim()) return;
    setManualImporting(true);
    setActionError(null);
    try {
      await apiFetch(`/api/website-projects/${projectId}/article-ideas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: manualKeyword.trim(),
          suggestedTitle: manualTitle.trim(),
          suggestedAngle: manualAngle.trim(),
        }),
      });
      setManualKeyword("");
      setManualTitle("");
      setManualAngle("");
      await refetchImports();
      await refetchIntelligence();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to add idea");
    } finally {
      setManualImporting(false);
    }
  }

  async function handleCsvImport(file: File) {
    if (!projectId) return;
    setCsvImporting(true);
    setActionError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(
        `${getApiBase()}/api/website-projects/${projectId}/article-ideas/import`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          (body && typeof body === "object" && "error" in body && String(body.error)) ||
            "CSV import failed",
        );
      }
      await refetchImports();
      await refetchIntelligence();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "CSV import failed");
    } finally {
      setCsvImporting(false);
    }
  }

  async function handleCreateSheetSource() {
    if (!projectId || !sheetLabel.trim() || !sheetUrl.trim()) return;
    setCreatingSheetSource(true);
    setActionError(null);
    try {
      const data = await apiFetch<{ source?: { id: number } }>(
        `/api/website-projects/${projectId}/article-idea-sources`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: sheetLabel.trim(),
            spreadsheetUrl: sheetUrl.trim(),
            sheetName: sheetName.trim() || undefined,
          }),
        },
      );
      setSheetLabel("");
      setSheetUrl("");
      setSheetName("");
      await refetchSheetSources();
      if (data.source?.id) {
        window.location.href = sheetsConnectUrl(data.source.id);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to create sheet source");
    } finally {
      setCreatingSheetSource(false);
    }
  }

  async function handleSyncSheetSource(sourceId: number) {
    if (!projectId) return;
    setSyncingSheetId(sourceId);
    setActionError(null);
    try {
      const response = await fetch(
        `${getApiBase()}/api/website-projects/${projectId}/article-idea-sources/sync`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", accept: "application/json" },
          body: JSON.stringify({ sourceId }),
        },
      );
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        if (
          body &&
          typeof body === "object" &&
          "connectUrl" in body &&
          typeof body.connectUrl === "string"
        ) {
          window.location.href = sheetsConnectUrl(sourceId);
          return;
        }
        throw new Error(
          (body && typeof body === "object" && "error" in body && String(body.error)) ||
            "Sheet sync failed",
        );
      }
      await refetchSheetSources();
      await refetchImports();
      await refetchIntelligence();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Sheet sync failed");
    } finally {
      setSyncingSheetId(null);
    }
  }

  async function handleDeleteSheetSource(sourceId: number) {
    if (!projectId) return;
    setActionError(null);
    try {
      await apiFetch(
        `/api/website-projects/${projectId}/article-idea-sources?sourceId=${sourceId}`,
        { method: "DELETE" },
      );
      await refetchSheetSources();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to remove sheet source");
    }
  }

  function handleConnectSheetSource(sourceId: number) {
    window.location.href = sheetsConnectUrl(sourceId);
  }

  function handleTabChange(tab: "ideas" | "import" | "tracking" | "analyzer") {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next, { replace: true });
  }

  function handleSourceFilterChange(filter: KeywordSourceFilter) {
    setSourceFilter(filter);
    const next = new URLSearchParams(searchParams);
    if (filter === "all") {
      next.delete("source");
    } else {
      next.set("source", filter);
    }
    setSearchParams(next, { replace: true });
  }

  return {
    projectId,
    activeProject,
    showInitialLoad,
    activeTab,
    handleTabChange,
    opportunities,
    intelligenceLoading,
    alerts,
    sourceFilter,
    handleSourceFilterChange,
    gscStatus,
    semrushStatus,
    gscQueries,
    gscFetching,
    semrushFetching,
    discovering,
    syncingGsc,
    handleDiscover,
    handleGscSync,
    handleQueueOpportunity,
    handleQueueAndGenerate,
    handleDismissOpportunity,
    queueingId,
    generatingId,
    dismissingId,
    keywords,
    trackInput,
    setTrackInput,
    handleTrackKeyword,
    tracking,
    selectedTrackedId,
    setSelectedTrackedId,
    handleDeleteTracked,
    trackedSnapshots,
    keywordInput,
    websiteUrl,
    setKeywordInput,
    setWebsiteUrl,
    handleAnalyze,
    analyzing,
    analysis,
    importHistory,
    importLoading,
    manualKeyword,
    manualTitle,
    manualAngle,
    setManualKeyword,
    setManualTitle,
    setManualAngle,
    handleManualImport,
    manualImporting,
    handleCsvImport,
    csvImporting,
    canImport,
    sheetsStatusMessage,
    sheetSources,
    sheetSourcesLoading,
    sheetLabel,
    sheetUrl,
    sheetName,
    setSheetLabel,
    setSheetUrl,
    setSheetName,
    handleCreateSheetSource,
    creatingSheetSource,
    handleSyncSheetSource,
    handleDeleteSheetSource,
    handleConnectSheetSource,
    syncingSheetId,
    actionError,
  };
}
