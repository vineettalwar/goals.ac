"use client";

import type { WizardStepId } from "./create-content-modal-types";
import type { CreateContentWizardProps } from "./create-content-wizard-props";

import { CreateContentCreateEarlySteps } from "./create-content-create-early-steps";
import { CreateContentCreateLateSteps } from "./create-content-create-late-steps";

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
