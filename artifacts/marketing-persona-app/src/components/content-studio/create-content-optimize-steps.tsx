"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WizardStep, StepActions } from "./create-content-modal-parts";
import type { WizardStepId } from "./create-content-modal-types";
import type { CreateContentWizardProps } from "./create-content-wizard-props";

export function CreateContentOptimizeSteps({
  currentStep,
  wizard,
}: {
  currentStep: WizardStepId;
  wizard: CreateContentWizardProps;
}) {
  const {
    optimizeUrl,
    setOptimizeUrl,
    optimizeKeyword,
    setOptimizeKeyword,
    optimizeSecondary,
    setOptimizeSecondary,
    optimizePaste,
    setOptimizePaste,
    optimizeError,
    handleContinue,
    generating,
  } = wizard;

  return (
    <>
      {currentStep === "optimize-url" && (
        <WizardStep
          title="Optimize an existing page"
          subtitle="Import a live URL, score it against a keyword, fix gaps, then update WordPress (or export markdown if WP isn’t connected)."
        >
          <div className="space-y-5 mt-8 max-w-xl">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="optimize-url">
                Page URL
              </label>
              <Input
                id="optimize-url"
                type="url"
                placeholder="https://yoursite.com/blog/your-post"
                value={optimizeUrl}
                onChange={(e) => setOptimizeUrl(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="optimize-keyword">
                Primary keyword
              </label>
              <Input
                id="optimize-keyword"
                placeholder="e.g. wordpress maintenance"
                value={optimizeKeyword}
                onChange={(e) => setOptimizeKeyword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="optimize-secondary">
                Secondary keywords (optional)
              </label>
              <Input
                id="optimize-secondary"
                placeholder="Comma-separated, e.g. managed hosting, security"
                value={optimizeSecondary}
                onChange={(e) => setOptimizeSecondary(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="optimize-paste">
                Paste markdown (optional)
              </label>
              <Textarea
                id="optimize-paste"
                placeholder="If fetch fails or the page is JavaScript-rendered, paste the article body here."
                value={optimizePaste}
                onChange={(e) => setOptimizePaste(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Diagnose → Fix → Stay: import, score in Studio, Fix gaps / Humanize, publish update.
              </p>
            </div>
            {optimizeError ? (
              <p className="text-sm text-destructive" role="alert">
                {optimizeError}
              </p>
            ) : null}
            <StepActions
              onContinue={handleContinue}
              continueDisabled={!optimizeUrl.trim() || !optimizeKeyword.trim()}
              continueLabel="Import page"
            />
          </div>
        </WizardStep>
      )}

      {currentStep === "optimize-importing" && (
        <WizardStep
          title="Importing page"
          subtitle="Fetching content and opening Studio with your dual score."
        >
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-muted-foreground">
            {generating ? (
              <>
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm">Importing…</p>
              </>
            ) : (
              <>
                <RefreshCw className="w-8 h-8 text-primary" />
                <p className="text-sm">Ready</p>
                <Button type="button" onClick={handleContinue}>
                  Retry import
                </Button>
              </>
            )}
            {optimizeError ? (
              <p className="text-sm text-destructive max-w-md text-center" role="alert">
                {optimizeError}
              </p>
            ) : null}
          </div>
        </WizardStep>
      )}
    </>
  );
}
