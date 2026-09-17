"use client";

import type { WizardStepId } from "./modal-types";
import type { CreateContentWizardProps } from "./wizard-props";

import { CreateContentCreatePathFormatSteps } from "./create-path-format-steps";
import { CreateContentCreateCompetitorsStep } from "./create-competitors-step";
import { CreateContentCreateKeywordSteps } from "./create-keyword-steps";

export function CreateContentCreateEarlySteps({
  currentStep,
  wizard,
}: {
  currentStep: WizardStepId;
  wizard: CreateContentWizardProps;
}) {
  return (
    <>
      <CreateContentCreatePathFormatSteps currentStep={currentStep} wizard={wizard} />
      <CreateContentCreateCompetitorsStep currentStep={currentStep} wizard={wizard} />
      <CreateContentCreateKeywordSteps currentStep={currentStep} wizard={wizard} />
    </>
  );
}
