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
import { useAuth } from "@/context/auth";
import {
  Loader2, Globe, CheckCircle2, ArrowRight, Sparkles, FileText,
  Map, ChevronRight, Check,
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

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all
            ${i + 1 < current ? "bg-primary text-primary-foreground" : ""}
            ${i + 1 === current ? "bg-primary text-primary-foreground ring-4 ring-primary/20" : ""}
            ${i + 1 > current ? "bg-muted text-muted-foreground" : ""}`}
          >
            {i + 1 < current ? <Check className="w-4 h-4" /> : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`h-0.5 w-8 rounded transition-all ${i + 1 < current ? "bg-primary" : "bg-muted"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

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

  const safeJson = async <T,>(r: Response): Promise<T | null> => {
    try { return await r.json(); } catch { return null; }
  };

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

          {/* Step 1 — Add your website */}
          {step === 1 && (
            <div>
              <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight mb-2">Add your website</h1>
                <p className="text-muted-foreground">We'll scan your site and auto-fill your brand profile so you don't have to.</p>
              </div>
              <Form {...step1Form}>
                <form onSubmit={step1Form.handleSubmit(onStep1Submit)} className="space-y-5">
                  {step1Form.formState.errors.root && (
                    <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-500 border border-red-200 dark:border-red-500/20">
                      {step1Form.formState.errors.root.message}
                    </div>
                  )}
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

          {/* Step 2 — Brand profile review */}
          {step === 2 && (
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
                  <label className="block text-sm font-medium mb-1.5">Company name</label>
                  <Input
                    value={brandFields.companyName}
                    onChange={(e) => setBrandFields((p) => ({ ...p, companyName: e.target.value }))}
                    placeholder={isScanning ? "Scanning…" : "Acme Inc."}
                    disabled={isScanning}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Industry</label>
                  <Input
                    value={brandFields.industry}
                    onChange={(e) => setBrandFields((p) => ({ ...p, industry: e.target.value }))}
                    placeholder={isScanning ? "Scanning…" : "e.g. B2B SaaS, Fintech, E-commerce"}
                    disabled={isScanning}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Target audience</label>
                  <Textarea
                    value={brandFields.targetAudience}
                    onChange={(e) => setBrandFields((p) => ({ ...p, targetAudience: e.target.value }))}
                    placeholder={isScanning ? "Scanning…" : "e.g. SMB founders, marketing teams at Series A startups"}
                    disabled={isScanning}
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Brand voice</label>
                  <Input
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
          {step === 3 && (
            <div>
              <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight mb-2">Set your content style</h1>
                <p className="text-muted-foreground">These preferences shape how all AI-generated content reads.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-3">Writing tone</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TONES.map((t) => (
                      <button
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
                  <label className="block text-sm font-medium mb-1.5">
                    Target word count — <span className="text-primary">{wordCount.toLocaleString()} words</span>
                  </label>
                  <input
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
                  <label className="block text-sm font-medium mb-1.5">Primary language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
          {step === 4 && (
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
                    <Sparkles className="w-5 h-5 text-blue-500" />
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
          )}
        </div>
      </div>
    </div>
  );
}
