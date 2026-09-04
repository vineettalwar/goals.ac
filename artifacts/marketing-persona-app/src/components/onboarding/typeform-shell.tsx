"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ONBOARDING_STEPS,
  getStepDef,
  type OnboardingStepDef,
} from "./onboarding-contract";
import {
  computeVisibleStepIds,
  positionOf,
  totalQuestions,
  prevAnsweredStepId,
  resolveKeyAction,
} from "./onboarding-logic";
import {
  getSession,
  patchSession,
  OnboardingApiError,
  type OnboardingSessionDTO,
} from "./onboarding-api";
import type { OnboardingAnswers, OnboardingStepId } from "@workspace/db/schema/onboarding_sessions";
import { TextQuestion, UrlQuestion, ChoiceQuestion, MultiTextQuestion, KeyHint } from "./steps/basic-inputs";
import { LinkedinStep } from "./steps/linkedin-step";
import { SearchConsoleStep } from "./steps/search-console-step";
import { WordpressStep } from "./steps/wordpress-step";
import { ReviewStep } from "./steps/review-step";
import { TopicsStep } from "./steps/topics-step";
import { TerminalStep } from "./steps/terminal-step";

const EASE = [0.16, 1, 0.3, 1] as const;

type SaveState = "idle" | "saving" | "saved" | "error";

function fieldForStep(id: OnboardingStepId): keyof OnboardingAnswers | null {
  switch (id) {
    case "firm_name":
      return "orgName";
    case "vertical":
      return "vertical";
    case "website":
      return "websiteUrl";
    case "goal":
      return "goal";
    case "audience":
      return "audience";
    case "competitors":
      return "competitors";
    case "style_pitch":
      return "stylePitch";
    case "style_rivals":
      return "styleRivals";
    case "style_jargon":
      return "styleJargon";
    case "topics":
      return "topicIds";
    default:
      return null;
  }
}

export function TypeformShell() {
  const reduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [session, setSession] = useState<OnboardingSessionDTO | null>(null);
  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  const [cursor, setCursor] = useState<OnboardingStepId>("firm_name");
  const [visibleStepIds, setVisibleStepIds] = useState<OnboardingStepId[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [draftList, setDraftList] = useState<string[]>([""]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSubmittedAnswer = useRef<{ step: OnboardingStepId; answer: unknown } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { session: s, styleSufficiency: sufficiency } = await getSession();
      if (!s) throw new OnboardingApiError("No onboarding session yet.");
      setSession(s);
      setAnswers(s.answers ?? {});
      setCursor(s.currentStep);
      setVisibleStepIds(computeVisibleStepIds(s.stepStatus ?? {}, ONBOARDING_STEPS, { styleSufficiency: sufficiency ?? null }));
    } catch (err) {
      setLoadError(err instanceof OnboardingApiError ? err.message : "Could not load your onboarding session.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const currentDef = useMemo<OnboardingStepDef>(() => getStepDef(cursor), [cursor]);
  const position = useMemo(() => positionOf(visibleStepIds, cursor), [visibleStepIds, cursor]);
  const total = useMemo(() => totalQuestions(visibleStepIds), [visibleStepIds]);
  const progressPct = total > 0 ? Math.min(100, Math.round((position / total) * 100)) : 0;

  // Seed the local draft whenever the visible step changes (fresh, or re-visited for editing).
  useEffect(() => {
    const field = fieldForStep(cursor);
    if (currentDef.kind === "text" || currentDef.kind === "url") {
      setDraftText((field ? (answers[field] as string) : "") ?? "");
    } else if (currentDef.kind === "multi" && cursor === "competitors") {
      const existing = (answers.competitors as string[] | undefined) ?? [];
      setDraftList(existing.length > 0 ? existing : [""]);
    } else if (currentDef.kind === "multi" && cursor === "style_rivals") {
      // Prefill from the competitors step's answer when the firm hasn't already
      // given its own style_rivals answer -- see the comment on the step
      // definition for why this is a prefill, not a shared field.
      const existing = answers.styleRivals ?? answers.competitors ?? [];
      setDraftList(existing.length > 0 ? existing : [""]);
    }
    setHighlightedIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-seed on step change
  }, [cursor]);

  const advanceTo = useCallback((id: OnboardingStepId | null) => {
    if (!id) return;
    setDirection(1);
    setCursor(id);
  }, []);

  const submitAnswer = useCallback(
    async (payload: { answer?: unknown; status?: "done" | "skipped" }) => {
      const stepId = cursor;
      const nextLocalAnswers =
        payload.answer !== undefined
          ? { ...answers, ...(fieldForStep(stepId) ? { [fieldForStep(stepId)!]: payload.answer } : {}) }
          : answers;
      setAnswers(nextLocalAnswers);
      setSaveState("saving");
      setSaveError(null);
      lastSubmittedAnswer.current = { step: stepId, answer: payload.answer };
      try {
        const result = await patchSession({
          step: stepId,
          answer: payload.answer,
          status: payload.status ?? "done",
        });
        setSaveState("saved");
        setSession(result.session);
        // The site scan can land its verdict after the flow has started, and
        // PATCH returns the current one. Recomputing here keeps the progress
        // count and the back button on the steps the firm will actually be
        // asked, instead of the set that existed at page load.
        setVisibleStepIds(
          computeVisibleStepIds(result.session.stepStatus ?? {}, ONBOARDING_STEPS, {
            styleSufficiency: result.styleSufficiency ?? null,
          }),
        );
        advanceTo(result.nextStep);
      } catch (err) {
        setSaveState("error");
        setSaveError(err instanceof OnboardingApiError ? err.message : "Could not save that answer.");
      }
    },
    [cursor, answers, advanceTo]
  );

  const retrySave = useCallback(() => {
    if (!lastSubmittedAnswer.current) return;
    void submitAnswer({ answer: lastSubmittedAnswer.current.answer, status: "done" });
  }, [submitAnswer]);

  const goBack = useCallback(() => {
    const prev = prevAnsweredStepId(cursor, visibleStepIds);
    if (!prev) return;
    setDirection(-1);
    setCursor(prev);
  }, [cursor, visibleStepIds]);

  // Non-blocking connect/review resolution: these steps manage their own network
  // calls and just hand back the final answer to persist.
  const handleConnectResolved = useCallback(
    (value: unknown) => {
      void submitAnswer({ answer: value, status: value && (value as { mode?: string }).mode === "skipped" ? "skipped" : "done" });
    },
    [submitAnswer]
  );

  function handlePrimarySubmit() {
    switch (currentDef.kind) {
      case "text":
      case "url": {
        if (currentDef.required && !draftText.trim()) return;
        void submitAnswer({ answer: draftText.trim() || undefined, status: "done" });
        return;
      }
      case "choice": {
        const choice = currentDef.options?.[highlightedIndex];
        const existingField = fieldForStep(cursor);
        const existingValue = existingField ? (answers[existingField] as string | undefined) : undefined;
        const value = existingValue ?? choice?.value;
        if (!value) return;
        void submitAnswer({ answer: value, status: "done" });
        return;
      }
      case "multi": {
        if (cursor === "competitors" || cursor === "style_rivals") {
          const cleaned = draftList.map((v) => v.trim()).filter(Boolean).slice(0, 5);
          void submitAnswer({ answer: cleaned.length > 0 ? cleaned : undefined, status: cleaned.length > 0 ? "done" : "skipped" });
        } else if (cursor === "topics") {
          const ids = (answers.topicIds as number[] | undefined) ?? [];
          void submitAnswer({ answer: ids.length > 0 ? ids : undefined, status: ids.length > 0 ? "done" : "skipped" });
        }
        return;
      }
      case "review": {
        void submitAnswer({ status: "done" });
        return;
      }
      default:
        return;
    }
  }

  function handleChoiceSelect(value: string) {
    void submitAnswer({ answer: value, status: "done" });
  }

  function toggleTopic(id: number) {
    const current = (answers.topicIds as number[] | undefined) ?? [];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id].slice(0, 5);
    setAnswers((a) => ({ ...a, topicIds: next }));
  }

  /**
   * The keydown listener is re-subscribed only when the step changes, so anything it
   * calls has to be read through a ref rather than captured. handlePrimarySubmit reads
   * draftText, draftList, highlightedIndex and answers, all of which change on every
   * keystroke: capturing it would freeze the handler at the render where the step first
   * appeared, when the draft is still empty. Enter would then read an empty draft, hit
   * the required-field guard, and silently do nothing on every text step.
   */
  const primarySubmitRef = useRef(handlePrimarySubmit);
  const choiceSelectRef = useRef(handleChoiceSelect);
  useEffect(() => {
    primarySubmitRef.current = handlePrimarySubmit;
    choiceSelectRef.current = handleChoiceSelect;
  });

  // Global keyboard handling. Enter submits, Shift+Enter newlines in textareas,
  // digits and arrows drive choice-style screens. Escape is intentionally a no-op:
  // nothing is ever discarded by pressing it.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isMultiline = target?.tagName === "TEXTAREA";
      const isChoiceLike = currentDef.kind === "choice";
      const action = resolveKeyAction({
        key: e.key,
        shiftKey: e.shiftKey,
        isMultiline,
        isChoiceLike,
        choiceCount: currentDef.options?.length ?? 0,
      });
      if (action.type === "submit") {
        // Inputs/buttons already handle their own Enter; only intercept for
        // choice screens where no native form element owns the keystroke.
        if (isChoiceLike) {
          e.preventDefault();
          primarySubmitRef.current();
        } else if (target?.tagName === "INPUT") {
          e.preventDefault();
          primarySubmitRef.current();
        }
      } else if (action.type === "select") {
        e.preventDefault();
        const choice = currentDef.options?.[action.index];
        if (choice) choiceSelectRef.current(choice.value);
      } else if (action.type === "move") {
        e.preventDefault();
        setHighlightedIndex((i) => {
          const count = currentDef.options?.length ?? 1;
          return action.direction === "down" ? Math.min(count - 1, i + 1) : Math.max(0, i - 1);
        });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentDef]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" aria-hidden />
          Loading your onboarding…
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="paper-card flex max-w-sm flex-col items-center gap-3 p-8 text-center">
          <p className="text-foreground">{loadError}</p>
          <Button onClick={() => void load()}>Try again</Button>
        </div>
      </div>
    );
  }

  const websiteProjectId = session?.websiteProjectId ?? null;
  const variants = reduceMotion
    ? { enter: { opacity: 1, y: 0 }, center: { opacity: 1, y: 0 }, exit: { opacity: 1, y: 0 } }
    : {
        enter: (dir: 1 | -1) => ({ opacity: 0, y: dir === 1 ? 24 : -24 }),
        center: { opacity: 1, y: 0 },
        exit: (dir: 1 | -1) => ({ opacity: 0, y: dir === 1 ? -24 : 24 }),
      };

  return (
    <div className="flex min-h-screen flex-col bg-background" ref={containerRef}>
      <div className="h-1 w-full bg-secondary">
        <div
          className="h-full bg-primary transition-[width] duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 pt-6 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <Leaf className="h-3.5 w-3.5 text-primary-foreground" aria-hidden />
          </div>
          <span className="text-sm font-semibold">goals.ac</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span aria-live="polite">
            {total > 0 ? `Question ${position} of ${total}` : ""}
          </span>
          <span aria-live="polite" className="min-w-[3.5rem] text-right">
            {saveState === "saving" && "Saving…"}
            {saveState === "saved" && "Saved"}
            {saveState === "error" && (
              <button type="button" onClick={retrySave} className="text-destructive underline underline-offset-2">
                Retry save
              </button>
            )}
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-10 sm:px-6">
        {prevAnsweredStepId(cursor, visibleStepIds) && (
          <button
            type="button"
            onClick={goBack}
            className="mb-6 flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
        )}

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={cursor}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={reduceMotion ? { duration: 0 } : { duration: 0.32, ease: EASE }}
          >
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{currentDef.question}</h1>
            {currentDef.helper && <p className="mt-2 text-muted-foreground">{currentDef.helper}</p>}

            <div className="mt-8">
              {currentDef.kind === "text" && (
                <>
                  <TextQuestion
                    value={draftText}
                    onChange={setDraftText}
                    placeholder={currentDef.placeholder}
                    multiline={cursor === "audience" || cursor === "style_pitch" || cursor === "style_jargon"}
                  />
                  <KeyHint>press Enter ↵</KeyHint>
                </>
              )}
              {currentDef.kind === "url" && (
                <>
                  <UrlQuestion value={draftText} onChange={setDraftText} placeholder={currentDef.placeholder} />
                  <KeyHint>press Enter ↵</KeyHint>
                </>
              )}
              {currentDef.kind === "choice" && currentDef.options && (
                <>
                  <ChoiceQuestion
                    options={currentDef.options}
                    value={fieldForStep(cursor) ? (answers[fieldForStep(cursor)!] as string | undefined) : undefined}
                    onSelect={handleChoiceSelect}
                    highlightedIndex={highlightedIndex}
                  />
                  <KeyHint>press a number, or use ↑ ↓ then Enter ↵</KeyHint>
                </>
              )}
              {currentDef.kind === "multi" && (cursor === "competitors" || cursor === "style_rivals") && (
                <>
                  <MultiTextQuestion values={draftList} onChange={setDraftList} placeholder={currentDef.placeholder} />
                  <KeyHint>press Enter ↵ when you're done, or skip</KeyHint>
                </>
              )}
              {currentDef.kind === "multi" && cursor === "topics" && (
                <TopicsStep
                  websiteProjectId={websiteProjectId}
                  selected={(answers.topicIds as number[] | undefined) ?? []}
                  onToggle={toggleTopic}
                />
              )}
              {currentDef.kind === "connect" && cursor === "linkedin" && (
                <LinkedinStep answer={answers.linkedin} onResolved={handleConnectResolved} />
              )}
              {currentDef.kind === "connect" && cursor === "search_console" && (
                <SearchConsoleStep
                  answer={answers.searchConsole}
                  websiteProjectId={websiteProjectId}
                  onResolved={handleConnectResolved}
                />
              )}
              {currentDef.kind === "connect" && cursor === "wordpress" && (
                <WordpressStep
                  answer={answers.wordpress}
                  websiteProjectId={websiteProjectId}
                  onResolved={handleConnectResolved}
                />
              )}
              {currentDef.kind === "review" && <ReviewStep websiteProjectId={websiteProjectId} />}
              {currentDef.kind === "terminal" && <TerminalStep />}
            </div>

            {(currentDef.kind === "text" ||
              currentDef.kind === "url" ||
              (currentDef.kind === "multi" && cursor !== "topics") ||
              currentDef.kind === "review") && (
              <div className="mt-6 flex items-center gap-4">
                <Button size="lg" onClick={handlePrimarySubmit} disabled={currentDef.required && currentDef.kind !== "review" && !draftText.trim() && cursor !== "competitors"}>
                  {currentDef.kind === "review" ? "Continue" : "OK"} <ArrowRight className="h-4 w-4" />
                </Button>
                {!currentDef.required && currentDef.kind !== "review" && (
                  <button
                    type="button"
                    onClick={() => void submitAnswer({ status: "skipped" })}
                    className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    Skip
                  </button>
                )}
              </div>
            )}
            {currentDef.kind === "multi" && cursor === "topics" && (
              <div className="mt-6 flex items-center gap-4">
                <Button size="lg" onClick={handlePrimarySubmit}>
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

/** Exposed for tests and for the legacy-route redirects, which only need step order. */
export { ONBOARDING_STEPS };
