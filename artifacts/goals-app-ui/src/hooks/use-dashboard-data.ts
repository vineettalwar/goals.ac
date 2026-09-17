import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/queries/keys";
import { dashboardQueryLoading } from "./dashboard-query-loading";
import type {
  DashboardArticleUsage,
  DashboardAutopilotSettings,
  DashboardCommandCenter,
  DashboardPiece,
  DashboardProject,
  UsageSummary,
} from "@workspace/app-shell";
import type { ContentPiece, WebsiteProject } from "@/types/api";

function mapProject(project: WebsiteProject): DashboardProject {
  return { id: project.id, name: project.name, url: project.url };
}

function mapPiece(piece: ContentPiece, projectName?: string): DashboardPiece {
  return {
    id: piece.id,
    title: piece.title,
    status: piece.status,
    targetKeyword: piece.targetKeyword ?? null,
    wordCount: piece.wordCount,
    websiteProjectId: piece.websiteProjectId,
    projectName,
  };
}

function mapArticleUsage(usage: UsageSummary | null | undefined): DashboardArticleUsage | null {
  if (!usage) return null;
  return {
    articlesThisMonth: usage.articlesThisMonth,
    articleQuotaLimit: usage.quota,
    articlesRemaining: usage.quotaRemaining,
    usesByok: usage.usesByok,
  };
}

type DashboardData = {
  projects: DashboardProject[];
  activeProject: DashboardProject | null;
  pieces: DashboardPiece[];
  autopilotSettings: DashboardAutopilotSettings | null;
};

async function fetchDashboardData(
  activeProjectId: string | null,
  allProjects: WebsiteProject[],
): Promise<DashboardData> {
  const projectRows = allProjects.map(mapProject);
  const active =
    projectRows.find((row) => String(row.id) === activeProjectId) ?? projectRows[0] ?? null;

  let pieces: DashboardPiece[] = [];
  let autopilotSettings: DashboardAutopilotSettings | null = null;

  if (active) {
    const [pieceRows, autopilot] = await Promise.all([
      apiFetch<ContentPiece[]>(`/api/website-projects/${active.id}/content-pieces`).catch(
        () => [] as ContentPiece[],
      ),
      apiFetch<DashboardAutopilotSettings>(
        `/api/website-projects/${active.id}/autopilot-settings`,
      ).catch(() => null),
    ]);
    pieces = pieceRows.map((piece) => mapPiece(piece, active.name));
    autopilotSettings = autopilot;
  } else if (allProjects.length > 0) {
    const allPieces = await apiFetch<ContentPiece[]>("/api/content-pieces").catch(() => []);
    const nameById = new Map(allProjects.map((project) => [project.id, project.name]));
    pieces = allPieces.map((piece) => mapPiece(piece, nameById.get(piece.websiteProjectId)));
  }

  return {
    projects: projectRows,
    activeProject: active,
    pieces,
    autopilotSettings,
  };
}

async function fetchDashboardExtras(activeProjectId: string): Promise<{
  commandCenter: DashboardCommandCenter | null;
  articleUsage: DashboardArticleUsage | null;
}> {
  const [commandCenter, articleUsage] = await Promise.all([
    apiFetch<DashboardCommandCenter>(
      `/api/website-projects/${activeProjectId}/command-center`,
    ).catch(() => null),
    apiFetch<{ usage?: UsageSummary }>("/api/usage")
      .then((res) => mapArticleUsage(res.usage))
      .catch(() => null),
  ]);
  return { commandCenter, articleUsage };
}

export function useDashboardData(activeProjectId: string | null, allProjects: WebsiteProject[]) {
  const enabled = allProjects.length > 0;
  const query = useQuery({
    queryKey: queryKeys.dashboard(activeProjectId),
    queryFn: () => fetchDashboardData(activeProjectId, allProjects),
    enabled,
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });
  const extrasQuery = useQuery({
    queryKey: queryKeys.dashboardExtras(activeProjectId),
    queryFn: () => fetchDashboardExtras(activeProjectId!),
    enabled: enabled && Boolean(activeProjectId),
    staleTime: 30_000,
  });

  return {
    loading: dashboardQueryLoading(enabled, query.isPending, Boolean(query.data)),
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? "Failed to load dashboard"
          : null,
    projects: query.data?.projects ?? [],
    activeProject: query.data?.activeProject ?? null,
    pieces: query.data?.pieces ?? [],
    autopilotSettings: query.data?.autopilotSettings ?? null,
    commandCenter: extrasQuery.data?.commandCenter ?? null,
    articleUsage: extrasQuery.data?.articleUsage ?? null,
  };
}
