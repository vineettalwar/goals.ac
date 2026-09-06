"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ScrapeFormSkeleton } from "@/components/projects/project-scrape-status";
import type { ContentStyle, WebsiteProject } from "@/lib/projects/project-detail-types";
import { ProjectContentStyleFields } from "./project-brand-form-fields";
import { useStockImageStatus } from "@/lib/queries";

interface Props {
  projectId: string;
  project: WebsiteProject;
  isScraping: boolean;
  onProjectUpdate: (project: WebsiteProject) => void;
}

function styleFormFromProject(project: WebsiteProject) {
  return {
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
  };
}

export function ProjectStyleTab({
  projectId,
  project,
  isScraping,
  onProjectUpdate,
}: Props) {
  const [styleForm, setStyleForm] = useState(() => styleFormFromProject(project));
  const [savingStyle, setSavingStyle] = useState(false);
  const [styleSaved, setStyleSaved] = useState(false);
  const { data: stockStatus = null } = useStockImageStatus();

  useEffect(() => {
    setStyleForm(styleFormFromProject(project));
  }, [project]);

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
    <div className="paper-card space-y-4 rounded-xl p-6">
      <div>
        <h2 className="font-semibold">Content Style</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Fine-tune writing persona, tone, images, and language for this project.
        </p>
      </div>

      {isScraping ? (
        <ScrapeFormSkeleton />
      ) : (
        <ProjectContentStyleFields
          projectId={projectId}
          styleForm={styleForm}
          onStyleFormChange={setStyleForm}
          stockStatus={stockStatus}
          savingStyle={savingStyle}
          styleSaved={styleSaved}
          onSaveStyle={saveStyle}
        />
      )}
    </div>
  );
}
