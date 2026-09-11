"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { ContentFormatType } from "./content-studio-format-data";
import type { LinkedInArchetypeId, LinkedInHookId } from "@workspace/app-shell/studio";
import type { PublishDestinationId } from "@/lib/projects/publishing-destinations";
import type { ContentPieceRow } from "./content-studio-utils";
import type { CreatePace, Flow } from "./create-content-modal-types";

export function useCreateContentFormState() {
  const [flow, setFlow] = useState<Flow>("create");
  const [createPace, setCreatePace] = useState<CreatePace>("express");
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState<ContentFormatType | null>(null);
  const [keyword, setKeyword] = useState("");
  const [angleHint, setAngleHint] = useState("");
  const [contentSection, setContentSection] = useState("");
  const [editorNotes, setEditorNotes] = useState("");
  const [sourceUrlsInput, setSourceUrlsInput] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [briefId, setBriefId] = useState<number | null>(null);
  const [linkedinArchetype, setLinkedinArchetype] = useState<LinkedInArchetypeId | "">("");
  const [linkedinHook, setLinkedinHook] = useState<LinkedInHookId | "">("");
  const [bypassCache, setBypassCache] = useState(false);
  /** Agent team: default on for SEO longform (set when format is chosen). */
  const [useAgentTeam, setUseAgentTeam] = useState(true);
  /** Skip Fox + Mockingbird when agent team is on. */
  const [agentFastMode, setAgentFastMode] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [detectedSections, setDetectedSections] = useState<string[]>([]);

  const [repurposeFormat, setRepurposeFormat] = useState<ContentFormatType>("linkedin_post");
  const [repurposeKeyword, setRepurposeKeyword] = useState("");
  const [repurposeContent, setRepurposeContent] = useState("");
  const [sourcePieceId, setSourcePieceId] = useState("");
  const [loadingSourcePiece, setLoadingSourcePiece] = useState(false);
  const [intendedDestination, setIntendedDestination] = useState<PublishDestinationId | "">("");
  const [optimizeUrl, setOptimizeUrl] = useState("");
  const [optimizeKeyword, setOptimizeKeyword] = useState("");
  const [optimizeSecondary, setOptimizeSecondary] = useState("");
  const [optimizePaste, setOptimizePaste] = useState("");
  const [optimizeError, setOptimizeError] = useState<string | null>(null);

  const resetFormFields = useCallback(() => {
    setFlow("create");
    setCreatePace("express");
    setStepIndex(0);
    setSelectedFormat(null);
    setKeyword("");
    setAngleHint("");
    setContentSection("");
    setEditorNotes("");
    setSourceUrlsInput("");
    setPlannedDate("");
    setLinkedinArchetype("");
    setLinkedinHook("");
    setBypassCache(false);
    setUseAgentTeam(true);
    setAgentFastMode(false);
    setDetectedSections([]);
    setRepurposeFormat("linkedin_post");
    setRepurposeKeyword("");
    setRepurposeContent("");
    setSourcePieceId("");
    setBriefId(null);
    setIntendedDestination("");
    setOptimizeUrl("");
    setOptimizeKeyword("");
    setOptimizeSecondary("");
    setOptimizePaste("");
    setOptimizeError(null);
    setGenerating(false);
  }, []);

  const loadSourcePiece = useCallback(async (id: string, existingPieces: ContentPieceRow[]) => {
    setSourcePieceId(id);
    const summary = existingPieces.find((p) => String(p.id) === id);
    if (summary) setRepurposeKeyword(summary.targetKeyword);
    if (!id) {
      setRepurposeContent("");
      return;
    }
    setLoadingSourcePiece(true);
    try {
      const res = await fetch(`/api/content-pieces/${id}`);
      if (res.ok) {
        const full = (await res.json()) as {
          bodyMarkdown?: string;
          title?: string;
          targetKeyword?: string;
        };
        setRepurposeContent(full.bodyMarkdown ?? "");
        if (full.targetKeyword) setRepurposeKeyword(full.targetKeyword);
      } else {
        toast.error("Failed to load content piece");
      }
    } catch {
      toast.error("Failed to load content piece");
    } finally {
      setLoadingSourcePiece(false);
    }
  }, []);

  return {
    flow,
    setFlow,
    createPace,
    setCreatePace,
    stepIndex,
    setStepIndex,
    selectedFormat,
    setSelectedFormat,
    keyword,
    setKeyword,
    angleHint,
    setAngleHint,
    contentSection,
    setContentSection,
    editorNotes,
    setEditorNotes,
    sourceUrlsInput,
    setSourceUrlsInput,
    plannedDate,
    setPlannedDate,
    briefId,
    setBriefId,
    linkedinArchetype,
    setLinkedinArchetype,
    linkedinHook,
    setLinkedinHook,
    bypassCache,
    setBypassCache,
    useAgentTeam,
    setUseAgentTeam,
    agentFastMode,
    setAgentFastMode,
    generating,
    setGenerating,
    detectedSections,
    setDetectedSections,
    repurposeFormat,
    setRepurposeFormat,
    repurposeKeyword,
    setRepurposeKeyword,
    repurposeContent,
    setRepurposeContent,
    sourcePieceId,
    setSourcePieceId,
    loadingSourcePiece,
    intendedDestination,
    setIntendedDestination,
    optimizeUrl,
    setOptimizeUrl,
    optimizeKeyword,
    setOptimizeKeyword,
    optimizeSecondary,
    setOptimizeSecondary,
    optimizePaste,
    setOptimizePaste,
    optimizeError,
    setOptimizeError,
    resetFormFields,
    loadSourcePiece,
  };
}

export type CreateContentFormState = ReturnType<typeof useCreateContentFormState>;
