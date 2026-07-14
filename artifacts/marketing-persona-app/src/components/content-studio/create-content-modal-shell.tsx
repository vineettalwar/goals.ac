"use client";

import { ArrowLeft, X } from "lucide-react";
import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateContentCreateSteps } from "./create-content-create-steps";
import { CreateContentRepurposeSteps } from "./create-content-repurpose-steps";
import type { WizardStepId } from "./create-content-modal-types";

import type { CreateContentWizardProps } from "./create-content-wizard-props";

export function CreateContentModalShell({
  open,
  handleClose,
  generating,
  stepIndex,
  steps,
  currentStep,
  progress,
  isGeneratingStep,
  goBack,
  wizardProps,
}: {
  open: boolean;
  handleClose: () => void;
  generating: boolean;
  stepIndex: number;
  steps: WizardStepId[];
  currentStep: WizardStepId;
  progress: number;
  isGeneratingStep: boolean;
  goBack: () => void;
  wizardProps: CreateContentWizardProps;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !generating) handleClose();
      }}
    >
      <DialogContent
        fullscreen
        hideClose
        onEscapeKeyDown={(e) => {
          if (generating) e.preventDefault();
        }}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Create new content</DialogTitle>
        <DialogDescription className="sr-only">
          Step-by-step wizard to create or repurpose content
        </DialogDescription>

        <LazyMotion features={domAnimation} strict>
          <div className="flex flex-col h-full min-h-0">
            <div className="h-1 w-full bg-muted shrink-0">
              <m.div
                className="h-full w-full origin-left bg-primary"
                initial={false}
                animate={{ scaleX: progress / 100 }}
                transition={
                  prefersReducedMotion ? { duration: 0 } : { duration: 0.35, ease: "easeOut" }
                }
              />
            </div>

            <header className="flex items-center justify-between px-4 sm:px-8 py-4 shrink-0">
              <div className="flex items-center gap-3 min-w-[80px]">
                {stepIndex > 0 && !isGeneratingStep ? (
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Back</span>
                  </button>
                ) : null}
              </div>

              <p className="text-xs text-muted-foreground tabular-nums">
                {isGeneratingStep ? "Generating" : `Step ${stepIndex + 1} of ${steps.length}`}
              </p>

              <button
                type="button"
                onClick={handleClose}
                disabled={generating}
                className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <main className="flex-1 overflow-y-auto px-4 sm:px-8 pb-8">
              <div className="max-w-3xl mx-auto min-h-full flex flex-col justify-center py-8 sm:py-12">
                <AnimatePresence mode="wait">
                  <m.div
                    key={currentStep}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={prefersReducedMotion ? undefined : { opacity: 0, y: -12 }}
                    transition={
                      prefersReducedMotion ? { duration: 0 } : { duration: 0.28, ease: "easeOut" }
                    }
                    className="w-full"
                  >
                    {currentStep.startsWith("repurpose") ? (
                      <CreateContentRepurposeSteps currentStep={currentStep} wizard={wizardProps} />
                    ) : (
                      <CreateContentCreateSteps currentStep={currentStep} wizard={wizardProps} />
                    )}
                  </m.div>
                </AnimatePresence>
              </div>
            </main>
          </div>
        </LazyMotion>
      </DialogContent>
    </Dialog>
  );
}
