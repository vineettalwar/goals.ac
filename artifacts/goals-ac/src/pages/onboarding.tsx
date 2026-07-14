import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SEO } from "@/components/seo";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/use-auth";
import { safeJson } from "@/lib/safe-json";
import {
  Loader2, Globe, CheckCircle2, ArrowRight, Map, FileText,
  ChevronRight, Check,
} from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export const WIZARD_DONE_KEY = "goals_ac_wizard_done";

const step1Schema = z.object({
  name: z.string().min(1, "Project name is required"),
  url: z.string().url("Must be a valid URL (e.g., https://example.com)"),
});
type Step1Values = z.infer<typeof step1Schema>;

interface BrandProfile {
  companyName: string;
  industry: string;
  targetAudience: string;
  voiceTone: string;
}

interface Project {
  id: number;
  name: string;
  url: string;
  scrapeStatus: string | null;
  brandProfile: BrandProfile | null;
}

const TONES = [
  { value: "Professional", label: "Professional", desc: "Formal and authoritative" },
  { value: "Casual", label: "Casual", desc: "Friendly and approachable" },
  { value: "Technical", label: "Technical", desc: "Precise and detailed" },
  { value: "Conversational", label: "Conversational", desc: "Natural and engaging" },
];

const LANGUAGES = [
  "English", "Spanish", "French", "German", "Portuguese", "Italian", "Dutch", "Japanese",
];

import { StepIndicator } from "./onboarding-step-indicator";
import { OnboardingStep1 } from "./onboarding-step-1";
import { OnboardingStep2 } from "./onboarding-step-2";
import { OnboardingStep3 } from "./onboarding-step-3";
import { OnboardingStep4 } from "./onboarding-step-4";


export default function Onboarding() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [project, setProject] = useState<Project | null>(null);
  const [brandFields, setBrandFields] = useState<BrandProfile>({ companyName: "", industry: "", targetAudience: "", voiceTone: "" });
  const [isSavingBrand, setIsSavingBrand] = useState(false);
  const [selectedTone, setSelectedTone] = useState("Professional");
  const [wordCount, setWordCount] = useState(1200);
  const [language, setLanguage] = useState("English");
  const [isSavingStyle, setIsSavingStyle] = useState(false);
  const [roadmapSlug, setRoadmapSlug] = useState<string | null>(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step1Form = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: { name: "", url: "" },
  });

  const pollProject = useCallback(async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/website-projects/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await safeJson<Project>(res);
      if (!data) return;
      setProject(data);
      if (data.scrapeStatus === "done" || data.scrapeStatus === "failed") {
        if (data.brandProfile) {
          setBrandFields({
            companyName: data.brandProfile.companyName ?? "",
            industry: data.brandProfile.industry ?? "",
            targetAudience: data.brandProfile.targetAudience ?? "",
            voiceTone: data.brandProfile.voiceTone ?? "",
          });
          if (data.brandProfile.voiceTone) {
            const matchedTone = TONES.find(t => t.value.toLowerCase() === data.brandProfile!.voiceTone.toLowerCase());
            if (matchedTone) setSelectedTone(matchedTone.value);
          }
        }
        return;
      }
      pollingRef.current = setTimeout(() => pollProject(id), 2500);
    } catch {
      pollingRef.current = setTimeout(() => pollProject(id), 3000);
    }
  }, [token]);

  useEffect(() => {
    return () => { if (pollingRef.current) clearTimeout(pollingRef.current); };
  }, []);

  const generateRoadmapInBackground = useCallback(async (industry: string) => {
    if (!token) return;
    setRoadmapLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/roadmaps/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          industry: industry || "B2B SaaS",
          location: "United States",
          stage: "seed",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRoadmapSlug(data.slug ?? null);
      }
    } catch {
      // silent — step 4 falls back gracefully
    } finally {
      setRoadmapLoading(false);
    }
  }, [token]);

  const onStep1Submit = async (data: Step1Values) => {
    if (!token) return;
    const res = await fetch(`${API_BASE}/api/website-projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      step1Form.setError("root", { message: err.error ?? "Failed to create project" });
      return;
    }
    const proj: Project = await res.json();
    setProject(proj);
    setStep(2);
    pollProject(proj.id);
  };

  const onStep2Confirm = async () => {
    if (!project || !token) return;
    setIsSavingBrand(true);
    try {
      await fetch(`${API_BASE}/api/website-projects/${project.id}/brand-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(brandFields),
      });
      generateRoadmapInBackground(brandFields.industry);
      setStep(3);
    } finally {
      setIsSavingBrand(false);
    }
  };

  const onStep3Confirm = async () => {
    if (!project || !token) return;
    setIsSavingStyle(true);
    try {
      await fetch(`${API_BASE}/api/website-projects/${project.id}/brand-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          voiceTone: selectedTone,
          contentStyle: {
            tonePreset: selectedTone.toLowerCase() as "professional" | "casual" | "technical" | "conversational",
            defaultWordCount: wordCount,
            primaryLanguage: language,
          },
        }),
      });
      setStep(4);
    } finally {
      setIsSavingStyle(false);
    }
  };

  const completeWizard = () => {
    localStorage.setItem(WIZARD_DONE_KEY, "true");
    navigate("/dashboard");
  };

  const skipWizard = () => {
    localStorage.setItem(WIZARD_DONE_KEY, "true");
    navigate("/dashboard");
  };

  const isScanning = !project?.scrapeStatus || (project.scrapeStatus !== "done" && project.scrapeStatus !== "failed");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO title="Set up your workspace — goals.ac" description="Get started with goals.ac in a few quick steps." />

      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Logo size={22} />
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={skipWizard}>
          Skip setup
        </Button>
      </header>

      <div className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          <StepIndicator current={step} total={4} />

          {step === 1 && <OnboardingStep1 {...onboardingStepProps} />}
                  <FormField
                    control={step1Form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company / project name</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Inc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={step1Form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website URL</FormLabel>
                        <FormControl>
                          <Input type="url" placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full bg-linear-to-r from-blue-500 to-blue-600 border-0 text-white gap-2"
                    disabled={step1Form.formState.isSubmitting}
                  >
                    {step1Form.formState.isSubmitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</>
                    ) : (
                      <>Get started <ArrowRight className="w-4 h-4" /></>
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          )}

          {step === 2 && <OnboardingStep2 {...onboardingStepProps} />}
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

          {step === 3 && <OnboardingStep3 {...onboardingStepProps} />}
                </Button>
              </div>
            </div>
          )}

          {step === 4 && <OnboardingStep4 {...onboardingStepProps} />}
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
          )}
        </div>
      </div>
    </div>
  );
}