"use client";

import type { WizardStepId } from "./create-content-modal-types";
import type { CreateContentWizardProps } from "./create-content-wizard-props";

import { CreateContentCreatePathFormatSteps } from "./create-content-create-path-format-steps";
import { CreateContentCreateCompetitorsStep } from "./create-content-create-competitors-step";
import { CreateContentCreateKeywordSteps } from "./create-content-create-keyword-steps";

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
