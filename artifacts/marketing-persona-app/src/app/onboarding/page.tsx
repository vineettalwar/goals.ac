"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Leaf } from "lucide-react";
import { StepIndicator } from "@/components/onboarding/step-indicator";
import { readRoadmapIntent } from "@/lib/projects/roadmap-intent";
import {
  readAutopilotIntent,
  postAutopilotOnboardingRedirect,
} from "@/lib/projects/autopilot-intent";
import { schema, type FormData, type GoalIntent } from "./onboarding-schema";
import {
  OnboardingCompanyForm,
  OnboardingFastLaneForm,
  OnboardingGoalStep,
} from "./onboarding-step-forms";

export default function OnboardingPage() {
  const router = useRouter();
  const { update } = useSession();
  const autopilotIntent = readAutopilotIntent();
  const isFastLane = Boolean(autopilotIntent);

  useEffect(() => {
    if (!isFastLane) router.prefetch("/onboarding/personas");
  }, [router, isFastLane]);

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [goalIntent, setGoalIntent] = useState<GoalIntent>({ objective: "traffic", targetMetric: "" });
  const [competitors, setCompetitors] = useState<string[]>([""]);
  const [language, setLanguage] = useState("en");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: autopilotIntent
      ? {
          websiteUrl: autopilotIntent.websiteUrl,
          name: new URL(autopilotIntent.websiteUrl).hostname.replace(/^www\./, ""),
          industry: "Other",
          description: "Growing organic traffic with SEO content on autopilot.",
          targetAudience: "Customers searching for our products and services online.",
        }
      : undefined,
  });

  function addCompetitor() {
    if (competitors.length < 5) setCompetitors([...competitors, ""]);
  }

  function updateCompetitor(i: number, value: string) {
    const next = [...competitors];
    next[i] = value;
    setCompetitors(next);
  }

  function removeCompetitor(i: number) {
    setCompetitors(competitors.filter((_, idx) => idx !== i));
  }

  async function onSubmit(data: FormData) {
    setLoading(true);
    const validCompetitors = competitors.filter((u) => u.trim().length > 0);

    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, competitorUrls: validCompetitors, primaryLanguage: language }),
    });

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Failed to save" }));
      toast.error(error ?? "Failed to save company");
      setLoading(false);
      return;
    }

    const { company, organizationId } = await res.json();
    await update({
      companyId: company.id,
      organizationId: organizationId ?? null,
      orgRole: "site_admin",
    });

    if (readRoadmapIntent()) {
      const projectRes = await fetch("/api/website-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, url: data.websiteUrl, contentStyle: { primaryLanguage: language } }),
      }).catch(() => null);

      if (projectRes?.ok) {
        const { project } = (await projectRes.json()) as { project: { id: number } };
        await fetch("/api/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project.id,
            objective: goalIntent.objective,
            targetMetric: goalIntent.targetMetric,
            status: "active",
          }),
        }).catch(() => {});
      }
    }

    if (isFastLane) {
      const projectRes = await fetch("/api/website-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          url: data.websiteUrl,
          contentStyle: { primaryLanguage: language },
        }),
      });

      if (!projectRes.ok) {
        const { error: projErr } = await projectRes.json().catch(() => ({ error: "Failed to create project" }));
        toast.error(projErr ?? "Failed to create project");
        setLoading(false);
        return;
      }

      const { project } = (await projectRes.json()) as { project: { id: number } };
      router.push(postAutopilotOnboardingRedirect(project.id));
      return;
    }

    router.push(`/onboarding/personas?companyId=${company.id}`);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Leaf className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">goals.ac</span>
          </div>
          <StepIndicator
            steps={isFastLane ? ["Website", "Content plan", "Articles", "Connect CMS"] : ["Goal", "Company", "Personas", "WordPress"]}
            current={isFastLane ? 0 : step}
          />
          <h1 className="mt-8 text-3xl font-bold">
            {isFastLane
              ? "Confirm your website"
              : step === 0
                ? "What are you trying to achieve?"
                : "Tell us about your company"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {isFastLane
              ? "We'll scan your site, build a 30-day SEO plan, and queue your first 3 expert articles."
              : step === 0
                ? "Define your primary business outcome before we connect tools or generate content."
                : "We'll use this to generate marketing personas and write SEO articles tailored to your audience."}
          </p>
        </div>

        {isFastLane || step === 0 ? (
          isFastLane ? (
            <form onSubmit={handleSubmit(onSubmit)}>
              <OnboardingFastLaneForm register={register} errors={errors} loading={loading} />
            </form>
          ) : (
            <OnboardingGoalStep
              goalIntent={goalIntent}
              onGoalIntentChange={setGoalIntent}
              onContinue={() => setStep(1)}
            />
          )
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <OnboardingCompanyForm
              register={register}
              errors={errors}
              language={language}
              onLanguageChange={setLanguage}
              competitors={competitors}
              onAddCompetitor={addCompetitor}
              onUpdateCompetitor={updateCompetitor}
              onRemoveCompetitor={removeCompetitor}
              loading={loading}
              onBack={() => setStep(0)}
            />
          </form>
        )}
      </div>
    </div>
  );
}
