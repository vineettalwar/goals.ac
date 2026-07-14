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

  const onboardingStepProps = {
    step1Form,
    project,
    brandFields,
    setBrandFields,
    isSavingBrand,
    selectedTone,
    setSelectedTone,
    wordCount,
    setWordCount,
    language,
    setLanguage,
    isSavingStyle,
    roadmapSlug,
    roadmapLoading,
    TONES,
    LANGUAGES,
    onStep1Submit,
    onStep2Confirm,
    onStep3Confirm,
    completeWizard,
    isScanning,
  };

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
          {step === 2 && <OnboardingStep2 {...onboardingStepProps} />}
          {step === 3 && <OnboardingStep3 {...onboardingStepProps} />}
          {step === 4 && <OnboardingStep4 {...onboardingStepProps} />}
        </div>
      </div>
    </div>
  );
}