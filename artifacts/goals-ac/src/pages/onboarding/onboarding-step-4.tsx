import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Globe, CheckCircle2, ArrowRight, Map, FileText, ChevronRight } from "lucide-react";
import { WIZARD_DONE_KEY } from ".";

import type { OnboardingStepProps } from "./onboarding-step-props";

export function OnboardingStep4(props: OnboardingStepProps) {
  const { project, roadmapSlug, roadmapLoading, completeWizard } = props;

  return (
<div>
              <div className="mb-8">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight mb-2">Your workspace is ready!</h1>
                <p className="text-muted-foreground">Here are a few great places to start.</p>
              </div>

              <div className="space-y-3 mb-8">
                {/* Roadmap card */}
                <div className="rounded-xl border border-border p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <Map className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">Growth roadmap</div>
                    <div className="text-xs text-muted-foreground">AI-generated 12-month strategy</div>
                  </div>
                  {roadmapLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
                  ) : roadmapSlug ? (
                    <Link to={`/roadmap/${roadmapSlug}`} onClick={() => localStorage.setItem(WIZARD_DONE_KEY, "true")}>
                      <Button size="sm" variant="outline" className="gap-1 shrink-0">
                        View <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  ) : (
                    <Link to="/" onClick={() => localStorage.setItem(WIZARD_DONE_KEY, "true")}>
                      <Button size="sm" variant="outline" className="gap-1 shrink-0">
                        Generate <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  )}
                </div>

                {/* SEO article */}
                {project && (
                  <Link
                    to={`/projects/${project.id}/content-studio`}
                    onClick={() => localStorage.setItem(WIZARD_DONE_KEY, "true")}
                    className="flex rounded-xl border border-border p-4 items-center gap-4 hover:bg-muted/40 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-violet-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">Generate SEO article</div>
                      <div className="text-xs text-muted-foreground">Content Studio — keyword-targeted pieces</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </Link>
                )}

                {/* GEO audit */}
                <Link
                  to="/geo-audit"
                  onClick={() => localStorage.setItem(WIZARD_DONE_KEY, "true")}
                  className="flex rounded-xl border border-border p-4 items-center gap-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <Map className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">Run GEO audit</div>
                    <div className="text-xs text-muted-foreground">Generative engine optimisation analysis</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </Link>
              </div>

              <Button
                className="w-full bg-linear-to-r from-blue-500 to-blue-600 border-0 text-white gap-2"
                onClick={completeWizard}
              >
                Go to dashboard <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
  );
}
