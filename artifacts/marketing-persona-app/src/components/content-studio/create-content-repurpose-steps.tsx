"use client";

import Link from "next/link";
import {
  ArrowRight,
  Shuffle,
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
import { CreateContentFormatPicker } from "./create-content-format-picker";
import {
  CompetitorContentGaps,
  OptionCard,
  ReviewRow,
  StepActions,
  WizardStep,
} from "./create-content-modal-parts";
import {
  FORMAT_META,
  LINKEDIN_ARCHETYPES,
  LINKEDIN_HOOK_TYPES,
  type ContentFormatType,
  type LinkedInArchetypeId,
  type LinkedInHookId,
} from "./content-studio-format-data";
import type { PublishDestinationId, CmsConnectionSnapshot } from "@/lib/projects/publishing-destinations";
import { getConnectedDestinationsForFormat } from "@/lib/projects/publishing-destinations";
import { cn } from "@/lib/utils";
import { hostFromUrl } from "@workspace/content-engine/support/competitor/competitor-url";
import type { WizardStepId } from "./create-content-modal-types";


export function CreateContentRepurposeSteps({
  currentStep,
  wizard,
}: {
  currentStep: WizardStepId;
  wizard: Record<string, unknown>;
}) {
  const w = wizard as Record<string, unknown>;
  const {
    selectPath, selectFormat, loadingCompetitors, competitorUrls, competitorAnalyses,
    addCompetitorUrl, newCompetitorUrl, setNewCompetitorUrl, projectId, projectIndustry,
    keyword, setKeyword, selectedFormat, intendedDestination, setIntendedDestination,
    cmsConnections, linkedinArchetype, setLinkedinArchetype, linkedinHook, setLinkedinHook,
    angleHint, setAngleHint, plannedDate, setPlannedDate, generating, detectedSections,
    repurposeFormat, setRepurposeFormat, repurposeKeyword, setRepurposeKeyword,
    repurposeContent, setRepurposeContent, sourcePieceId, setSourcePieceId, loadSourcePiece,
    existingPieces, loadingSourcePiece, goNext, handleContinue,
    bypassCache, setBypassCache, competitorFocusUrl, setCompetitorFocusUrl,
    runGeneration,
  } = w;

  return (
    <>
              {currentStep === "repurpose-format" && (
                <WizardStep
                  title="What format do you want?"
                  subtitle="We'll adapt your source content to this format."
                >
                  <div className="grid sm:grid-cols-2 gap-3 mt-8 max-h-[min(55vh,480px)] overflow-y-auto pr-1">
                    {Object.entries(FORMAT_META).map(([value, meta]) => {
                      const Icon = meta.icon;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            setRepurposeFormat(value as ContentFormatType);
                            goNext();
                          }}
                          className={cn(
                            "text-left p-4 rounded-xl border transition-all",
                            repurposeFormat === value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/60",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className={cn("p-2 rounded-lg", meta.color)}>
                              <Icon className="w-4 h-4" />
                            </span>
                            <span className="font-medium">{meta.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </WizardStep>
              )}

              {currentStep === "repurpose-keyword" && (
                <WizardStep
                  title="What's the target keyword?"
                  subtitle={`Repurposing into a ${FORMAT_META[repurposeFormat].label.toLowerCase()}.`}
                >
                  <input
                    autoFocus
                    type="text"
                    aria-label="Target keyword"
                    value={repurposeKeyword}
                    onChange={(e) => setRepurposeKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                    className="w-full mt-10 bg-transparent border-0 border-b-2 border-border focus:border-primary text-2xl sm:text-3xl font-medium outline-none py-3 transition-colors"
                  />
                  <StepActions onContinue={handleContinue} continueDisabled={!repurposeKeyword.trim()} />
                </WizardStep>
              )}

              {currentStep === "repurpose-source" && (
                <WizardStep
                  title="Paste your source content"
                  subtitle="At least 50 characters — or load from an existing piece."
                >
                  {existingPieces.length > 0 && (
                    <div className="mt-6">
                      <Select
                        value={sourcePieceId}
                        onValueChange={(id) => void loadSourcePiece(id)}
                        disabled={loadingSourcePiece}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Load from existing piece…" />
                        </SelectTrigger>
                        <SelectContent>
                          {existingPieces.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {loadingSourcePiece && (
                        <p className="text-sm text-muted-foreground mt-2">Loading content…</p>
                      )}
                    </div>
                  )}
                  <Textarea
                    rows={8}
                    placeholder="Paste existing content here…"
                    value={repurposeContent}
                    onChange={(e) => setRepurposeContent(e.target.value)}
                    className="mt-6 text-base min-h-[200px]"
                  />
                  <StepActions
                    onContinue={handleContinue}
                    continueLabel="Repurpose"
                    continueDisabled={repurposeContent.trim().length < 50}
                  />
                </WizardStep>
              )}

              {currentStep === "repurpose-generating" && (
                <WizardStep
                  title="Repurposing your content…"
                  subtitle={`Creating a ${FORMAT_META[repurposeFormat].label.toLowerCase()}.`}
                >
                  <div className="flex items-center gap-3 mt-10 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                    <span className="text-lg">Transforming content…</span>
                  </div>
                </WizardStep>
              )}
    </>
  );
}
