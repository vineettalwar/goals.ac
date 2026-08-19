"use client";

import Link from "next/link";
import {
  ArrowRight,
  Loader2,
  CheckCircle2,
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
import { getConnectedDestinationsForFormat } from "@/lib/projects/publishing-destinations";
import { cn } from "@/lib/utils";
import { hostFromUrl } from "@workspace/content-engine/support/competitor/competitor-url";
import type { WizardStepId } from "./create-content-modal-types";
import type { CreateContentWizardProps } from "./create-content-wizard-props";
export function CreateContentCreateLateSteps({ currentStep, wizard }: { currentStep: WizardStepId; wizard: CreateContentWizardProps }) {
  const {
    selectPath, selectFormat, loadingCompetitors, competitorUrls, competitorAnalyses,
    addCompetitorUrl, newCompetitorUrl, setNewCompetitorUrl, projectId, projectIndustry,
    keyword, setKeyword, selectedFormat, intendedDestination, setIntendedDestination,
    cmsConnections, linkedinArchetype, setLinkedinArchetype, linkedinHook, setLinkedinHook,
    angleHint, setAngleHint, contentSection, setContentSection, editorNotes, setEditorNotes,
    sourceUrlsInput, setSourceUrlsInput, suggestedSections, plannedDate, setPlannedDate, generating, detectedSections,
    handleContinue, bypassCache, setBypassCache, competitorFocusUrl, setCompetitorFocusUrl,
    showBedrockModelPicker, bedrockModel, setBedrockModel, saveBedrockModel, setSaveBedrockModel,
    canManageBedrockModel,
  } = wizard;

  return (
    <>
              {currentStep === "angle" && (
                <WizardStep
                  title="Add section, notes, and sources"
                  subtitle="News requires at least one source URL."
                >
                  <div className="mt-6 space-y-3">
                    <label className="text-sm font-medium">Section</label>
                    <Input
                      list="suggested-sections"
                      placeholder="News"
                      value={contentSection}
                      onChange={(e) => setContentSection(e.target.value)}
                    />
                    <datalist id="suggested-sections">
                      {suggestedSections.map((section) => (
                        <option key={section} value={section} />
                      ))}
                    </datalist>
                  </div>
                  <Textarea
                    autoFocus
                    rows={4}
                    placeholder="Editor notes: audience, tone, claim focus..."
                    value={editorNotes || angleHint}
                    onChange={(e) => {
                      setEditorNotes(e.target.value);
                      setAngleHint(e.target.value);
                    }}
                    className="mt-4 min-h-30 resize-none text-lg"
                  />
                  <Textarea
                    rows={3}
                    placeholder="Source URLs (one per line or comma-separated)"
                    value={sourceUrlsInput}
                    onChange={(e) => setSourceUrlsInput(e.target.value)}
                    className="mt-4 min-h-25 resize-none text-sm"
                  />
                  <StepActions onContinue={handleContinue} onSkip={handleContinue} />
                </WizardStep>
              )}

              {currentStep === "planned-date" && (
                <WizardStep
                  title="When do you plan to publish?"
                  subtitle="Optional — adds it to your content calendar."
                >
                  <Input
                    autoFocus
                    type="date"
                    value={plannedDate}
                    onChange={(e) => setPlannedDate(e.target.value)}
                    className="mt-8 h-14 text-lg max-w-xs"
                  />
                  <StepActions onContinue={handleContinue} onSkip={handleContinue} />
                </WizardStep>
              )}

              {currentStep === "review" && selectedFormat && (
                <WizardStep
                  title="Ready to generate?"
                  subtitle="Review your choices, then we'll write your content."
                >
                  <div className="mt-8 rounded-2xl border border-border bg-muted/30 divide-y divide-border">
                    <ReviewRow label="Format" value={FORMAT_META[selectedFormat].label} />
                    <ReviewRow label="Keyword" value={keyword.trim()} />
                    {competitorUrls.length > 0 ? (
                      <ReviewRow
                        label="Competitors"
                        value={
                          competitorFocusUrl
                            ? `${hostFromUrl(competitorFocusUrl)} (primary) · ${competitorUrls.length} tracked`
                            : `${competitorUrls.length} tracked`
                        }
                      />
                    ) : null}
                    {intendedDestination ? (
                      <ReviewRow
                        label="Destination"
                        value={
                          getConnectedDestinationsForFormat(selectedFormat, cmsConnections).find(
                            (d) => d.id === intendedDestination,
                          )?.label ?? intendedDestination
                        }
                      />
                    ) : null}
                    {linkedinArchetype ? (
                      <ReviewRow
                        label="Archetype"
                        value={
                          LINKEDIN_ARCHETYPES.find((a) => a.id === linkedinArchetype)?.label ??
                          linkedinArchetype
                        }
                      />
                    ) : null}
                    {linkedinHook ? (
                      <ReviewRow
                        label="Hook"
                        value={
                          LINKEDIN_HOOK_TYPES.find((h) => h.id === linkedinHook)?.label ??
                          linkedinHook
                        }
                      />
                    ) : null}
                    {contentSection.trim() ? <ReviewRow label="Section" value={contentSection.trim()} /> : null}
                    {(editorNotes.trim() || angleHint.trim()) ? (
                      <ReviewRow label="Instructions" value={(editorNotes || angleHint).trim()} />
                    ) : null}
                    {sourceUrlsInput.trim() ? <ReviewRow label="Sources" value={sourceUrlsInput.trim()} /> : null}
                    {plannedDate ? <ReviewRow label="Planned date" value={plannedDate} /> : null}
                    {showBedrockModelPicker && bedrockModel.trim() ? (
                      <ReviewRow label="Bedrock model" value={bedrockModel.trim()} />
                    ) : null}
                  </div>

                  {showBedrockModelPicker ? (
                    <div className="mt-6 space-y-3">
                      <label className="block text-sm font-medium" htmlFor="create-bedrock-model">
                        Bedrock model
                      </label>
                      <Input
                        id="create-bedrock-model"
                        value={bedrockModel}
                        onChange={(e) => setBedrockModel(e.target.value)}
                        placeholder="amazon.nova-lite-v1:0"
                        className="font-mono text-sm max-w-lg"
                        autoComplete="off"
                      />
                      <p className="text-xs text-muted-foreground">
                        Overrides the org default for this generation.
                        {canManageBedrockModel
                          ? " Check the box below to also save it as the org default."
                          : ""}
                      </p>
                      {canManageBedrockModel ? (
                        <label className="flex items-center gap-3 text-sm text-muted-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={saveBedrockModel}
                            onChange={(e) => setSaveBedrockModel(e.target.checked)}
                            className="rounded"
                          />
                          Save as organization Bedrock model
                        </label>
                      ) : null}
                    </div>
                  ) : null}

                  <label className="flex items-center gap-3 mt-6 text-sm text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bypassCache}
                      onChange={(e) => setBypassCache(e.target.checked)}
                      className="rounded"
                    />
                    Bypass cache (force fresh generation)
                  </label>

                  <div className="mt-8">
                    <Button size="lg" onClick={handleContinue} disabled={!keyword.trim()} className="gap-2">
                      <FileText className="w-4 h-4" />
                      Generate {FORMAT_META[selectedFormat].label}
                    </Button>
                  </div>
                </WizardStep>
              )}

              {currentStep === "generating" && selectedFormat && (
                <WizardStep
                  title={`Writing your ${FORMAT_META[selectedFormat].label}…`}
                  subtitle={`Target: ${keyword.trim()} · ${FORMAT_META[selectedFormat].wordRange}`}
                >
                  <div className="mt-10 space-y-3">
                    {detectedSections.length === 0 ? (
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                        <span className="text-lg">Starting generation…</span>
                      </div>
                    ) : (
                      detectedSections.map((sec) => {
                        const isLast = sec === detectedSections[detectedSections.length - 1];
                        return (
                          <div
                            key={sec}
                            className={cn(
                              "flex items-center gap-3 text-lg",
                              isLast ? "text-foreground font-medium" : "text-muted-foreground",
                            )}
                          >
                            {isLast ? (
                              <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                            )}
                            {sec}
                          </div>
                        );
                      })
                    )}
                  </div>
                </WizardStep>
              )}


    </>
  );
}
