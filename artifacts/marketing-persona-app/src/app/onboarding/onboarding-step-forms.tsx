"use client";

import { useStableRowKeys } from "@/hooks/use-stable-row-keys";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { UseFormRegister, FieldErrors } from "react-hook-form";
import { SUPPORTED_LANGUAGES } from "@/lib/utils/supported-languages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { goalSchema, INDUSTRIES, type FormData, type GoalIntent } from "./onboarding-schema";

export function OnboardingGoalStep({
  goalIntent,
  onGoalIntentChange,
  onContinue,
}: {
  goalIntent: GoalIntent;
  onGoalIntentChange: (next: GoalIntent) => void;
  onContinue: () => void;
}) {
  return (
    <div className="paper-card p-8 space-y-6">
      <div className="space-y-1.5">
        <Label htmlFor="objective">Primary objective</Label>
        <select
          id="objective"
          aria-label="Primary objective"
          className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
          value={goalIntent.objective}
          onChange={(e) =>
            onGoalIntentChange({
              ...goalIntent,
              objective: e.target.value as GoalIntent["objective"],
            })
          }
        >
          {["traffic", "leads", "sales", "authority"].map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="targetMetric">Target metric</Label>
        <Textarea
          id="targetMetric"
          placeholder="e.g. 10,000 organic visits/month or 200 qualified leads/quarter"
          rows={3}
          value={goalIntent.targetMetric}
          onChange={(e) => onGoalIntentChange({ ...goalIntent, targetMetric: e.target.value })}
        />
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          size="lg"
          disabled={goalIntent.targetMetric.trim().length < 5}
          onClick={() => {
            const parsed = goalSchema.safeParse(goalIntent);
            if (!parsed.success) {
              toast.error(parsed.error.errors[0]?.message ?? "Invalid goal");
              return;
            }
            onContinue();
          }}
        >
          Continue →
        </Button>
      </div>
    </div>
  );
}

export function OnboardingFastLaneForm({
  register,
  errors,
  loading,
}: {
  register: UseFormRegister<FormData>;
  errors: FieldErrors<FormData>;
  loading: boolean;
}) {
  // URL-only; name/industry come from defaults (hostname / "Other") until brand scrape.
  return (
    <div className="paper-card p-8 space-y-6">
      <div className="space-y-1.5">
        <Label htmlFor="websiteUrl">Website URL</Label>
        <Input id="websiteUrl" placeholder="https://acme.com" {...register("websiteUrl")} />
        {errors.websiteUrl && <p className="text-xs text-destructive">{errors.websiteUrl.message}</p>}
      </div>
      <input type="hidden" {...register("name")} />
      <input type="hidden" {...register("industry")} />
      <div className="mt-6 flex justify-end">
        <Button type="submit" disabled={loading} size="lg">
          {loading ? "Starting…" : "Get 3 articles + 30-day plan →"}
        </Button>
      </div>
    </div>
  );
}

export function OnboardingCompanyForm({
  register,
  errors,
  language,
  onLanguageChange,
  competitors,
  onAddCompetitor,
  onUpdateCompetitor,
  onRemoveCompetitor,
  loading,
  onBack,
}: {
  register: UseFormRegister<FormData>;
  errors: FieldErrors<FormData>;
  language: string;
  onLanguageChange: (code: string) => void;
  competitors: string[];
  onAddCompetitor: () => void;
  onUpdateCompetitor: (index: number, value: string) => void;
  onRemoveCompetitor: (index: number) => void;
  loading: boolean;
  onBack: () => void;
}) {
  const rowKeys = useStableRowKeys(competitors.length);

  return (
    <>
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
              <option key={ind} value={ind}>
                {ind}
              </option>
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
            aria-label="Primary content language"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>
              Competitor URLs <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            {competitors.length < 5 && (
              <button
                type="button"
                onClick={onAddCompetitor}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            )}
          </div>
          <div className="space-y-2">
            {competitors.map((url, i) => (
              <div key={rowKeys[i]} className="flex gap-2">
                <Input
                  placeholder="https://competitor.com"
                  value={url}
                  onChange={(e) => onUpdateCompetitor(i, e.target.value)}
                />
                {competitors.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveCompetitor(i)}
                    aria-label={`Remove competitor URL ${i + 1}`}
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
      <div className="mt-6 flex justify-between">
        <Button type="button" variant="outline" size="lg" onClick={onBack}>
          ← Back
        </Button>
        <Button type="submit" disabled={loading} size="lg">
          {loading ? "Saving..." : "Continue →"}
        </Button>
      </div>
    </>
  );
}
