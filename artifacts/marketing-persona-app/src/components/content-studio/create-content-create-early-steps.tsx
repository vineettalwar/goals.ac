"use client";

import Link from "next/link";
import {
  ArrowRight,
  Loader2,
  CheckCircle2,
  Sparkles,
  FileText,
  Plus,
  Users,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CompetitorContentGaps,
  OptionCard,
  ReviewRow,
  StepActions,
  WizardStep,
} from "./create-content-modal-parts";
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
