"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Palette, Save, CheckCircle2, AlertTriangle } from "lucide-react";
import { isPlaceholderUrl, sanitizeBrandExtract } from "@workspace/content-engine/brand/brand-extract-sanitize";
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
import { ScrapeFormSkeleton, ScrapeStatusHeader } from "@/components/projects/project-scrape-status";
import { StockByokPanel } from "@/components/settings/stock-byok-panel";
import { DeeplByokPanel } from "@/components/settings/deepl-byok-panel";
import type { ContentStyle, WebsiteProject } from "@/lib/projects/project-detail-types";
import { formatBrandScanDiscoverySummary } from "@/lib/projects/brand-scan-summary";
import { profileToBrandForm, type BrandForm, type StyleForm } from "./project-brand-constants";
import { ProjectBrandProfileFields, ProjectContentStyleFields } from "./project-brand-form-fields";
import { useStockImageStatus } from "@/lib/queries";

interface Props {
  projectId: string;
  project: WebsiteProject;
  isScraping: boolean;
  wasAutoFilled: boolean;
  scrapeFailed: boolean;
  onRescan: () => void;
  onProjectUpdate: (project: WebsiteProject) => void;
}

export function ProjectBrandTab({
  projectId,
  project,
  isScraping,
  wasAutoFilled,
  scrapeFailed,
  onRescan,
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
  const { data: stockStatus = null } = useStockImageStatus();

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
    ? new Date(bp.updatedAt).toLocaleDateString("en-US", { timeZone: "UTC", 
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
          lastUpdated={lastUpdated}
          discoverySummary={discoverySummary}
        />

        {isScraping ? (
          <ScrapeFormSkeleton />
        ) : (
          <ProjectBrandProfileFields
            brandForm={brandForm}
            onBrandFormChange={setBrandForm}
            hasPlaceholderCompetitors={hasPlaceholderCompetitors}
            savingBrand={savingBrand}
            brandSaved={brandSaved}
            onSaveBrand={saveBrand}
          />
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
        <ProjectContentStyleFields
          styleForm={styleForm}
          onStyleFormChange={setStyleForm}
          stockStatus={stockStatus}
          savingStyle={savingStyle}
          styleSaved={styleSaved}
          onSaveStyle={saveStyle}
        />
      </div>
    </div>
  );
}
