import { useEffect, useMemo, useState } from "react";
import {
  hostFromUrl,
  normalizeCompetitorUrl,
  normalizeCompetitorUrlList,
  replaceCompetitorUrl,
} from "@workspace/content-engine/support/competitor/competitor-url";
import {
  getConnectedDestinationsForFormat,
  type CmsConnectionSnapshot,
} from "../content-piece/publish-destinations";
import {
  buildLinkedInAngleHint,
  parseLinkedInArchetypeFromAngleHint,
  parseLinkedInHookFromAngleHint,
  stripLinkedInAngleMeta,
  type LinkedInArchetypeId,
  type LinkedInHookId,
} from "./linkedin-archetypes";
import { formatTypeLabel, studioFormatOptionsForSurface } from "./types";
import {
  asContentFormat,
  buildSteps,
  competitorUrlsFromInitial,
  isSeoLongform,
  optionByHost,
  phaseToLabelIndex,
  VALID_FORMATS,
  MIN_REPURPOSE_CHARS,
  type CreateContentDraftInput,
  type CreateContentInitialValues,
  type CreateCompetitorOption,
  type CreateFlow,
  type CreateGeneratingPhase,
  type CreateSourcePieceOption,
  type RepurposeContentInput,
} from "./create-content-types";

export type CreateContentDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateContentDraftInput) => void | Promise<void>;
  onRepurpose?: (input: RepurposeContentInput) => void | Promise<void>;
  submitting?: boolean;
  error?: string | null;
  initialValues?: CreateContentInitialValues | null;
  cmsConnections?: CmsConnectionSnapshot | null;
  projectCompetitors?: CreateCompetitorOption[] | null;
  competitorsLoading?: boolean;
  generatingPhase?: CreateGeneratingPhase | null;
  generatingHeadings?: string[] | null;
  existingPieces?: CreateSourcePieceOption[] | null;
  onLoadSourcePiece?: (
    pieceId: number,
  ) => Promise<{ bodyMarkdown: string; targetKeyword?: string | null } | null>;
  surface?: "blog_wordpress" | "full";
};

export function useCreateContentDialog({
  open,
  onSubmit,
  onRepurpose,
  submitting = false,
  initialValues = null,
  cmsConnections = null,
  projectCompetitors = null,
  competitorsLoading = false,
  generatingPhase = null,
  existingPieces = null,
  onLoadSourcePiece,
  surface = "full",
}: CreateContentDialogProps) {
  const enableRepurpose = Boolean(onRepurpose);
  const [flow, setFlow] = useState<CreateFlow>("create");
  const [stepIndex, setStepIndex] = useState(0);
  const [title, setTitle] = useState("");
  const [targetKeyword, setTargetKeyword] = useState("");
  const [formatType, setFormatType] = useState("blog_post");
  const [angleHint, setAngleHint] = useState("");
  const [linkedinArchetype, setLinkedinArchetype] = useState<LinkedInArchetypeId | "">("");
  const [linkedinHook, setLinkedinHook] = useState<LinkedInHookId | "">("");
  const [plannedDate, setPlannedDate] = useState("");
  const [intendedPublishPlatform, setIntendedPublishPlatform] = useState<string | undefined>();
  const [competitorUrls, setCompetitorUrls] = useState<string[]>([]);
  const [competitorFocusUrl, setCompetitorFocusUrl] = useState("");
  const [newCompetitorUrl, setNewCompetitorUrl] = useState("");
  const [sourcePieceId, setSourcePieceId] = useState("");
  const [sourceContent, setSourceContent] = useState("");
  const [loadingSourcePiece, setLoadingSourcePiece] = useState(false);
  const [briefId, setBriefId] = useState<number | undefined>(undefined);
  const [useAgentTeam, setUseAgentTeam] = useState(true);
  const [agentFastMode, setAgentFastMode] = useState(false);

  const formatOptions = useMemo(() => studioFormatOptionsForSurface(surface), [surface]);
  const contentFormat = asContentFormat(formatType);
  const destinations = useMemo(() => {
    if (flow === "repurpose" || !contentFormat) return [];
    return getConnectedDestinationsForFormat(contentFormat, cmsConnections ?? {});
  }, [contentFormat, cmsConnections, flow]);

  const competitorMeta = useMemo(
    () => optionByHost(projectCompetitors ?? []),
    [projectCompetitors],
  );

  const steps = useMemo(
    () => buildSteps(flow, formatType, destinations, enableRepurpose),
    [flow, formatType, destinations, enableRepurpose],
  );

  useEffect(() => {
    if (!open) {
      setFlow("create");
      setStepIndex(0);
      setTitle("");
      setTargetKeyword("");
      setFormatType("blog_post");
      setAngleHint("");
      setLinkedinArchetype("");
      setLinkedinHook("");
      setPlannedDate("");
      setIntendedPublishPlatform(undefined);
      setCompetitorUrls([]);
      setCompetitorFocusUrl("");
      setNewCompetitorUrl("");
      setSourcePieceId("");
      setSourceContent("");
      setLoadingSourcePiece(false);
      setBriefId(undefined);
      setUseAgentTeam(true);
      setAgentFastMode(false);
      return;
    }

    const nextFormat =
      initialValues?.formatType && VALID_FORMATS.has(initialValues.formatType as never)
        ? initialValues.formatType
        : "blog_post";
    const initialAngle = initialValues?.angleHint?.trim() ?? "";
    setFlow("create");
    setStepIndex(0);
    setTitle(initialValues?.title?.trim() ?? "");
    setTargetKeyword(initialValues?.targetKeyword?.trim() ?? "");
    setFormatType(nextFormat);
    setLinkedinArchetype(parseLinkedInArchetypeFromAngleHint(initialAngle));
    setLinkedinHook(parseLinkedInHookFromAngleHint(initialAngle));
    setAngleHint(
      nextFormat === "linkedin_post" ? stripLinkedInAngleMeta(initialAngle) : initialAngle,
    );
    setPlannedDate(initialValues?.plannedDate?.trim() || "");
    setIntendedPublishPlatform(initialValues?.intendedPublishPlatform?.trim() || undefined);
    setCompetitorUrls(competitorUrlsFromInitial(initialValues));
    setCompetitorFocusUrl(
      normalizeCompetitorUrl(initialValues?.competitorFocusUrl ?? "") ?? "",
    );
    setNewCompetitorUrl("");
    setSourcePieceId("");
    setSourceContent("");
    setLoadingSourcePiece(false);
    setBriefId(initialValues?.briefId);
    setUseAgentTeam(isSeoLongform(nextFormat));
    setAgentFastMode(false);
  }, [open, initialValues]);

  useEffect(() => {
    if (!open || competitorsLoading || flow === "repurpose") return;
    const fromProject = normalizeCompetitorUrlList(
      (projectCompetitors ?? []).map((option) => option.url),
    );
    if (fromProject.length === 0) return;
    setCompetitorUrls((prev) => normalizeCompetitorUrlList([...prev, ...fromProject]));
    setCompetitorFocusUrl((prev) => {
      if (!prev) return "";
      const normalized = normalizeCompetitorUrl(prev);
      if (!normalized) return "";
      const merged = normalizeCompetitorUrlList([
        ...competitorUrlsFromInitial(initialValues),
        ...fromProject,
      ]);
      return merged.some((url) => hostFromUrl(url) === hostFromUrl(normalized)) ? normalized : "";
    });
  }, [open, competitorsLoading, projectCompetitors, initialValues, flow]);

  useEffect(() => {
    setStepIndex((i) => Math.min(i, steps.length - 1));
  }, [steps.length]);

  useEffect(() => {
    if (!intendedPublishPlatform) return;
    if (destinations.some((d) => d.id === intendedPublishPlatform)) return;
    setIntendedPublishPlatform(undefined);
  }, [destinations, intendedPublishPlatform]);

  const currentStep = steps[Math.min(stepIndex, steps.length - 1)] ?? "format";
  const progress = ((stepIndex + 1) / steps.length) * 100;
  const isLinkedIn = formatType === "linkedin_post" && flow === "create";
  const showGenerating = submitting && currentStep === "review";
  const generatingLabelIndex = phaseToLabelIndex(
    submitting ? (generatingPhase ?? "analyzing") : null,
  );
  const sessionCompetitorUrls = isSeoLongform(formatType) ? competitorUrls : [];
  const focusCompetitorUrl = competitorFocusUrl || sessionCompetitorUrls[0] || "";
  const selectedDestinationLabel = intendedPublishPlatform
    ? (destinations.find((d) => d.id === intendedPublishPlatform)?.label ?? intendedPublishPlatform)
    : null;

  function goBack() {
    if (submitting || stepIndex <= 0) return;
    setStepIndex((i) => i - 1);
  }

  function goNext() {
    if (submitting) return;
    if (currentStep === "keyword" && !targetKeyword.trim()) return;
    if (currentStep === "source" && sourceContent.trim().length < MIN_REPURPOSE_CHARS) return;
    if (currentStep === "review") return;
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function handleFormatSelect(value: string) {
    setFormatType(value);
    setUseAgentTeam(isSeoLongform(value));
    if (value !== "linkedin_post") {
      setLinkedinArchetype("");
      setLinkedinHook("");
    }
  }

  function addQuickCompetitor() {
    const normalized = normalizeCompetitorUrl(newCompetitorUrl);
    if (!normalized) return;
    setCompetitorUrls((prev) => normalizeCompetitorUrlList([...prev, normalized]));
    setNewCompetitorUrl("");
  }

  function updateQuickCompetitor(oldUrl: string, nextRaw: string) {
    const result = replaceCompetitorUrl(competitorUrls, oldUrl, nextRaw);
    if (!result.ok) return false;
    const nextFocus = result.urls[competitorUrls.indexOf(oldUrl)] ?? "";
    setCompetitorUrls(result.urls);
    if (hostFromUrl(competitorFocusUrl) === hostFromUrl(oldUrl)) {
      setCompetitorFocusUrl(nextFocus);
    }
    return true;
  }

  function removeQuickCompetitor(url: string) {
    setCompetitorUrls((prev) => prev.filter((u) => u !== url));
    if (hostFromUrl(competitorFocusUrl) === hostFromUrl(url)) setCompetitorFocusUrl("");
  }

  async function selectSourcePiece(pieceId: string) {
    setSourcePieceId(pieceId);
    if (!pieceId || !onLoadSourcePiece) return;
    const id = Number(pieceId);
    if (!Number.isFinite(id)) return;
    setLoadingSourcePiece(true);
    try {
      const loaded = await onLoadSourcePiece(id);
      if (loaded?.bodyMarkdown) {
        setSourceContent(loaded.bodyMarkdown);
        if (loaded.targetKeyword?.trim() && !targetKeyword.trim()) {
          setTargetKeyword(loaded.targetKeyword.trim());
        }
      }
    } finally {
      setLoadingSourcePiece(false);
    }
  }

  async function handleGenerate() {
    const keyword = targetKeyword.trim();
    if (!keyword || submitting) return;

    if (flow === "repurpose") {
      if (!onRepurpose || sourceContent.trim().length < MIN_REPURPOSE_CHARS) return;
      await onRepurpose({
        targetFormat: formatType,
        targetKeyword: keyword,
        existingContent: sourceContent.trim(),
      });
      return;
    }

    const resolvedAngle =
      formatType === "linkedin_post"
        ? buildLinkedInAngleHint(linkedinArchetype, linkedinHook, angleHint)
        : angleHint.trim() || undefined;

    const urls = isSeoLongform(formatType) ? competitorUrls : [];
    const focus = competitorFocusUrl || urls[0];

    await onSubmit({
      title: title.trim(),
      targetKeyword: keyword,
      formatType,
      angleHint: resolvedAngle,
      plannedDate: plannedDate.trim() || null,
      intendedPublishPlatform: intendedPublishPlatform || undefined,
      competitorFocusUrl: focus || undefined,
      competitorUrls: urls.length > 0 ? urls : undefined,
      briefId,
      ...(isSeoLongform(formatType) && useAgentTeam
        ? { useAgentTeam: true, ...(agentFastMode ? { agentFastMode: true } : {}) }
        : {}),
    });
  }

  const stepTitle = showGenerating
    ? flow === "repurpose"
      ? `Repurposing into ${formatTypeLabel(formatType)}…`
      : useAgentTeam
        ? `Agent team writing your ${formatTypeLabel(formatType)}…`
        : `Writing your ${formatTypeLabel(formatType)}…`
    : currentStep === "path"
      ? "How do you want to start?"
      : currentStep === "format"
        ? "Choose a format"
        : currentStep === "keyword"
          ? flow === "repurpose"
            ? "Target keyword"
            : isLinkedIn
              ? "Keyword & archetype"
              : "Keyword & angle"
          : currentStep === "source"
            ? "Source content"
            : currentStep === "competitors"
              ? "Competitor landscape"
              : currentStep === "destination"
                ? "Where will this be published?"
                : flow === "repurpose"
                  ? "Confirm & repurpose"
                  : "Schedule & review";

  const stepSubtitle = showGenerating
    ? `Target: ${targetKeyword.trim() || "—"}`
    : currentStep === "path"
      ? "Create from a keyword, or adapt an existing piece."
      : currentStep === "format"
        ? flow === "repurpose"
          ? "We'll adapt your source content to this format."
          : "Pick the content type — we tailor structure and length to match."
        : currentStep === "keyword"
          ? flow === "repurpose"
            ? "Required — used for the new piece title focus."
            : isLinkedIn
              ? "Target keyword is required. Archetype and hook chips are optional."
              : "Target keyword is required. Angle and title are optional."
          : currentStep === "source"
            ? `Paste content or pick a studio piece (min ${MIN_REPURPOSE_CHARS} characters).`
            : currentStep === "competitors"
              ? "Optional — tap a project competitor as primary focus, or quick-add a URL."
              : currentStep === "destination"
                ? "Optional — shapes generation and pre-selects your publish destination."
                : flow === "repurpose"
                  ? "Confirm the adaptation, then generate."
                  : "Optional date for the calendar, then confirm and generate.";

  return {
    MIN_REPURPOSE_CHARS,
    flow,
    setFlow,
    stepIndex,
    setStepIndex,
    title,
    setTitle,
    targetKeyword,
    setTargetKeyword,
    formatType,
    setFormatType,
    angleHint,
    setAngleHint,
    linkedinArchetype,
    setLinkedinArchetype,
    linkedinHook,
    setLinkedinHook,
    plannedDate,
    setPlannedDate,
    intendedPublishPlatform,
    setIntendedPublishPlatform,
    newCompetitorUrl,
    setNewCompetitorUrl,
    sourcePieceId,
    sourceContent,
    setSourceContent,
    loadingSourcePiece,
    useAgentTeam,
    setUseAgentTeam,
    agentFastMode,
    setAgentFastMode,
    formatOptions,
    destinations,
    competitorMeta,
    steps,
    currentStep,
    progress,
    isLinkedIn,
    showGenerating,
    generatingLabelIndex,
    sessionCompetitorUrls,
    focusCompetitorUrl,
    selectedDestinationLabel,
    goBack,
    goNext,
    handleFormatSelect,
    addQuickCompetitor,
    updateQuickCompetitor,
    removeQuickCompetitor,
    selectSourcePiece,
    handleGenerate,
    stepTitle,
    stepSubtitle,
    existingPieces,
    competitorsLoading,
    setCompetitorFocusUrl,
    submitting,
    formatTypeLabel,
    hostFromUrl,
    isSeoLongform,
  };
}
