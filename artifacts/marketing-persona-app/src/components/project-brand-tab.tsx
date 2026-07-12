"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Palette, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfidenceBadge, ScrapeFormSkeleton, ScrapeStatusHeader } from "@/components/project-scrape-status";
import type { ContentStyle, ScrapeConfidence, WebsiteProject } from "@/lib/project-detail-types";
import { SUPPORTED_LANGUAGES } from "@/lib/supported-languages";

const TONE_PRESETS = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "technical", label: "Technical" },
  { value: "conversational", label: "Conversational" },
] as const;

const READING_LEVELS = [
  { value: "general", label: "General (accessible to everyone)" },
  { value: "intermediate", label: "Intermediate (assumes some domain knowledge)" },
  { value: "expert", label: "Expert (deep technical audience)" },
] as const;

const LANGUAGES = SUPPORTED_LANGUAGES;

const WORD_COUNT_PRESETS = [
  { label: "Short", value: 400 },
  { label: "Medium", value: 800 },
  { label: "Long", value: 1500 },
];

interface BrandForm {
  companyName: string;
  industry: string;
  targetAudience: string;
  voiceTone: string;
  primaryKeywords: string;
  competitorUrls: string;
  brandColors: string;
  productOfferings: string;
}

interface Props {
  projectId: string;
  project: WebsiteProject;
  isScraping: boolean;
  wasAutoFilled: boolean;
  scrapeFailed: boolean;
  confidence?: ScrapeConfidence;
  onRescan: () => void;
  rescraping: boolean;
  onProjectUpdate: (project: WebsiteProject) => void;
}

export function ProjectBrandTab({
  projectId,
  project,
  isScraping,
  wasAutoFilled,
  scrapeFailed,
  confidence,
  onRescan,
  rescraping,
  onProjectUpdate,
}: Props) {
  const bp = project.brandProfile;
  const [brandForm, setBrandForm] = useState<BrandForm>({
    companyName: bp?.companyName ?? "",
    industry: bp?.industry ?? "",
    targetAudience: bp?.targetAudience ?? "",
    voiceTone: bp?.voiceTone ?? "",
    primaryKeywords: (bp?.primaryKeywords ?? []).join(", "),
    competitorUrls: (bp?.competitorUrls ?? []).join("\n"),
    brandColors: (bp?.brandColors ?? []).join(", "),
    productOfferings: (bp?.productOfferings ?? []).join("\n"),
  });
  const [styleForm, setStyleForm] = useState({
    tonePreset: project.contentStyle?.tonePreset ?? "professional",
    personaName: project.contentStyle?.personaName ?? "",
    defaultWordCount: project.contentStyle?.defaultWordCount ?? 800,
    primaryLanguage: project.contentStyle?.primaryLanguage ?? "en",
    forbiddenWords: (project.contentStyle?.forbiddenWords ?? []).join(", "),
    readingLevel: project.contentStyle?.readingLevel ?? "general",
  });
  const [savingBrand, setSavingBrand] = useState(false);
  const [savingStyle, setSavingStyle] = useState(false);
  const [brandSaved, setBrandSaved] = useState(false);
  const [styleSaved, setStyleSaved] = useState(false);

  useEffect(() => {
    const profile = project.brandProfile;
    if (profile) {
      setBrandForm({
        companyName: profile.companyName ?? "",
        industry: profile.industry ?? "",
        targetAudience: profile.targetAudience ?? "",
        voiceTone: profile.voiceTone ?? "",
        primaryKeywords: (profile.primaryKeywords ?? []).join(", "),
        competitorUrls: (profile.competitorUrls ?? []).join("\n"),
        brandColors: (profile.brandColors ?? []).join(", "),
        productOfferings: (profile.productOfferings ?? []).join("\n"),
      });
    }
    if (project.contentStyle) {
      setStyleForm({
        tonePreset: project.contentStyle.tonePreset ?? "professional",
        personaName: project.contentStyle.personaName ?? "",
        defaultWordCount: project.contentStyle.defaultWordCount ?? 800,
        primaryLanguage: project.contentStyle.primaryLanguage ?? "en",
        forbiddenWords: (project.contentStyle.forbiddenWords ?? []).join(", "),
        readingLevel: project.contentStyle.readingLevel ?? "general",
      });
    }
  }, [project.brandProfile, project.contentStyle]);

  const lastUpdated = bp?.updatedAt
    ? new Date(bp.updatedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  async function saveBrand() {
    setSavingBrand(true);
    setBrandSaved(false);
    const res = await fetch(`/api/website-projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: brandForm.companyName,
        industry: brandForm.industry,
        targetAudience: brandForm.targetAudience,
        voiceTone: brandForm.voiceTone,
        primaryKeywords: brandForm.primaryKeywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        competitorUrls: brandForm.competitorUrls
          .split("\n")
          .map((u) => u.trim())
          .filter(Boolean),
        brandColors: brandForm.brandColors
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
        productOfferings: brandForm.productOfferings
          .split("\n")
          .map((o) => o.trim())
          .filter(Boolean),
      }),
    });
    setSavingBrand(false);
    if (!res.ok) {
      toast.error("Failed to save brand profile");
      return;
    }
    const data = (await res.json()) as WebsiteProject;
    onProjectUpdate(data);
    if (data.brandProfile) {
      setBrandForm({
        companyName: data.brandProfile.companyName,
        industry: data.brandProfile.industry,
        targetAudience: data.brandProfile.targetAudience,
        voiceTone: data.brandProfile.voiceTone,
        primaryKeywords: (data.brandProfile.primaryKeywords ?? []).join(", "),
        competitorUrls: (data.brandProfile.competitorUrls ?? []).join("\n"),
        brandColors: (data.brandProfile.brandColors ?? []).join(", "),
        productOfferings: (data.brandProfile.productOfferings ?? []).join("\n"),
      });
    }
    setBrandSaved(true);
    toast.success("Brand profile saved");
    setTimeout(() => setBrandSaved(false), 3000);
  }

  async function saveStyle() {
    setSavingStyle(true);
    setStyleSaved(false);
    const contentStyle: ContentStyle = {
      tonePreset: styleForm.tonePreset as ContentStyle["tonePreset"],
      personaName: styleForm.personaName.trim() || undefined,
      defaultWordCount: styleForm.defaultWordCount,
      primaryLanguage: styleForm.primaryLanguage,
      forbiddenWords: styleForm.forbiddenWords
        .split(",")
        .map((w) => w.trim())
        .filter(Boolean),
      readingLevel: styleForm.readingLevel as ContentStyle["readingLevel"],
    };
    const res = await fetch(`/api/website-projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentStyle }),
    });
    setSavingStyle(false);
    if (!res.ok) {
      toast.error("Failed to save content style");
      return;
    }
    const data = (await res.json()) as WebsiteProject;
    onProjectUpdate(data);
    setStyleSaved(true);
    toast.success("Content style saved");
    setTimeout(() => setStyleSaved(false), 3000);
  }

  return (
    <div className="space-y-6">
      <div className="paper-card p-6 rounded-xl space-y-4">
        <ScrapeStatusHeader
          title="Brand Profile"
          description="This information is used to personalize all AI-generated content for your website."
          isScraping={isScraping}
          wasAutoFilled={wasAutoFilled}
          scrapeFailed={scrapeFailed}
          onRescan={onRescan}
          rescraping={rescraping}
          lastUpdated={lastUpdated}
        />

        {isScraping ? (
          <ScrapeFormSkeleton />
        ) : (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label>Company name</Label>
                  {wasAutoFilled && <ConfidenceBadge level={confidence?.companyName} />}
                </div>
                <Input
                  value={brandForm.companyName}
                  onChange={(e) => setBrandForm((p) => ({ ...p, companyName: e.target.value }))}
                  placeholder="Acme Corp"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label>Industry</Label>
                  {wasAutoFilled && <ConfidenceBadge level={confidence?.industry} />}
                </div>
                <Input
                  value={brandForm.industry}
                  onChange={(e) => setBrandForm((p) => ({ ...p, industry: e.target.value }))}
                  placeholder="B2B SaaS, E-commerce, etc."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label>Target audience</Label>
                {wasAutoFilled && <ConfidenceBadge level={confidence?.targetAudience} />}
              </div>
              <Textarea
                value={brandForm.targetAudience}
                onChange={(e) => setBrandForm((p) => ({ ...p, targetAudience: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label>Brand voice &amp; tone</Label>
                {wasAutoFilled && <ConfidenceBadge level={confidence?.voiceTone} />}
              </div>
              <Textarea
                value={brandForm.voiceTone}
                onChange={(e) => setBrandForm((p) => ({ ...p, voiceTone: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label>Primary keywords</Label>
                {wasAutoFilled && <ConfidenceBadge level={confidence?.primaryKeywords} />}
              </div>
              <Input
                value={brandForm.primaryKeywords}
                onChange={(e) => setBrandForm((p) => ({ ...p, primaryKeywords: e.target.value }))}
                placeholder="seo, content marketing, b2b growth"
              />
              <p className="text-xs text-muted-foreground">Comma-separated</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label>Competitor URLs</Label>
                {wasAutoFilled && <ConfidenceBadge level={confidence?.competitorUrls} />}
              </div>
              <Textarea
                value={brandForm.competitorUrls}
                onChange={(e) => setBrandForm((p) => ({ ...p, competitorUrls: e.target.value }))}
                placeholder={"https://competitor1.com\nhttps://competitor2.com"}
                className="resize-none font-mono text-sm"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">One URL per line</p>
            </div>

            <div className="space-y-1.5">
              <Label>Brand colors</Label>
              <Input
                value={brandForm.brandColors}
                onChange={(e) => setBrandForm((p) => ({ ...p, brandColors: e.target.value }))}
                placeholder="#085CFB, #6B9DFA, #C8E5FF"
              />
              <p className="text-xs text-muted-foreground">Comma-separated hex codes for article styling</p>
            </div>

            <div className="space-y-1.5">
              <Label>Product offerings to cross-link</Label>
              <Textarea
                value={brandForm.productOfferings}
                onChange={(e) => setBrandForm((p) => ({ ...p, productOfferings: e.target.value }))}
                placeholder={"AI consultation\nDensity tracking\nTreatment plan"}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">One offering per line — woven into generated articles</p>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={saveBrand} disabled={savingBrand}>
                {savingBrand ? (
                  <>
                    <Spinner size="sm" className="mr-2" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Save brand profile
                  </>
                )}
              </Button>
              {brandSaved && (
                <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  Saved successfully
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="paper-card p-6 rounded-xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Palette className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Content Style</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Fine-tune the writing persona, tone, and format preferences for all AI-generated
              content in this project.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Tone preset</Label>
            <div className="flex flex-wrap gap-2">
              {TONE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() =>
                    setStyleForm((p) => ({
                      ...p,
                      tonePreset: preset.value,
                    }))
                  }
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    styleForm.tonePreset === preset.value
                      ? "bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-500/20 dark:border-blue-400/50 dark:text-blue-300"
                      : "bg-muted/50 border-border text-foreground hover:border-primary/40 hover:bg-muted"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Writing persona</Label>
            <Input
              value={styleForm.personaName}
              onChange={(e) => setStyleForm((p) => ({ ...p, personaName: e.target.value }))}
              placeholder='e.g. "Alex, our Head of Growth"'
            />
            <p className="text-xs text-muted-foreground">
              Give the AI writer a name and role to adopt when generating content
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Default word count</Label>
              <span className="text-sm font-semibold">
                {styleForm.defaultWordCount.toLocaleString()} words
              </span>
            </div>
            <div className="flex gap-2">
              {WORD_COUNT_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setStyleForm((p) => ({ ...p, defaultWordCount: preset.value }))}
                  className={`px-3 py-1 rounded-md text-xs font-medium border transition-all ${
                    styleForm.defaultWordCount === preset.value
                      ? "bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-500/20 dark:border-blue-400/50 dark:text-blue-300"
                      : "bg-muted/50 border-border text-foreground hover:border-primary/40 hover:bg-muted"
                  }`}
                >
                  {preset.label} ({preset.value})
                </button>
              ))}
            </div>
            <Input
              type="range"
              min={300}
              max={3000}
              step={100}
              value={styleForm.defaultWordCount}
              onChange={(e) =>
                setStyleForm((p) => ({ ...p, defaultWordCount: Number(e.target.value) }))
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>300</span>
              <span>3,000</span>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Primary content language</Label>
              <Select
                value={styleForm.primaryLanguage}
                onValueChange={(value) => setStyleForm((p) => ({ ...p, primaryLanguage: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reading level</Label>
              <Select
                value={styleForm.readingLevel}
                onValueChange={(value) =>
                  setStyleForm((p) => ({
                    ...p,
                    readingLevel: value as "general" | "intermediate" | "expert",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {READING_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Forbidden words &amp; phrases</Label>
            <Input
              value={styleForm.forbiddenWords}
              onChange={(e) => setStyleForm((p) => ({ ...p, forbiddenWords: e.target.value }))}
              placeholder="synergy, leverage, disruptive, game-changer"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated — the AI will avoid these in all generated content
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={saveStyle} disabled={savingStyle}>
              {savingStyle ? (
                <>
                  <Spinner size="sm" className="mr-2" /> Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Save content style
                </>
              )}
            </Button>
            {styleSaved && (
              <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                Saved successfully
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
