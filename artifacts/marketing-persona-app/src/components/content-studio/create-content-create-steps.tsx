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
