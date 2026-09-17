"use client";

import type { WizardStepId } from "./modal-types";
import type { CreateContentWizardProps } from "./wizard-props";

import { CreateContentCreateEarlySteps } from "./create-early-steps";
import { CreateContentCreateLateSteps } from "./create-late-steps";

export function CreateContentCreateSteps({
  currentStep,
  wizard,
}: {
  currentStep: WizardStepId;
  wizard: CreateContentWizardProps;
}) {
  return (
    <>
      <CreateContentCreateEarlySteps currentStep={currentStep} wizard={wizard} />
      <CreateContentCreateLateSteps currentStep={currentStep} wizard={wizard} />
    </>
  );
}
