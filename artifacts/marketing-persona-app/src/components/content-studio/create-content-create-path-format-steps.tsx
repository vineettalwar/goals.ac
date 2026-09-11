"use client";

import { FileText, Shuffle, RefreshCw, Zap } from "lucide-react";
import { OptionCard, WizardStep } from "./create-content-modal-parts";
import { CreateContentFormatPicker } from "./create-content-format-picker";
import type { WizardStepId } from "./create-content-modal-types";
import type { CreateContentWizardProps } from "./create-content-wizard-props";

export function CreateContentCreatePathFormatSteps({
  currentStep,
  wizard,
}: {
  currentStep: WizardStepId;
  wizard: CreateContentWizardProps;
}) {
  const { selectPath, selectCreatePace, selectFormat } = wizard;

  return (
    <>
      {currentStep === "path" && (
        <WizardStep
          title="What would you like to create?"
          subtitle="Express is format + keyword. Full adds competitors, angle, and schedule."
        >
          <div className="grid sm:grid-cols-2 gap-4 mt-10">
            <OptionCard
              icon={<Zap className="w-6 h-6" />}
              title="Express create"
              description="Format, keyword, review, generate. Defaults for destination and angle."
              onClick={() => selectCreatePace("express")}
            />
            <OptionCard
              icon={<FileText className="w-6 h-6" />}
              title="Full create"
              description="Competitors, angle, planned date, and destination before generate."
              onClick={() => selectCreatePace("full")}
            />
            <OptionCard
              icon={<Shuffle className="w-6 h-6" />}
              title="Repurpose existing"
              description="Convert an article or post into a different format."
              onClick={() => selectPath("repurpose")}
            />
            <OptionCard
              icon={<RefreshCw className="w-6 h-6" />}
              title="Optimize page"
              description="Import a live URL, score it, fix gaps, and update WordPress."
              onClick={() => selectPath("optimize")}
            />
          </div>
        </WizardStep>
      )}

      {currentStep === "format" && (
        <WizardStep
          title="Choose a content format"
          subtitle="Each format is tuned for length, structure, and channel."
        >
          <CreateContentFormatPicker onSelect={selectFormat} />
        </WizardStep>
      )}
    </>
  );
}
