"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Palette, Save, CheckCircle2, AlertTriangle } from "lucide-react";
import { isPlaceholderUrl, sanitizeBrandExtract } from "@workspace/content-engine/brand-extract-sanitize";
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
import { ScrapeFormSkeleton, ScrapeStatusHeader } from "@/components/project-scrape-status";
import { StockByokPanel } from "@/components/settings/stock-byok-panel";
import { DeeplByokPanel } from "@/components/settings/deepl-byok-panel";
import type { ContentStyle, WebsiteProject } from "@/lib/projects/project-detail-types";
import { formatBrandScanDiscoverySummary } from "@/lib/projects/brand-scan-summary";
import { SUPPORTED_LANGUAGES } from "@/lib/utils/supported-languages";

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

const HUMANIZATION_LEVELS = [
  { value: "off", label: "Off", description: "Publish the first AI draft as-is." },
  { value: "light", label: "Light", description: "Polish rhythm and remove AI-tell phrases." },
  { value: "strong", label: "Strong", description: "Full editorial rewrite while preserving SEO structure." },
] as const;

const STOCK_PROVIDERS = [
  { value: "auto", label: "Auto (Unsplash or Pexels)" },
  { value: "unsplash", label: "Unsplash" },
  { value: "pexels", label: "Pexels" },
] as const;

function profileToBrandForm(
  bp: WebsiteProject["brandProfile"],
  scrapeData?: WebsiteProject["scrapeData"],
): BrandForm {
  const raw = {
    companyName: bp?.companyName ?? scrapeData?.companyName ?? "",
    industry: bp?.industry ?? scrapeData?.industry ?? "",
    targetAudience: bp?.targetAudience ?? scrapeData?.targetAudience ?? "",
    voiceTone: bp?.voiceTone ?? scrapeData?.voiceTone ?? "",
    primaryKeywords: bp?.primaryKeywords ?? scrapeData?.primaryKeywords ?? [],
    competitorUrls: bp?.competitorUrls ?? scrapeData?.competitorUrls ?? [],
  };

  const sanitized = sanitizeBrandExtract({
    ...raw,
    confidence: scrapeData?.confidence ?? {
      companyName: "medium",
      industry: "medium",
      targetAudience: "medium",
      voiceTone: "medium",
      primaryKeywords: "medium",
      competitorUrls: "low",
    },
  });

  return {
    companyName: sanitized.companyName,
    industry: sanitized.industry,
    targetAudience: sanitized.targetAudience,
    voiceTone: sanitized.voiceTone,
    primaryKeywords: sanitized.primaryKeywords.join(", "),
    competitorUrls: sanitized.competitorUrls.join("\n"),
    brandColors: (bp?.brandColors ?? []).join(", "),
    productOfferings: (bp?.productOfferings ?? []).join("\n"),
  };
}

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
  onRescan,
  rescraping,
  onProjectUpdate,
}: Props) {
  const bp = project.brandProfile;
  const [brandForm, setBrandForm] = useState<BrandForm>(() =>
    profileToBrandForm(project.brandProfile, project.scrapeData),
  );
  const [styleForm, setStyleForm] = useState({
    tonePreset: project.contentStyle?.tonePreset ?? "professional",
    personaName: project.contentStyle?.personaName ?? "",
    defaultWordCount: project.contentStyle?.defaultWordCount ?? 800,
    primaryLanguage: project.contentStyle?.primaryLanguage ?? "en",
    forbiddenWords: (project.contentStyle?.forbiddenWords ?? []).join(", "),
    readingLevel: project.contentStyle?.readingLevel ?? "general",
    humanizationLevel: project.contentStyle?.humanizationLevel ?? "light",
    writingSample: project.contentStyle?.writingSample ?? "",
    stockProvider: project.contentStyle?.imageSettings?.stockProvider ?? "auto",
    autoInlineImages: project.contentStyle?.imageSettings?.autoInlineImages ?? true,
  });
  const [savingBrand, setSavingBrand] = useState(false);
  const [savingStyle, setSavingStyle] = useState(false);
  const [brandSaved, setBrandSaved] = useState(false);
  const [styleSaved, setStyleSaved] = useState(false);
  const [stockStatus, setStockStatus] = useState<{
    configured: boolean;
    unsplash: boolean;
    pexels: boolean;
  } | null>(null);

  useEffect(() => {
    fetch("/api/platform/stock-images/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.configured === "boolean") {
          setStockStatus({
            configured: data.configured,
            unsplash: Boolean(data.unsplash),
            pexels: Boolean(data.pexels),
          });
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setBrandForm(profileToBrandForm(project.brandProfile, project.scrapeData));
    if (project.contentStyle) {
      setStyleForm({
        tonePreset: project.contentStyle.tonePreset ?? "professional",
        personaName: project.contentStyle.personaName ?? "",
        defaultWordCount: project.contentStyle.defaultWordCount ?? 800,
        primaryLanguage: project.contentStyle.primaryLanguage ?? "en",
        forbiddenWords: (project.contentStyle.forbiddenWords ?? []).join(", "),
        readingLevel: project.contentStyle.readingLevel ?? "general",
        humanizationLevel: project.contentStyle.humanizationLevel ?? "light",
        writingSample: project.contentStyle.writingSample ?? "",
        stockProvider: project.contentStyle.imageSettings?.stockProvider ?? "auto",
        autoInlineImages: project.contentStyle.imageSettings?.autoInlineImages ?? true,
      });
    }
  }, [project.brandProfile, project.contentStyle, project.scrapeData]);

  const hasPlaceholderCompetitors = useMemo(
    () =>
      brandForm.competitorUrls
        .split("\n")
        .map((u) => u.trim())
        .filter(Boolean)
        .some(isPlaceholderUrl),
    [brandForm.competitorUrls],
  );

  const lastUpdated = bp?.updatedAt
    ? new Date(bp.updatedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const discoverySummary = useMemo(
    () =>
      formatBrandScanDiscoverySummary(
        project.scrapeData?.discoveryMeta,
        project.pageCount,
      ),
    [project.scrapeData?.discoveryMeta, project.pageCount],
  );

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
          .filter(Boolean)
          .filter((u) => !isPlaceholderUrl(u)),
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
      humanizationLevel: styleForm.humanizationLevel as ContentStyle["humanizationLevel"],
      writingSample: styleForm.writingSample.trim() || null,
      imageSettings: {
        ...project.contentStyle?.imageSettings,
        stockProvider: styleForm.stockProvider as "auto" | "unsplash" | "pexels",
        autoFeaturedImage: true,
        autoInlineImages: styleForm.autoInlineImages,
        maxInlineImages: 2,
      },
      translationSettings: project.contentStyle?.translationSettings,
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
          discoverySummary={discoverySummary}
        />

        {isScraping ? (
          <ScrapeFormSkeleton />
        ) : (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Company name</Label>
                <Input
                  value={brandForm.companyName}
                  onChange={(e) => setBrandForm((p) => ({ ...p, companyName: e.target.value }))}
                  placeholder="Acme Corp"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Industry</Label>
                <Textarea
                  value={brandForm.industry}
                  onChange={(e) => setBrandForm((p) => ({ ...p, industry: e.target.value }))}
                  placeholder="B2B SaaS for HR teams"
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Target audience</Label>
              <Textarea
                value={brandForm.targetAudience}
                onChange={(e) => setBrandForm((p) => ({ ...p, targetAudience: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Brand voice &amp; tone</Label>
              <Textarea
                value={brandForm.voiceTone}
                onChange={(e) => setBrandForm((p) => ({ ...p, voiceTone: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Primary keywords</Label>
              <Input
                value={brandForm.primaryKeywords}
                onChange={(e) => setBrandForm((p) => ({ ...p, primaryKeywords: e.target.value }))}
                placeholder="seo, content marketing, b2b growth"
              />
              <p className="text-xs text-muted-foreground">Comma-separated</p>
            </div>

            <div className="space-y-1.5">
              <Label>Competitor URLs</Label>
              <Textarea
                value={brandForm.competitorUrls}
                onChange={(e) => setBrandForm((p) => ({ ...p, competitorUrls: e.target.value }))}
                placeholder="https://rival.co"
                className="resize-none font-mono text-sm"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                One URL per line — add competitors manually if the scan didn&apos;t find any
              </p>
              {hasPlaceholderCompetitors && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Remove placeholder URLs — only add real competitor sites.
                </p>
              )}
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

          <div className="space-y-3">
            <div>
              <Label>Stock images</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Copyright-free photos matched to each article&apos;s target keyword, uploaded to WordPress or LinkedIn at publish.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Photo provider</Label>
              <Select
                value={styleForm.stockProvider}
                onValueChange={(value) =>
                  setStyleForm((p) => ({
                    ...p,
                    stockProvider: value as "auto" | "unsplash" | "pexels",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STOCK_PROVIDERS.map((provider) => (
                    <SelectItem key={provider.value} value={provider.value}>
                      {provider.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {stockStatus ? (
              stockStatus.configured ? (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  <p>
                    Platform stock photos are active
                    {stockStatus.unsplash && stockStatus.pexels
                      ? " (Unsplash + Pexels)"
                      : stockStatus.unsplash
                        ? " (Unsplash)"
                        : " (Pexels)"}
                    . New articles will auto-match images to their target keyword.
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-lg border border-dashed border-amber-300/70 bg-amber-50/40 px-3 py-2.5 text-xs text-muted-foreground dark:border-amber-500/30 dark:bg-amber-500/5">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <p>
                    Stock photos are unavailable. Configure platform keys (UNSPLASH_ACCESS_KEY /
                    PEXELS_API_KEY), or add organization or project stock API keys in Settings or
                    this Brand tab.
                  </p>
                </div>
              )
            ) : null}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={styleForm.autoInlineImages}
                onChange={(e) =>
                  setStyleForm((p) => ({ ...p, autoInlineImages: e.target.checked }))
                }
              />
              Add inline images in long-form articles (up to 2 per post)
            </label>
            <StockByokPanel
              scope="project"
              projectId={projectId}
              canManage
              billingFilter="free"
              title="Project stock API overrides"
              description="Optional Unsplash or Pexels keys for this site only. Override organization and platform keys when set."
            />
            <DeeplByokPanel
              scope="project"
              projectId={projectId}
              canManage
              title="DeepL refinement"
              description="Optional project-level DeepL key override. When configured, non-English drafts are localized after humanization."
            />
          </div>

          <div className="space-y-3">
            <div>
              <Label>Article humanization</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Second-pass editorial rewrite for long-form articles in Content Studio and Autopilot.
              </p>
            </div>
            <div className="space-y-2">
              {HUMANIZATION_LEVELS.map((level) => (
                <label
                  key={level.value}
                  className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/40"
                >
                  <input
                    type="radio"
                    name="humanizationLevel"
                    value={level.value}
                    checked={styleForm.humanizationLevel === level.value}
                    onChange={() =>
                      setStyleForm((p) => ({ ...p, humanizationLevel: level.value }))
                    }
                    className="mt-1"
                  />
                  <span>
                    <span className="text-sm font-medium">{level.label}</span>
                    <span className="block text-xs text-muted-foreground">{level.description}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label>Humanizer writing sample (optional)</Label>
              <Textarea
                value={styleForm.writingSample}
                onChange={(e) => setStyleForm((p) => ({ ...p, writingSample: e.target.value }))}
                placeholder="Paste a few paragraphs you've written. Overrides Brand Voice examples for the humanizer pass only."
                rows={4}
                className="resize-none"
              />
            </div>
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
