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
  Shuffle,
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
import {
  FORMAT_META,
  FORMAT_CATEGORIES,
  LINKEDIN_ARCHETYPES,
  LINKEDIN_HOOK_TYPES,
  type ContentFormatType,
} from "./content-studio-format-data";
import { getConnectedDestinationsForFormat } from "@/lib/projects/publishing-destinations";
import { cn } from "@/lib/utils";
import { hostFromUrl } from "@workspace/content-engine/support/competitor/competitor-url";
import type { WizardStepId } from "./create-content-modal-types";
import type { CreateContentWizardProps } from "./create-content-wizard-props";
export function CreateContentCreatePathFormatSteps({ currentStep, wizard }: { currentStep: WizardStepId; wizard: CreateContentWizardProps }) {
  const {
    selectPath, selectFormat, loadingCompetitors, competitorUrls, competitorAnalyses,
    addCompetitorUrl, newCompetitorUrl, setNewCompetitorUrl, projectId, projectIndustry,
    keyword, setKeyword, selectedFormat, intendedDestination, setIntendedDestination,
    cmsConnections, linkedinArchetype, setLinkedinArchetype, linkedinHook, setLinkedinHook,
    handleContinue, competitorFocusUrl, setCompetitorFocusUrl,
  } = wizard;

  return (
    <>
              {currentStep === "path" && (
                <WizardStep
                  title="What would you like to create?"
                  subtitle="Start fresh or transform something you already have."
                >
                  <div className="grid sm:grid-cols-2 gap-4 mt-10">
                    <OptionCard
                      icon={<Sparkles className="w-6 h-6" />}
                      title="Create new content"
                      description="Pick a format and generate from a keyword or brief."
                      onClick={() => selectPath("create")}
                    />
                    <OptionCard
                      icon={<Shuffle className="w-6 h-6" />}
                      title="Repurpose existing"
                      description="Convert an article or post into a different format."
                      onClick={() => selectPath("repurpose")}
                    />
                  </div>
                </WizardStep>
              )}

              {currentStep === "format" && (
                <WizardStep
                  title="Choose a content format"
                  subtitle="Each format is tuned for length, structure, and channel."
                >
                  <div className="space-y-8 mt-8 max-h-[min(60vh,520px)] overflow-y-auto pr-1">
                    {FORMAT_CATEGORIES.map((cat) => (
                      <div key={cat.label}>
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3">
                          {cat.label}
                        </p>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {cat.formats.map((type) => {
                            const meta = FORMAT_META[type];
                            const Icon = meta.icon;
                            return (
                              <button
                                key={type}
                                type="button"
                                onClick={() => selectFormat(type)}
                                className="group text-left p-4 rounded-xl border border-border hover:border-primary hover:bg-accent/40 transition-all"
                              >
                                <div className="flex items-start gap-3">
                                  <span className={cn("p-2 rounded-lg shrink-0", meta.color)}>
                                    <Icon className="w-4 h-4" />
                                  </span>
                                  <div className="min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-medium">{meta.label}</span>
                                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                        {meta.wordRange}
                                      </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                      {meta.description}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </WizardStep>
              )}

    </>
  );
}
