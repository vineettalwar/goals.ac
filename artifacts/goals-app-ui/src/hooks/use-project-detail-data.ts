import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import type {
  BrandProfileSavePayload,
  ProjectDetailBrandProfile,
  ProjectDetailContentStyle,
  ProjectDetailPiece,
  ProjectDetailProject,
  VoiceStyleSavePayload,
} from "@workspace/app-shell";
import { scrapeIsPending } from "@workspace/app-shell";
import type { ContentPiece, WebsiteProjectDetail } from "@/types/api";

type ContentStyleJson = {
  tonePreset?: string | null;
  personaName?: string | null;
  defaultWordCount?: number | null;
  primaryLanguage?: string | null;
  readingLevel?: string | null;
  humanizationLevel?: string | null;
};

function mapProject(project: WebsiteProjectDetail): {
  project: ProjectDetailProject;
  brandProfile: ProjectDetailBrandProfile | null;
  contentStyle: ProjectDetailContentStyle | null;
} {
  const style = (project.contentStyle ?? null) as ContentStyleJson | null;
  const brand = project.brandProfile;

  return {
    project: {
      id: project.id,
      name: project.name,
      url: project.url,
      pageCount: project.pageCount,
      scrapeStatus: project.scrapeStatus ?? project.crawlStatus ?? null,
    },
    brandProfile: brand
      ? {
          companyName: brand.companyName,
          industry: brand.industry,
          targetAudience: brand.targetAudience,
          voiceTone: brand.voiceTone ?? null,
          primaryKeywords: brand.primaryKeywords ?? null,
          competitorUrls: brand.competitorUrls ?? null,
        }
      : null,
    contentStyle: style
      ? {
          tonePreset: style.tonePreset ?? null,
          personaName: style.personaName ?? null,
          defaultWordCount: style.defaultWordCount ?? null,
          primaryLanguage: style.primaryLanguage ?? null,
          readingLevel: style.readingLevel ?? null,
          humanizationLevel: style.humanizationLevel ?? null,
        }
      : null,
  };
}

function mapPiece(piece: ContentPiece): ProjectDetailPiece {
  return {
    id: piece.id,
    title: piece.title,
    status: piece.status,
    targetKeyword: piece.targetKeyword ?? null,
    wordCount: piece.wordCount,
  };
}

export function useProjectDetailData(projectId: string | undefined) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [project, setProject] = useState<ProjectDetailProject | null>(null);
  const [brandProfile, setBrandProfile] = useState<ProjectDetailBrandProfile | null>(null);
  const [contentStyle, setContentStyle] = useState<ProjectDetailContentStyle | null>(null);
  const [pieces, setPieces] = useState<ProjectDetailPiece[]>([]);
  const [rescanning, setRescanning] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);
  const [savingVoice, setSavingVoice] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return null;
    try {
      const [projectRow, pieceRows] = await Promise.all([
        apiFetch<WebsiteProjectDetail>(`/api/website-projects/${projectId}`),
        apiFetch<ContentPiece[]>(`/api/website-projects/${projectId}/content-pieces`),
      ]);
      const mapped = mapProject(projectRow);
      setProject(mapped.project);
      setBrandProfile(mapped.brandProfile);
      setContentStyle(mapped.contentStyle);
      setPieces(pieceRows.map(mapPiece));
      setNotFound(false);
      setError(null);
      return mapped.project;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load project";
      if (message.toLowerCase().includes("not found")) {
        setNotFound(true);
      } else {
        setError(message);
      }
      return null;
    }
  }, [projectId]);

  const reload = useCallback(async () => {
    setLoading(true);
    await load();
    setLoading(false);
  }, [load]);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [projectId, load]);

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (!project || !scrapeIsPending(project.scrapeStatus)) return;

    pollRef.current = setInterval(() => {
      void load();
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [project?.scrapeStatus, project?.id, load]);

  const rescan = useCallback(async () => {
    if (!projectId) return;
    setRescanning(true);
    setProject((prev) => (prev ? { ...prev, scrapeStatus: "pending" } : prev));
    try {
      await apiFetch(`/api/website-projects/${projectId}/scrape`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start re-scan");
      await load();
    } finally {
      setRescanning(false);
    }
  }, [projectId, load]);

  const saveBrand = useCallback(
    async (payload: BrandProfileSavePayload) => {
      if (!projectId) return;
      setSavingBrand(true);
      try {
        const updated = await apiFetch<WebsiteProjectDetail>(`/api/website-projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const mapped = mapProject(updated);
        setProject(mapped.project);
        setBrandProfile(mapped.brandProfile);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save brand profile");
      } finally {
        setSavingBrand(false);
      }
    },
    [projectId],
  );

  const saveVoice = useCallback(
    async (payload: VoiceStyleSavePayload) => {
      if (!projectId) return;
      setSavingVoice(true);
      try {
        const updated = await apiFetch<WebsiteProjectDetail>(`/api/website-projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentStyle: payload }),
        });
        const mapped = mapProject(updated);
        setProject(mapped.project);
        setContentStyle(mapped.contentStyle);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save brand voice");
      } finally {
        setSavingVoice(false);
      }
    },
    [projectId],
  );

  return {
    loading,
    error,
    notFound,
    project,
    brandProfile,
    contentStyle,
    pieces,
    contentCount: pieces.length,
    rescanning,
    rescan,
    saveBrand,
    savingBrand,
    saveVoice,
    savingVoice,
    reload,
  };
}
