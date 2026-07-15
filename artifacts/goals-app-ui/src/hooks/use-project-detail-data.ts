import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/queries/keys";
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

type ProjectDetailData = {
  project: ProjectDetailProject | null;
  brandProfile: ProjectDetailBrandProfile | null;
  contentStyle: ProjectDetailContentStyle | null;
  pieces: ProjectDetailPiece[];
  notFound: boolean;
  error: string | null;
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

async function fetchProjectDetail(projectId: string): Promise<ProjectDetailData> {
  try {
    const [projectRow, pieceRows] = await Promise.all([
      apiFetch<WebsiteProjectDetail>(`/api/website-projects/${projectId}`),
      apiFetch<ContentPiece[]>(`/api/website-projects/${projectId}/content-pieces`),
    ]);
    const mapped = mapProject(projectRow);
    return {
      ...mapped,
      pieces: pieceRows.map(mapPiece),
      notFound: false,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load project";
    if (message.toLowerCase().includes("not found")) {
      return {
        project: null,
        brandProfile: null,
        contentStyle: null,
        pieces: [],
        notFound: true,
        error: null,
      };
    }
    throw err;
  }
}

export function useProjectDetailData(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [rescanning, setRescanning] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);
  const [savingVoice, setSavingVoice] = useState(false);

  const query = useQuery({
    queryKey: queryKeys.projectDetail(projectId),
    queryFn: () => fetchProjectDetail(projectId!),
    enabled: Boolean(projectId),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

  const data = query.data;
  const project = data?.notFound ? null : (data?.project ?? null);

  const reload = useCallback(async () => {
    if (!projectId) return;
    await queryClient.invalidateQueries({ queryKey: queryKeys.projectDetail(projectId) });
  }, [projectId, queryClient]);

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (!project || !scrapeIsPending(project.scrapeStatus)) return;

    pollRef.current = setInterval(() => {
      void reload();
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [project?.scrapeStatus, project?.id, reload]);

  const rescan = useCallback(async () => {
    if (!projectId) return;
    setRescanning(true);
    queryClient.setQueryData<ProjectDetailData>(queryKeys.projectDetail(projectId), (current) =>
      current && current.project && !current.notFound
        ? {
            ...current,
            project: { ...current.project, scrapeStatus: "pending" },
          }
        : current,
    );
    try {
      await apiFetch(`/api/website-projects/${projectId}/scrape`, { method: "POST" });
      await reload();
    } catch (err) {
      await reload();
      throw err;
    } finally {
      setRescanning(false);
    }
  }, [projectId, queryClient, reload]);

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
        queryClient.setQueryData<ProjectDetailData>(queryKeys.projectDetail(projectId), (current) =>
          current
            ? {
                ...current,
                project: mapped.project,
                brandProfile: mapped.brandProfile,
                error: null,
              }
            : current,
        );
      } finally {
        setSavingBrand(false);
      }
    },
    [projectId, queryClient],
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
        queryClient.setQueryData<ProjectDetailData>(queryKeys.projectDetail(projectId), (current) =>
          current
            ? {
                ...current,
                project: mapped.project,
                contentStyle: mapped.contentStyle,
                error: null,
              }
            : current,
        );
      } finally {
        setSavingVoice(false);
      }
    },
    [projectId, queryClient],
  );

  return {
    loading: query.isPending && !data,
    error:
      data?.error ??
      (query.error instanceof Error
        ? query.error.message
        : query.error
          ? "Failed to load project"
          : null),
    notFound: data?.notFound ?? false,
    project,
    brandProfile: data?.brandProfile ?? null,
    contentStyle: data?.contentStyle ?? null,
    pieces: data?.pieces ?? [],
    contentCount: data?.pieces.length ?? 0,
    rescanning,
    rescan,
    saveBrand,
    savingBrand,
    saveVoice,
    savingVoice,
    reload,
  };
}
