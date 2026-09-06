/**
 * Pure async generation runners for the create-content modal.
 * Extracted from the hook body so they can be tested and reasoned about
 * independently of React state machinery.
 */
import { toast } from "sonner";
import type { ContentFormatType } from "./content-studio-format-data";
import type { ContentPieceRow } from "./content-studio-utils";
import { extractSections } from "./create-content-modal-logic";
import type React from "react";

export type FallbackParams = {
  selectedFormat: ContentFormatType | null;
  keyword: string;
  bypassCache: boolean;
  plannedDate: string;
  briefId: number | null;
  intendedDestination: string;
  projectId: string;
  contentSection: string;
  showBedrockModelPicker: boolean;
  bedrockModel: string;
  canManageBedrockModel: boolean;
  saveBedrockModel: boolean;
  buildAngleHint: (format: ContentFormatType) => string | undefined;
  competitorGenerateFields: () => Record<string, unknown>;
  onVoiceRequired?: () => void;
};

export async function handleGenerateFallback(params: FallbackParams): Promise<ContentPieceRow> {
  const {
    selectedFormat,
    keyword,
    bypassCache,
    plannedDate,
    briefId,
    intendedDestination,
    projectId,
    contentSection,
    showBedrockModelPicker,
    bedrockModel,
    canManageBedrockModel,
    saveBedrockModel,
    buildAngleHint,
    competitorGenerateFields,
    onVoiceRequired,
  } = params;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (bypassCache) headers["x-bypass-cache"] = "true";

  const trimmedSection = contentSection.trim();
  const res = await fetch(`/api/website-projects/${projectId}/content-pieces`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      formatType: selectedFormat,
      targetKeyword: keyword.trim(),
      angleHint: buildAngleHint(selectedFormat!),
      plannedDate: plannedDate || undefined,
      briefId: briefId ?? undefined,
      cmsCategories: trimmedSection ? [trimmedSection] : undefined,
      cmsTags: undefined,
      ...(intendedDestination ? { intendedPublishPlatform: intendedDestination } : {}),
      ...competitorGenerateFields(),
      ...(showBedrockModelPicker && bedrockModel.trim()
        ? {
            bedrockModel: bedrockModel.trim(),
            ...(canManageBedrockModel && saveBedrockModel ? { saveBedrockModel: true } : {}),
          }
        : {}),
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    if (res.status === 409 && data?.code === "voice_required") {
      onVoiceRequired?.();
      throw new Error(data?.error ?? "Brand voice required");
    }
    throw new Error(data?.error ?? "Generation failed");
  }

  return (await res.json()) as ContentPieceRow;
}

export type RunGenerationParams = FallbackParams & {
  onCreated: (piece: ContentPieceRow) => void;
  handleClose: () => void;
  setGenerating: (v: boolean) => void;
  setDetectedSections: (v: string[]) => void;
  setStepIndex: (fn: (i: number) => number) => void;
  generationStarted: React.MutableRefObject<boolean>;
};

export async function runGeneration(params: RunGenerationParams): Promise<void> {
  const {
    selectedFormat,
    keyword,
    bypassCache,
    plannedDate,
    briefId,
    intendedDestination,
    projectId,
    contentSection,
    showBedrockModelPicker,
    bedrockModel,
    canManageBedrockModel,
    saveBedrockModel,
    buildAngleHint,
    competitorGenerateFields,
    onVoiceRequired,
    onCreated,
    handleClose,
    setGenerating,
    setDetectedSections,
    setStepIndex,
    generationStarted,
  } = params;

  if (!selectedFormat || !keyword.trim()) return;
  setGenerating(true);
  setDetectedSections([]);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (bypassCache) headers["x-bypass-cache"] = "true";

  const fallbackParams: FallbackParams = {
    selectedFormat,
    keyword,
    bypassCache,
    plannedDate,
    briefId,
    intendedDestination,
    projectId,
    contentSection,
    showBedrockModelPicker,
    bedrockModel,
    canManageBedrockModel,
    saveBedrockModel,
    buildAngleHint,
    competitorGenerateFields,
    onVoiceRequired,
  };

  const payload = {
    cmsCategories: contentSection.trim() ? [contentSection.trim()] : undefined,
    cmsTags: undefined,
    formatType: selectedFormat,
    targetKeyword: keyword.trim(),
    angleHint: buildAngleHint(selectedFormat),
    plannedDate: plannedDate || undefined,
    briefId: briefId ?? undefined,
    ...(intendedDestination ? { intendedPublishPlatform: intendedDestination } : {}),
    ...competitorGenerateFields(),
    ...(showBedrockModelPicker && bedrockModel.trim()
      ? {
          bedrockModel: bedrockModel.trim(),
          ...(canManageBedrockModel && saveBedrockModel ? { saveBedrockModel: true } : {}),
        }
      : {}),
  };

  try {
    let res: Response;
    try {
      res = await fetch(`/api/website-projects/${projectId}/content-pieces/generate/stream`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
    } catch {
      const piece = await handleGenerateFallback(fallbackParams);
      onCreated(piece);
      toast.success("Content generated");
      handleClose();
      return;
    }

    if (!res.ok || !res.body) {
      if (res.status === 409) {
        const data = await res.json().catch(() => null);
        if (data?.code === "voice_required") {
          onVoiceRequired?.();
          throw new Error(data?.error ?? "Brand voice required");
        }
      }
      const piece = await handleGenerateFallback(fallbackParams);
      onCreated(piece);
      toast.success("Content generated");
      handleClose();
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let jsonAccumulated = "";
    let finalPiece: ContentPieceRow | null = null;
    let fromCache = false;
    let pendingEvent: string | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          pendingEvent = line.slice(7).trim();
          continue;
        }
        if (!line.startsWith("data: ")) continue;

        const eventPayload = line.slice(6);
        if (pendingEvent === "cached") {
          fromCache = true;
          try {
            const cached = JSON.parse(eventPayload) as ContentPieceRow;
            if ("id" in cached) finalPiece = cached;
          } catch {
            // ignore malformed cached payload
          }
          pendingEvent = null;
          continue;
        }
        if (pendingEvent === "error") {
          let message = "Generation failed";
          try {
            const errData = JSON.parse(eventPayload) as { error?: string };
            if (errData.error) message = errData.error;
          } catch {
            // keep default
          }
          throw new Error(message);
        }
        pendingEvent = null;

        try {
          const parsed = JSON.parse(eventPayload) as { text?: string } | ContentPieceRow;
          if ("text" in parsed && parsed.text) {
            jsonAccumulated += parsed.text;
            const sections = extractSections(jsonAccumulated);
            if (sections.length > 0) {
              setDetectedSections(sections);
            } else if (jsonAccumulated.length > 30) {
              setDetectedSections(["Crafting title\u2026"]);
            }
          } else if ("id" in parsed) {
            finalPiece = parsed as ContentPieceRow;
          }
        } catch {
          // partial JSON during streaming
        }
      }
    }

    if (finalPiece) {
      onCreated(finalPiece);
      toast.success(fromCache ? "Loaded cached content" : "Content generated");
      handleClose();
      return;
    }

    throw new Error("Generation completed without a result");
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Generation failed");
    setStepIndex((i) => Math.max(0, i - 1));
    generationStarted.current = false;
  } finally {
    setGenerating(false);
  }
}

export type RunRepurposeParams = {
  repurposeFormat: ContentFormatType;
  repurposeKeyword: string;
  repurposeContent: string;
  projectId: string;
  onCreated: (piece: ContentPieceRow) => void;
  handleClose: () => void;
  setGenerating: (v: boolean) => void;
  setStepIndex: (fn: (i: number) => number) => void;
  generationStarted: React.MutableRefObject<boolean>;
};

export async function runRepurpose(params: RunRepurposeParams): Promise<void> {
  const {
    repurposeFormat,
    repurposeKeyword,
    repurposeContent,
    projectId,
    onCreated,
    handleClose,
    setGenerating,
    setStepIndex,
    generationStarted,
  } = params;

  if (!repurposeKeyword.trim() || repurposeContent.trim().length < 50) return;
  setGenerating(true);
  try {
    const res = await fetch(`/api/website-projects/${projectId}/content-pieces/repurpose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetFormat: repurposeFormat,
        targetKeyword: repurposeKeyword.trim(),
        existingContent: repurposeContent.trim(),
      }),
    });
    if (!res.ok) throw new Error("Repurpose failed");
    const piece = await res.json();
    onCreated(piece);
    toast.success("Repurposed content created");
    handleClose();
  } catch {
    toast.error("Repurpose failed");
    setStepIndex((i) => Math.max(0, i - 1));
    generationStarted.current = false;
  } finally {
    setGenerating(false);
  }
}

export type RunOptimizeImportParams = {
  optimizeUrl: string;
  optimizeKeyword: string;
  optimizeSecondary: string;
  optimizePaste: string;
  projectId: string;
  onCreated: (piece: ContentPieceRow) => void;
  handleClose: () => void;
  setGenerating: (v: boolean) => void;
  setOptimizeError: (msg: string | null) => void;
  setStepIndex: (fn: (i: number) => number) => void;
  generationStarted: React.MutableRefObject<boolean>;
};

export async function runOptimizeImport(params: RunOptimizeImportParams): Promise<void> {
  const {
    optimizeUrl,
    optimizeKeyword,
    optimizeSecondary,
    optimizePaste,
    projectId,
    onCreated,
    handleClose,
    setGenerating,
    setOptimizeError,
    setStepIndex,
    generationStarted,
  } = params;

  if (!optimizeUrl.trim() || !optimizeKeyword.trim()) return;
  setGenerating(true);
  setOptimizeError(null);

  try {
    const post = async (confirmCanonical?: boolean) => {
      const res = await fetch(`/api/website-projects/${projectId}/content-pieces/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: optimizeUrl.trim(),
          targetKeyword: optimizeKeyword.trim(),
          ...(optimizePaste.trim() ? { bodyMarkdown: optimizePaste.trim() } : {}),
          ...(optimizeSecondary.trim()
            ? {
                secondaryKeywords: optimizeSecondary
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .slice(0, 12),
              }
            : {}),
          ...(confirmCanonical ? { confirmCanonical: true } : {}),
        }),
      });
      return res;
    };

    let res = await post();
    if (res.status === 422) {
      const body = (await res.json().catch(() => null)) as {
        needsCanonicalConfirm?: boolean;
        enteredUrl?: string;
        fetchedCanonicalUrl?: string;
        error?: string;
        pasteFallback?: boolean;
      } | null;
      if (body?.needsCanonicalConfirm && body.fetchedCanonicalUrl) {
        const ok = confirm(
          `Canonical URL is ${body.fetchedCanonicalUrl} (you entered ${body.enteredUrl}). Import using the fetched page?`,
        );
        if (!ok) {
          setOptimizeError("Import cancelled");
          setStepIndex(() => 0);
          generationStarted.current = false;
          return;
        }
        res = await post(true);
      } else {
        setOptimizeError(body?.error ?? "Import failed");
        setStepIndex(() => 0);
        generationStarted.current = false;
        return;
      }
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? "Import failed");
    }
    const data = (await res.json()) as { piece: ContentPieceRow };
    onCreated(data.piece);
    toast.success("Page imported — score it, Fix gaps, then publish update");
    handleClose();
    window.location.assign(`/projects/${projectId}/content-piece/${data.piece.id}`);
  } catch (err) {
    setOptimizeError(err instanceof Error ? err.message : "Import failed");
    toast.error(err instanceof Error ? err.message : "Import failed");
    setStepIndex(() => 0);
    generationStarted.current = false;
  } finally {
    setGenerating(false);
  }
}
