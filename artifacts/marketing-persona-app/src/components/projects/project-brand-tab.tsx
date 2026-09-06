"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { isPlaceholderUrl } from "@workspace/content-engine/brand/brand-extract-sanitize";
import { ScrapeFormSkeleton, ScrapeStatusHeader } from "@/components/projects/project-scrape-status";
import type { WebsiteProject } from "@/lib/projects/project-detail-types";
import { formatBrandScanDiscoverySummary } from "@/lib/projects/brand-scan-summary";
import { profileToBrandForm, type BrandForm } from "./project-brand-constants";
import { ProjectBrandProfileFields } from "./project-brand-form-fields";
import { BrandTailoringPanel } from "@/components/brand/brand-tailoring-panel";

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
  const [savingBrand, setSavingBrand] = useState(false);
  const [brandSaved, setBrandSaved] = useState(false);

  useEffect(() => {
    setBrandForm(profileToBrandForm(project.brandProfile, project.scrapeData));
  }, [project.brandProfile, project.scrapeData]);

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
    ? new Date(bp.updatedAt).toLocaleDateString("en-US", {
        timeZone: "UTC",
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

  const liveTailoring = useMemo(
    () => ({
      voiceTone: brandForm.voiceTone.trim() || undefined,
      brandColors: brandForm.brandColors
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
      productOfferings: brandForm.productOfferings
        .split("\n")
        .map((o) => o.trim())
        .filter(Boolean),
      doWords: project.brandProfile?.doWords ?? [],
    }),
    [
      brandForm.voiceTone,
      brandForm.brandColors,
      brandForm.productOfferings,
      project.brandProfile?.doWords,
    ],
  );

  return (
    <div className="paper-card space-y-4 rounded-xl p-6">
      <ScrapeStatusHeader
        title="Brand Profile"
        description="Used to personalize drafts and articles for this website."
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
        <>
          <BrandTailoringPanel
            voiceTone={liveTailoring.voiceTone}
            brandColors={liveTailoring.brandColors}
            productOfferings={liveTailoring.productOfferings}
            doWords={liveTailoring.doWords}
          />
          <ProjectBrandProfileFields
            brandForm={brandForm}
            onBrandFormChange={setBrandForm}
            hasPlaceholderCompetitors={hasPlaceholderCompetitors}
            savingBrand={savingBrand}
            brandSaved={brandSaved}
            onSaveBrand={saveBrand}
          />
        </>
      )}
    </div>
  );
}
