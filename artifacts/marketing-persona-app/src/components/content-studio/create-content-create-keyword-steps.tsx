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
import { FORMAT_META } from "./content-studio-format-data";
import {
  LINKEDIN_ARCHETYPES,
  LINKEDIN_HOOK_TYPES,
} from "@workspace/app-shell/studio";
import type { PublishDestinationId } from "@/lib/projects/publishing-destinations";
import { getConnectedDestinationsForFormat } from "@/lib/projects/publishing-destinations";
import { cn } from "@/lib/utils";
import type { WizardStepId } from "./create-content-modal-types";
import type { CreateContentWizardProps } from "./create-content-wizard-props";
export function CreateContentCreateKeywordSteps({ currentStep, wizard }: { currentStep: WizardStepId; wizard: CreateContentWizardProps }) {
  const {
    selectPath, selectFormat, loadingCompetitors, competitorUrls, competitorAnalyses,
    addCompetitorUrl, newCompetitorUrl, setNewCompetitorUrl, projectId, projectIndustry,
    keyword, setKeyword, selectedFormat, intendedDestination, setIntendedDestination,
    cmsConnections, linkedinArchetype, setLinkedinArchetype, linkedinHook, setLinkedinHook,
    handleContinue, competitorFocusUrl, setCompetitorFocusUrl, initialDraft, goNextStable,
  } = wizard;

  return (
    <>
              {currentStep === "keyword" && selectedFormat && (
                <WizardStep
                  title="What's your target keyword?"
                  subtitle={
                    initialDraft?.workingTitle
                      ? `From brief: ${initialDraft.workingTitle}`
                      : `Generating a ${FORMAT_META[selectedFormat].label.toLowerCase()}.`
                  }
                >
                  <div className="mt-10">
                    <input
                      autoFocus
                      type="text"
                      placeholder="e.g. local SEO for startups"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                      className="w-full bg-transparent border-0 border-b-2 border-border focus:border-primary text-2xl sm:text-3xl font-medium placeholder:text-muted-foreground/40 outline-none py-3 transition-colors"
                    />
                  </div>
                  <StepActions onContinue={handleContinue} continueDisabled={!keyword.trim()} />
                </WizardStep>
              )}

              {currentStep === "destination" && selectedFormat && (
                <WizardStep
                  title="Where will this be published?"
                  subtitle="Optional — shapes generation and pre-selects your publish destination."
                >
                  <div className="mt-10 space-y-4">
                    <Select
                      value={intendedDestination || "__none__"}
                      onValueChange={(v) =>
                        setIntendedDestination(v === "__none__" ? "" : (v as PublishDestinationId))
                      }
                    >
                      <SelectTrigger className="h-14 text-lg">
                        <SelectValue placeholder="Decide later" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Decide later</SelectItem>
                        {getConnectedDestinationsForFormat(selectedFormat, cmsConnections).map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <StepActions onContinue={handleContinue} onSkip={handleContinue} />
                </WizardStep>
              )}

              {currentStep === "linkedin-archetype" && (
                <WizardStep
                  title="Pick a content archetype"
                  subtitle="Optional — influences structure and tone for LinkedIn."
                >
                  <div className="grid sm:grid-cols-2 gap-3 mt-8">
                    {LINKEDIN_ARCHETYPES.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setLinkedinArchetype(a.id);
                          goNextStable();
                        }}
                        className={cn(
                          "text-left p-4 rounded-xl border transition-all",
                          linkedinArchetype === a.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/60 hover:bg-accent/30",
                        )}
                      >
                        <p className="font-medium">{a.label}</p>
                        <p className="text-sm text-muted-foreground mt-1">{a.description}</p>
                      </button>
                    ))}
                  </div>
                  <StepActions onContinue={handleContinue} onSkip={handleContinue} />
                </WizardStep>
              )}

              {currentStep === "linkedin-hook" && (
                <WizardStep
                  title="Choose a hook style"
                  subtitle="Optional — sets the opening line pattern."
                >
                  <div className="grid sm:grid-cols-2 gap-3 mt-8">
                    {LINKEDIN_HOOK_TYPES.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => {
                          setLinkedinHook(h.id);
                          goNextStable();
                        }}
                        className={cn(
                          "text-left p-4 rounded-xl border transition-all",
                          linkedinHook === h.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/60 hover:bg-accent/30",
                        )}
                      >
                        <p className="font-medium">{h.label}</p>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                          {h.template}
                        </p>
                      </button>
                    ))}
                  </div>
                  <StepActions onContinue={handleContinue} onSkip={handleContinue} />
                </WizardStep>
              )}

    </>
  );
}
