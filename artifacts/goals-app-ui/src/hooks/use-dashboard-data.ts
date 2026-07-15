import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/queries/keys";
import type {
  DashboardAutopilotSettings,
  DashboardCommandCenter,
  DashboardPiece,
  DashboardProject,
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

type DashboardData = {
  projects: DashboardProject[];
  activeProject: DashboardProject | null;
  pieces: DashboardPiece[];
  autopilotSettings: DashboardAutopilotSettings | null;
  commandCenter: DashboardCommandCenter | null;
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
  let commandCenter: DashboardCommandCenter | null = null;

  if (active) {
    const [pieceRows, autopilot, command] = await Promise.all([
      apiFetch<ContentPiece[]>(`/api/website-projects/${active.id}/content-pieces`),
      apiFetch<DashboardAutopilotSettings>(
        `/api/website-projects/${active.id}/autopilot-settings`,
      ).catch(() => null),
      apiFetch<DashboardCommandCenter>(
        `/api/website-projects/${active.id}/command-center`,
      ).catch(() => null),
    ]);
    pieces = pieceRows.map((piece) => mapPiece(piece, active.name));
    autopilotSettings = autopilot;
    commandCenter = command;
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
    commandCenter,
  };
}

export function useDashboardData(activeProjectId: string | null, allProjects: WebsiteProject[]) {
  const query = useQuery({
    queryKey: queryKeys.dashboard(activeProjectId),
    queryFn: () => fetchDashboardData(activeProjectId, allProjects),
    enabled: allProjects.length > 0,
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

  return {
    loading: query.isPending && !query.data,
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
    commandCenter: query.data?.commandCenter ?? null,
  };
}
