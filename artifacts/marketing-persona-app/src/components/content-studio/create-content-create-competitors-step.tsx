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
export function CreateContentCreateCompetitorsStep({ currentStep, wizard }: { currentStep: WizardStepId; wizard: CreateContentWizardProps }) {
  const {
    selectPath, selectFormat, loadingCompetitors, competitorUrls, competitorAnalyses,
    addCompetitorUrl, newCompetitorUrl, setNewCompetitorUrl, projectId, projectIndustry,
    keyword, setKeyword, selectedFormat, intendedDestination, setIntendedDestination,
    cmsConnections, linkedinArchetype, setLinkedinArchetype, linkedinHook, setLinkedinHook,
    handleContinue, competitorFocusUrl, setCompetitorFocusUrl,
  } = wizard;

  return (
    <>
              {currentStep === "competitors" && (
                <WizardStep
                  title="Review your competitive landscape"
                  subtitle="Competitors are managed at the project level. Optionally pick who to differentiate against for this piece."
                >
                  {loadingCompetitors ? (
                    <div className="flex items-center gap-3 mt-10 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Loading competitor context…
                    </div>
                  ) : (
                    <div className="mt-8 space-y-6">
                      {competitorUrls.length === 0 ? (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex gap-3">
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-sm text-muted-foreground">
                            No competitors on file for this project yet. Add them in Brand settings or
                            quick-add one below before planning content.
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Tap a competitor to set the primary focus for this piece (optional).
                        </p>
                      )}

                      <div className="space-y-3">
                        {competitorUrls.map((url) => {
                          const analysis = competitorAnalyses.find(
                            (a) => hostFromUrl(a.competitorUrl) === hostFromUrl(url),
                          );
                          const isFocus = competitorFocusUrl === url;
                          return (
                            <button
                              key={url}
                              type="button"
                              onClick={() => setCompetitorFocusUrl(isFocus ? "" : url)}
                              className={cn(
                                "w-full text-left rounded-xl border p-4 transition-all",
                                isFocus ? "border-primary bg-primary/5" : "border-border hover:border-primary/60",
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                                <span className="font-medium truncate">
                                  {analysis?.competitorName ?? hostFromUrl(url)}
                                </span>
                                {analysis ? (
                                  <span
                                    className={cn(
                                      "text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded",
                                      analysis.threatLevel === "high"
                                        ? "bg-destructive/10 text-destructive"
                                        : analysis.threatLevel === "medium"
                                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                          : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                                    )}
                                  >
                                    {analysis.threatLevel} threat
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">Not analyzed</span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 truncate">{url}</p>
                              {isFocus ? (
                                <p className="text-xs text-primary mt-2">Primary competitor for this piece</p>
                              ) : null}
                              {analysis && analysis.contentGaps.length > 0 ? (
                                <div className="mt-3 pt-3 border-t border-border/60">
                                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Content gaps</p>
                                  <ul className="text-sm text-muted-foreground space-y-1">
                                    {analysis.contentGaps.slice(0, 3).map((gap) => (
                                      <li key={gap} className="flex gap-2">
                                        <span className="text-primary shrink-0">·</span>
                                        <span>{gap}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex gap-2">
                        <Input
                          placeholder="Quick-add competitor URL"
                          value={newCompetitorUrl}
                          onChange={(e) => setNewCompetitorUrl(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addCompetitorUrl()}
                          disabled={competitorUrls.length >= 5}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addCompetitorUrl}
                          disabled={competitorUrls.length >= 5 || !newCompetitorUrl.trim()}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm">
                        <Link
                          href={`/projects/${projectId}?tab=brand`}
                          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Manage competitors in Brand settings
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          href={`/research/competitors${projectIndustry ? `?industry=${encodeURIComponent(projectIndustry)}` : ""}`}
                          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                          target="_blank"
                        >
                          Run full competitor analysis
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  )}

                  <StepActions
                    onContinue={handleContinue}
                    onSkip={competitorUrls.length === 0 ? handleContinue : undefined}
                    skipLabel="Skip for now"
                    continueLabel="Continue"
                  />
                </WizardStep>
              )}

    </>
  );
}
