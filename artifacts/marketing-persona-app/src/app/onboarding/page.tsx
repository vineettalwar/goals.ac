"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Leaf, Plus, X } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@/lib/supported-languages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StepIndicator } from "@/components/step-indicator";
import { readRoadmapIntent } from "@/lib/roadmap-intent";

const schema = z.object({
  name: z.string().min(1, "Company name is required"),
  websiteUrl: z.string().url("Enter a valid URL (include https://)"),
  industry: z.string().min(1, "Select an industry"),
  description: z.string().min(20, "Describe your company in a few sentences"),
  targetAudience: z.string().min(20, "Describe who your customers are"),
  primaryLanguage: z.string().min(2).optional(),
});
type FormData = z.infer<typeof schema>;

const INDUSTRIES = [
  "SaaS / Software",
  "E-commerce",
  "Healthcare",
  "Finance / Fintech",
  "Education",
  "Marketing / Agency",
  "Real Estate",
  "Legal",
  "Consulting",
  "Logistics / Supply Chain",
  "Manufacturing",
  "Non-profit",
  "Other",
];

export default function OnboardingPage() {
  const router = useRouter();
  const { update } = useSession();

  useEffect(() => {
    router.prefetch("/onboarding/personas");
  }, [router]);

  const [loading, setLoading] = useState(false);
  const [competitors, setCompetitors] = useState<string[]>([""]);
  const [language, setLanguage] = useState("en");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

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
      await fetch("/api/website-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, url: data.websiteUrl, contentStyle: { primaryLanguage: language } }),
      }).catch(() => {});
    }

    router.push(`/onboarding/personas?companyId=${company.id}`);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Header */}
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Leaf className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">goals.ac</span>
          </div>
          <StepIndicator steps={["Company", "Personas", "WordPress"]} current={0} />
          <h1 className="mt-8 text-3xl font-bold">Tell us about your company</h1>
          <p className="mt-2 text-muted-foreground">
            We&apos;ll use this to generate marketing personas and write SEO articles tailored to your audience.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="paper-card p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Company name</Label>
                <Input id="name" placeholder="Acme Inc." {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="websiteUrl">Website URL</Label>
                <Input id="websiteUrl" placeholder="https://acme.com" {...register("websiteUrl")} />
                {errors.websiteUrl && <p className="text-xs text-destructive">{errors.websiteUrl.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="industry">Industry</Label>
              <select
                id="industry"
                className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                {...register("industry")}
              >
                <option value="">Select industry...</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
              {errors.industry && <p className="text-xs text-destructive">{errors.industry.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Company description</Label>
              <Textarea
                id="description"
                placeholder="We build project management software for remote engineering teams. Our product helps teams track work, reduce meetings, and ship faster."
                rows={3}
                {...register("description")}
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="targetAudience">Target audience</Label>
              <Textarea
                id="targetAudience"
                placeholder="Engineering managers and CTOs at Series A–C startups with distributed teams, typically 20–200 employees."
                rows={3}
                {...register("targetAudience")}
              />
              {errors.targetAudience && <p className="text-xs text-destructive">{errors.targetAudience.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="primaryLanguage">Primary content language</Label>
              <select
                id="primaryLanguage"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>{lang.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Competitor URLs <span className="text-muted-foreground font-normal">(optional)</span></Label>
                {competitors.length < 5 && (
                  <button
                    type="button"
                    onClick={addCompetitor}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {competitors.map((url, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      placeholder="https://competitor.com"
                      value={url}
                      onChange={(e) => updateCompetitor(i, e.target.value)}
                    />
                    {competitors.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCompetitor(i)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border hover:bg-secondary transition-colors"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button type="submit" disabled={loading} size="lg">
              {loading ? "Saving..." : "Continue →"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
