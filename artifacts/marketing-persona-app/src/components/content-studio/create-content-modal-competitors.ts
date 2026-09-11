"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useCompetitorContext } from "@/lib/queries";
import {
  hostFromUrl,
  normalizeCompetitorUrl,
  normalizeCompetitorUrlList,
} from "@workspace/content-engine/support/competitor/competitor-url";

export type CompetitorAnalysisRow = {
  competitorUrl: string;
  competitorName: string;
  contentGaps: string[];
  quickWins: string[];
  threatLevel: "low" | "medium" | "high";
};

export function useCreateContentCompetitors(projectId: string, open: boolean) {
  const [competitorUrls, setCompetitorUrls] = useState<string[]>([]);
  const savedCompetitorUrlsRef = useRef<string[]>([]);
  const [competitorAnalyses, setCompetitorAnalyses] = useState<CompetitorAnalysisRow[]>([]);
  const [competitorFocusUrl, setCompetitorFocusUrl] = useState("");
  const [newCompetitorUrl, setNewCompetitorUrl] = useState("");
  const [projectIndustry, setProjectIndustry] = useState("");
  const [competitorContextApplied, setCompetitorContextApplied] = useState<string | null>(null);

  const { data: competitorContext, isLoading: loadingCompetitors } = useCompetitorContext(
    projectId,
    open,
  );

  if (open && competitorContext && competitorContextApplied !== projectId) {
    const urls = normalizeCompetitorUrlList(competitorContext.competitorUrls ?? []);
    setCompetitorContextApplied(projectId);
    setCompetitorUrls(urls);
    setProjectIndustry(competitorContext.industry ?? "");
    setCompetitorAnalyses((competitorContext.analyses ?? []) as CompetitorAnalysisRow[]);
    setCompetitorFocusUrl((prev) => {
      if (!prev) return "";
      const normalized = normalizeCompetitorUrl(prev);
      if (!normalized) return "";
      return urls.includes(normalized) ? normalized : "";
    });
  }
  if (!open && competitorContextApplied) {
    setCompetitorContextApplied(null);
  }

  useLayoutEffect(() => {
    if (competitorContextApplied === projectId) {
      savedCompetitorUrlsRef.current = competitorUrls;
    }
  }, [competitorContextApplied, projectId, competitorUrls]);

  function addCompetitorUrl() {
    const normalized = normalizeCompetitorUrl(newCompetitorUrl);
    if (!normalized) {
      toast.error("Enter a valid competitor URL");
      return;
    }
    if (competitorUrls.some((u) => hostFromUrl(u) === hostFromUrl(normalized))) {
      toast.error("That competitor is already listed");
      return;
    }
    if (competitorUrls.length >= 5) {
      toast.error("Maximum 5 competitors");
      return;
    }
    setCompetitorUrls((prev) => [...prev, normalized]);
    setNewCompetitorUrl("");
  }

  const saveCompetitorsAndContinue = useCallback(
    async (goNext: () => void) => {
      const normalized = normalizeCompetitorUrlList(competitorUrls);
      if (normalized.length !== competitorUrls.length) {
        toast.error("Remove or fix invalid competitor URLs");
        return;
      }
      const dirty =
        JSON.stringify([...normalized].sort()) !==
        JSON.stringify([...savedCompetitorUrlsRef.current].sort());
      if (dirty) {
        try {
          const res = await fetch(`/api/website-projects/${projectId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ competitorUrls: normalized }),
          });
          if (!res.ok) throw new Error("Save failed");
          savedCompetitorUrlsRef.current = normalized;
          setCompetitorUrls(normalized);
        } catch {
          toast.error("Failed to save competitors");
          return;
        }
      }
      goNext();
    },
    [competitorUrls, projectId],
  );

  const resetCompetitors = useCallback(() => {
    setCompetitorUrls([]);
    savedCompetitorUrlsRef.current = [];
    setCompetitorAnalyses([]);
    setCompetitorFocusUrl("");
    setNewCompetitorUrl("");
    setProjectIndustry("");
  }, []);

  const competitorGenerateFields = useCallback(() => {
    const focus = competitorFocusUrl
      ? (normalizeCompetitorUrl(competitorFocusUrl) ?? undefined)
      : undefined;
    const urls = normalizeCompetitorUrlList(competitorUrls);
    const resolvedUrls = urls.length > 0 ? urls : undefined;
    return {
      ...(focus
        ? { competitorFocusUrl: focus }
        : resolvedUrls?.[0]
          ? { competitorFocusUrl: resolvedUrls[0] }
          : {}),
      ...(resolvedUrls ? { competitorUrls: resolvedUrls } : {}),
    };
  }, [competitorFocusUrl, competitorUrls]);

  return {
    competitorUrls,
    setCompetitorUrls,
    competitorAnalyses,
    competitorFocusUrl,
    setCompetitorFocusUrl,
    newCompetitorUrl,
    setNewCompetitorUrl,
    projectIndustry,
    loadingCompetitors,
    addCompetitorUrl,
    saveCompetitorsAndContinue,
    resetCompetitors,
    competitorGenerateFields,
  };
}
