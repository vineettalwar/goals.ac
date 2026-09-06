"use client";

import { Save } from "lucide-react";
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
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { StockByokPanel } from "@/components/settings/stock-byok-panel";
import { DeeplByokPanel } from "@/components/settings/deepl-byok-panel";
import {
  TONE_PRESETS,
  READING_LEVELS,
  LANGUAGES,
  WORD_COUNT_PRESETS,
  HUMANIZATION_LEVELS,
  STOCK_PROVIDERS,
  type BrandForm,
  type StyleForm,
} from "./project-brand-constants";

export function ProjectBrandProfileFields({
  brandForm,
  onBrandFormChange,
  hasPlaceholderCompetitors,
  savingBrand,
  brandSaved,
  onSaveBrand,
}: {
  brandForm: BrandForm;
  onBrandFormChange: (updater: (prev: BrandForm) => BrandForm) => void;
  hasPlaceholderCompetitors: boolean;
  savingBrand: boolean;
  brandSaved: boolean;
  onSaveBrand: () => void;
}) {
  return (
    <div className="space-y-6">
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Company name</Label>
                <Input
                  value={brandForm.companyName}
                  onChange={(e) => onBrandFormChange((p) => ({ ...p, companyName: e.target.value }))}
                  placeholder="Acme Corp"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Industry</Label>
                <Textarea
                  value={brandForm.industry}
                  onChange={(e) => onBrandFormChange((p) => ({ ...p, industry: e.target.value }))}
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
                onChange={(e) => onBrandFormChange((p) => ({ ...p, targetAudience: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Brand voice &amp; tone</Label>
              <Textarea
                value={brandForm.voiceTone}
                onChange={(e) => onBrandFormChange((p) => ({ ...p, voiceTone: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Primary keywords</Label>
              <Input
                value={brandForm.primaryKeywords}
                onChange={(e) => onBrandFormChange((p) => ({ ...p, primaryKeywords: e.target.value }))}
                placeholder="seo, content marketing, b2b growth"
              />
              <p className="text-xs text-muted-foreground">Comma-separated</p>
            </div>

            <div className="space-y-1.5">
              <Label>Competitor URLs</Label>
              <Textarea
                value={brandForm.competitorUrls}
                onChange={(e) => onBrandFormChange((p) => ({ ...p, competitorUrls: e.target.value }))}
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
                onChange={(e) => onBrandFormChange((p) => ({ ...p, brandColors: e.target.value }))}
                placeholder="#085CFB, #6B9DFA, #C8E5FF"
              />
              <p className="text-xs text-muted-foreground">Comma-separated hex codes for article styling</p>
            </div>

            <div className="space-y-1.5">
              <Label>Product offerings to cross-link</Label>
              <Textarea
                value={brandForm.productOfferings}
                onChange={(e) => onBrandFormChange((p) => ({ ...p, productOfferings: e.target.value }))}
                placeholder={"AI consultation\nDensity tracking\nTreatment plan"}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">One offering per line — woven into generated articles</p>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={onSaveBrand} disabled={savingBrand}>
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
    </div>
  );
}

export function ProjectContentStyleFields({
  projectId,
  styleForm,
  onStyleFormChange,
  stockStatus,
  savingStyle,
  styleSaved,
  onSaveStyle,
}: {
  projectId: string;
  styleForm: StyleForm;
  onStyleFormChange: (updater: (prev: StyleForm) => StyleForm) => void;
  stockStatus: { configured: boolean; unsplash: boolean; pexels: boolean } | null;
  savingStyle: boolean;
  styleSaved: boolean;
  onSaveStyle: () => void;
}) {
  return (
    <div className="space-y-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Tone preset</Label>
            <div className="flex flex-wrap gap-2">
              {TONE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() =>
                    onStyleFormChange((p) => ({
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
              onChange={(e) => onStyleFormChange((p) => ({ ...p, personaName: e.target.value }))}
              placeholder='e.g. "Alex, our Head of Growth"'
            />
            <p className="text-xs text-muted-foreground">
              Name and role for the writing persona on new drafts
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
                  onClick={() => onStyleFormChange((p) => ({ ...p, defaultWordCount: preset.value }))}
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
                onStyleFormChange((p) => ({ ...p, defaultWordCount: Number(e.target.value) }))
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
                onValueChange={(value) => onStyleFormChange((p) => ({ ...p, primaryLanguage: value }))}
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
                  onStyleFormChange((p) => ({
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
              onChange={(e) => onStyleFormChange((p) => ({ ...p, forbiddenWords: e.target.value }))}
              placeholder="synergy, leverage, disruptive, game-changer"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated — kept out of generated content
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
                  onStyleFormChange((p) => ({
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
                  onStyleFormChange((p) => ({ ...p, autoInlineImages: e.target.checked }))
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
                      onStyleFormChange((p) => ({ ...p, humanizationLevel: level.value }))
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
                onChange={(e) => onStyleFormChange((p) => ({ ...p, writingSample: e.target.value }))}
                placeholder="Paste a few paragraphs you've written. Overrides Brand Voice examples for the humanizer pass only."
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={onSaveStyle} disabled={savingStyle}>
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
  );
}
