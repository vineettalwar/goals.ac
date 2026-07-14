import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/app-layout";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Plus,
  X,
  Loader2,
  BarChart3,
  Globe,
  Zap,
  Lock,
  Trash2,
  AlertTriangle,
  Target,
  ListPlus,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/use-auth";
import { useActiveProject } from "@/context/use-active-project";
import {
  useCreateKeywordAnalysis,
  useListTrackedKeywords,
  useCreateTrackedKeyword,
  useDeleteTrackedKeyword,
  useGetTrackedKeywordSnapshots,
  getListTrackedKeywordsQueryKey,
  getGetTrackedKeywordSnapshotsQueryKey,
  type KeywordAnalysisResponse,
  type TrackedKeywordWithSnapshot,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { KeywordRankChart } from "@/components/visibility/keyword-rank-chart";
import { KeywordTrackingOpportunities, type KeywordOpportunity } from "./keyword-tracking-opportunities";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface KeywordRankAlert {
  id: number;
  keyword: string;
  previousPosition: number | null;
  currentPosition: number | null;
  severity: string;
  message: string;
}

const difficultyColors: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30",
  medium: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30",
  high: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30",
};

import { fadeUp } from "./keyword-tracking-motion";

import { KeywordTrackingView } from "./keyword-tracking-view";

export default function KeywordTracking() {
  const { user, token } = useAuth();
  const { activeProjectId, projects } = useActiveProject();
  const queryClient = useQueryClient();

  const [keywords, setKeywords] = useState<string[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<KeywordAnalysisResponse | null>(null);
  const [selectedTrackedId, setSelectedTrackedId] = useState<number | null>(null);
  const [trackInput, setTrackInput] = useState("");
  const [opportunities, setOpportunities] = useState<KeywordOpportunity[]>([]);
  const [alerts, setAlerts] = useState<KeywordRankAlert[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [queueingId, setQueueingId] = useState<number | null>(null);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  useEffect(() => {
    if (activeProject?.url && !websiteUrl) {
      setWebsiteUrl(activeProject.url);
    }
  }, [activeProject?.url, websiteUrl]);

  const loadIntelligence = useCallback(async () => {
    if (!token || !activeProjectId) {
      setOpportunities([]);
      setAlerts([]);
      return;
    }
    try {
      const [oppRes, alertRes] = await Promise.all([
        fetch(`${API_BASE}/api/website-projects/${activeProjectId}/keyword-opportunities?status=open`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/website-projects/${activeProjectId}/keyword-alerts`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (oppRes.ok) {
        const data = await oppRes.json() as { opportunities: KeywordOpportunity[] };
        setOpportunities(data.opportunities ?? []);
      }
      if (alertRes.ok) {
        const data = await alertRes.json() as { alerts: KeywordRankAlert[] };
        setAlerts(data.alerts ?? []);
      }
    } catch {
      /* ignore */
    }
  }, [token, activeProjectId]);

  useEffect(() => {
    loadIntelligence();
  }, [loadIntelligence]);

  const handleDiscoverGaps = async () => {
    if (!token || !activeProjectId) return;
    setIsDiscovering(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/website-projects/${activeProjectId}/keyword-opportunities/discover`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Discovery failed");
        return;
      }
      await loadIntelligence();
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleQueueOpportunity = async (id: number) => {
    if (!token) return;
    setQueueingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/keyword-opportunities/${id}/queue`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Failed to queue topic");
        return;
      }
      await loadIntelligence();
    } finally {
      setQueueingId(null);
    }
  };

  const handleDismissOpportunity = async (id: number) => {
    if (!token) return;
    await fetch(`${API_BASE}/api/keyword-opportunities/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "dismissed" }),
    });
    await loadIntelligence();
  };

  const handleDismissAlert = async (id: number) => {
    if (!token) return;
    await fetch(`${API_BASE}/api/keyword-rank-alerts/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "dismissed" }),
    });
    await loadIntelligence();
  };

  const analyzeMutation = useCreateKeywordAnalysis({
    mutation: {
      onSuccess: (data) => {
        setResult(data);
        setError(null);
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
      },
    },
  });

  const trackedQuery = useListTrackedKeywords(
    { projectId: activeProjectId ?? 0 },
    {
      query: {
        enabled: Boolean(user && activeProjectId),
        queryKey: getListTrackedKeywordsQueryKey({ projectId: activeProjectId ?? 0 }),
      },
    },
  );

  const snapshotsQuery = useGetTrackedKeywordSnapshots(selectedTrackedId ?? 0, {
    query: {
      enabled: Boolean(selectedTrackedId),
      queryKey: getGetTrackedKeywordSnapshotsQueryKey(selectedTrackedId ?? 0),
    },
  });

  const trackMutation = useCreateTrackedKeyword({
    mutation: {
      onSuccess: () => {
        setTrackInput("");
        if (activeProjectId) {
          queryClient.invalidateQueries({ queryKey: [`/api/tracked-keywords`] });
        }
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : "Failed to add keyword to tracking.");
      },
    },
  });

  const deleteMutation = useDeleteTrackedKeyword({
    mutation: {
      onSuccess: () => {
        if (activeProjectId) {
          queryClient.invalidateQueries({ queryKey: [`/api/tracked-keywords`] });
        }
        if (selectedTrackedId) setSelectedTrackedId(null);
      },
    },
  });

  const trackedKeywords: TrackedKeywordWithSnapshot[] =
    trackedQuery.data?.trackedKeywords ?? [];

  const addKeyword = () => {
    const kw = inputVal.trim().toLowerCase();
    if (!kw || keywords.includes(kw) || keywords.length >= 10) return;
    setKeywords((prev) => [...prev, kw]);
    setInputVal("");
  };

  const removeKeyword = (kw: string) => {
    setKeywords((prev) => prev.filter((k) => k !== kw));
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addKeyword();
    }
  };

  const handleAnalyze = () => {
    if (keywords.length === 0) return;
    setError(null);
    setResult(null);
    analyzeMutation.mutate({
      data: {
        keywords,
        websiteUrl: websiteUrl || undefined,
        website_project_id: user && activeProjectId ? activeProjectId : undefined,
      },
    });
  };

  const handleTrackKeyword = (keyword: string) => {
    if (!activeProjectId) return;
    trackMutation.mutate({
      data: {
        website_project_id: activeProjectId,
        keyword: keyword.trim().toLowerCase(),
        target_url: websiteUrl || activeProject?.url,
      },
    });
  };

  const chartData = (snapshotsQuery.data?.snapshots ?? [])
    .slice()
    .reverse()
    .map((s) => ({
      date: new Date(s.checkedAt).toLocaleDateString(),
      position: s.position ?? 101,
    }));

  const viewProps = {
    user, token, activeProjectId, activeProject, keywords, setKeywords, inputVal, setInputVal,
    websiteUrl, setWebsiteUrl, error, setError, result, selectedTrackedId, setSelectedTrackedId,
    trackInput, setTrackInput, opportunities, alerts, isDiscovering, queueingId,
    trackedQuery, snapshotsQuery, analyzeMutation, handleDiscoverGaps, handleQueueOpportunity,
    handleDismissOpportunity, handleDismissAlert, addKeyword, removeKeyword, runAnalysis,
    difficultyColors, fadeUp,
  };

  return <KeywordTrackingView {...viewProps} />;
}
