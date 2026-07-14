import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Globe, CheckCircle2, ArrowRight, Map, FileText, ChevronRight } from "lucide-react";

export function OnboardingStep2(props: Record<string, unknown>) {
    const {
    step1Form, project, brandFields, setBrandFields, isSavingBrand, selectedTone, setSelectedTone,
    wordCount, setWordCount, language, setLanguage, isSavingStyle, roadmapSlug, roadmapLoading,
    TONES, LANGUAGES, onStep1Submit, onStep2Submit, onStep3Submit, completeWizard,
  } = props as Record<string, unknown> as never;

  return (
<div>
              <div className="mb-8">
                {isScanning ? (
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                        <Globe className="w-5 h-5 text-blue-500 animate-pulse" />
                      </div>
                      <div>
                        <h1 className="text-2xl font-bold tracking-tight">Scanning your site…</h1>
                        <p className="text-sm text-muted-foreground">This usually takes 15–30 seconds</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5 mt-4">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      </div>
                      <h1 className="text-2xl font-bold tracking-tight">We scanned your site</h1>
                    </div>
                    <p className="text-muted-foreground">Review and edit the auto-filled brand info below.</p>
                  </>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="onboarding-company-name" className="block text-sm font-medium mb-1.5">Company name</label>
                  <Input
                    id="onboarding-company-name"
                    value={brandFields.companyName}
                    onChange={(e) => setBrandFields((p) => ({ ...p, companyName: e.target.value }))}
                    placeholder={isScanning ? "Scanning…" : "Acme Inc."}
                    disabled={isScanning}
                  />
                </div>
                <div>
                  <label htmlFor="onboarding-industry" className="block text-sm font-medium mb-1.5">Industry</label>
                  <Input
                    id="onboarding-industry"
                    value={brandFields.industry}
                    onChange={(e) => setBrandFields((p) => ({ ...p, industry: e.target.value }))}
                    placeholder={isScanning ? "Scanning…" : "e.g. B2B SaaS, Fintech, E-commerce"}
                    disabled={isScanning}
                  />
                </div>
                <div>
                  <label htmlFor="onboarding-target-audience" className="block text-sm font-medium mb-1.5">Target audience</label>
                  <Textarea
                    id="onboarding-target-audience"
                    value={brandFields.targetAudience}
                    onChange={(e) => setBrandFields((p) => ({ ...p, targetAudience: e.target.value }))}
                    placeholder={isScanning ? "Scanning…" : "e.g. SMB founders, marketing teams at Series A startups"}
                    disabled={isScanning}
                    rows={2}
                  />
                </div>
                <div>
                  <label htmlFor="onboarding-brand-voice" className="block text-sm font-medium mb-1.5">Brand voice</label>
                  <Input
                    id="onboarding-brand-voice"
                    value={brandFields.voiceTone}
                    onChange={(e) => setBrandFields((p) => ({ ...p, voiceTone: e.target.value }))}
                    placeholder={isScanning ? "Scanning…" : "e.g. Professional, data-driven, approachable"}
                    disabled={isScanning}
                  />
                </div>

                <Button
                  className="w-full bg-linear-to-r from-blue-500 to-blue-600 border-0 text-white gap-2"
                  disabled={isScanning || isSavingBrand}
                  onClick={onStep2Confirm}
                >
                  {isSavingBrand ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  ) : (
                    <>Looks good <ChevronRight className="w-4 h-4" /></>
                  )}
                </Button>
                {project?.scrapeStatus === "failed" && (
                  <p className="text-xs text-center text-muted-foreground">
                    Couldn't auto-scan (the site may block crawlers). You can fill in the details manually.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3 — Content style */}
  );
}
