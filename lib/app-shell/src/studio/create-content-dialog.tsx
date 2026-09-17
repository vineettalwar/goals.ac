export type {
  BriefDraftSource,
  CreateCompetitorOption,
  CreateContentDraftInput,
  CreateContentInitialValues,
  CreateGeneratingPhase,
  CreateSourcePieceOption,
  RepurposeContentInput,
} from "./create-content-types";
export { briefToCreateContentInitialValues } from "./create-content-types";

import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { CreateContentDialogSteps } from "./create-content-dialog-steps";
import type { LoopStepEvent } from "./loop-step-progress";
import {
  useCreateContentDialog,
  type CreateContentDialogProps,
} from "./use-create-content-dialog";

/**
 * Compact create/repurpose wizard shared by Vite Studio.
 *
 * Wave 5.B.1: Next.js `CreateContentModal` is the rich SSOT for the canonical
 * product. This dialog stays format-list-aligned with `STUDIO_FORMAT_OPTIONS`
 * (includes Bluesky/Mastodon) so Vite parity does not diverge on formats.
 */
export function CreateContentDialog({
  open,
  onClose,
  generatingHeadings = null,
  loopSteps = [],
  loopRunning = false,
  error = null,
  ...hookProps
}: CreateContentDialogProps & {
  generatingHeadings?: string[] | null;
  loopSteps?: LoopStepEvent[];
  loopRunning?: boolean;
}) {
  const d = useCreateContentDialog({ open, onClose, error, ...hookProps });
  if (!open) return null;

  const {
    submitting,
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
    formatTypeLabel,
    hostFromUrl,
    isSeoLongform,
  } = d;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Close dialog"
        onClick={() => !submitting && onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-content-title"
        className="paper-card relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-xl flex-col overflow-hidden"
      >
        <div className="h-1 w-full shrink-0 bg-muted">
          <div
            className="h-full origin-left bg-primary transition-transform duration-300 ease-out"
            style={{ transform: `scaleX(${showGenerating ? 1 : progress / 100})` }}
          />
        </div>

        <header className="flex items-center justify-between gap-2 border-b border-border px-6 py-4">
          <div className="min-w-18 items-center flex">
            {stepIndex > 0 && !showGenerating ? (
              <button
                type="button"
                onClick={goBack}
                disabled={submitting}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            ) : null}
          </div>
          <p className="text-xs tabular-nums text-muted-foreground">
            {showGenerating ? "Generating" : `Step ${stepIndex + 1} of ${steps.length}`}
          </p>
          <div className="min-w-18" />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <h2 id="create-content-title" className="text-xl font-semibold tracking-tight">
            {stepTitle}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{stepSubtitle}</p>

          <CreateContentDialogSteps
            showGenerating={showGenerating}
            currentStep={currentStep}
            generatingLabelIndex={generatingLabelIndex}
            generatingHeadings={generatingHeadings}
            loopSteps={loopSteps}
            loopRunning={loopRunning}
            submitting={submitting}
            flow={flow}
            onSelectCreate={() => {
              setFlow("create");
              setStepIndex(1);
            }}
            onSelectRepurpose={() => {
              setFlow("repurpose");
              setFormatType("linkedin_post");
              setStepIndex(1);
            }}
            formatType={formatType}
            formatOptions={formatOptions}
            onFormatSelect={handleFormatSelect}
            isLinkedIn={isLinkedIn}
            targetKeyword={targetKeyword}
            onChangeKeyword={setTargetKeyword}
            onEnterNext={goNext}
            angleHint={angleHint}
            onChangeAngleHint={setAngleHint}
            title={title}
            onChangeTitle={setTitle}
            linkedinArchetype={linkedinArchetype}
            onChangeArchetype={setLinkedinArchetype}
            linkedinHook={linkedinHook}
            onChangeHook={setLinkedinHook}
            existingPieces={existingPieces}
            sourcePieceId={sourcePieceId}
            onSelectSourcePiece={(id) => void selectSourcePiece(id)}
            loadingSourcePiece={loadingSourcePiece}
            sourceContent={sourceContent}
            onChangeSourceContent={setSourceContent}
            competitorsLoading={competitorsLoading}
            sessionCompetitorUrls={sessionCompetitorUrls}
            focusCompetitorUrl={focusCompetitorUrl}
            competitorMeta={competitorMeta}
            onToggleFocus={(url) =>
              setCompetitorFocusUrl(
                hostFromUrl(focusCompetitorUrl ?? "") === hostFromUrl(url) ? "" : url,
              )
            }
            newCompetitorUrl={newCompetitorUrl}
            onChangeNewUrl={setNewCompetitorUrl}
            onAddCompetitor={addQuickCompetitor}
            onUpdateCompetitor={updateQuickCompetitor}
            onRemoveCompetitor={removeQuickCompetitor}
            destinations={destinations}
            intendedPublishPlatform={intendedPublishPlatform}
            onSelectDestination={setIntendedPublishPlatform}
            selectedDestinationLabel={selectedDestinationLabel}
            plannedDate={plannedDate}
            onChangePlannedDate={setPlannedDate}
            error={error}
          />
        </div>

        <footer className="flex shrink-0 justify-end gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary disabled:opacity-50"
          >
            Cancel
          </button>
          {showGenerating ? (
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground opacity-50"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating…
            </button>
          ) : currentStep === "review" ? (
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={
                submitting ||
                !targetKeyword.trim() ||
                (flow === "repurpose" && sourceContent.trim().length < MIN_REPURPOSE_CHARS)
              }
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              {flow === "repurpose"
                ? `Repurpose → ${formatTypeLabel(formatType)}`
                : `Generate ${formatTypeLabel(formatType)}`}
            </button>
          ) : currentStep === "path" ? (
            <button
              type="button"
              onClick={() => setStepIndex(1)}
              disabled={submitting}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={
                submitting ||
                (currentStep === "keyword" && !targetKeyword.trim()) ||
                (currentStep === "source" && sourceContent.trim().length < MIN_REPURPOSE_CHARS)
              }
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {currentStep === "competitors" ||
              currentStep === "destination" ||
              currentStep === "source"
                ? "Continue"
                : "Next"}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
