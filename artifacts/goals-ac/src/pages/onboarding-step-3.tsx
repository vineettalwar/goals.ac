import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Globe, CheckCircle2, ArrowRight, Map, FileText, ChevronRight } from "lucide-react";

export function OnboardingStep3(props: Record<string, unknown>) {
    const {
    step1Form, project, brandFields, setBrandFields, isSavingBrand, selectedTone, setSelectedTone,
    wordCount, setWordCount, language, setLanguage, isSavingStyle, roadmapSlug, roadmapLoading,
    TONES, LANGUAGES, onStep1Submit, onStep2Submit, onStep3Submit, completeWizard,
  } = props as Record<string, unknown> as never;

  return (
<div>
              <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight mb-2">Set your content style</h1>
                <p className="text-muted-foreground">These preferences shape how all AI-generated content reads.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="block text-sm font-medium mb-3">Writing tone</p>
                  <div className="grid grid-cols-2 gap-2">
                    {TONES.map((t) => (
                      <button type="button"
                        key={t.value}
                        onClick={() => setSelectedTone(t.value)}
                        className={`rounded-lg border p-3 text-left transition-all
                          ${selectedTone === t.value
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:border-primary/40 hover:bg-muted/50"
                          }`}
                      >
                        <div className="font-medium text-sm">{t.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="onboarding-word-count" className="block text-sm font-medium mb-1.5">
                    Target word count — <span className="text-primary">{wordCount.toLocaleString()} words</span>
                  </label>
                  <input
                    id="onboarding-word-count"
                    type="range"
                    min={300}
                    max={3000}
                    step={100}
                    value={wordCount}
                    onChange={(e) => setWordCount(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>300</span>
                    <span>1,500</span>
                    <span>3,000</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="onboarding-language" className="block text-sm font-medium mb-1.5">Primary language</label>
                  <select
                    id="onboarding-language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                <Button
                  className="w-full bg-linear-to-r from-blue-500 to-blue-600 border-0 text-white gap-2"
                  disabled={isSavingStyle}
                  onClick={onStep3Confirm}
                >
                  {isSavingStyle ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  ) : (
                    <>Finish setup <ChevronRight className="w-4 h-4" /></>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4 — Done */}
  );
}
