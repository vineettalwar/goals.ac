import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type {
  DashboardAutopilotSettings,
  DashboardPiece,
  DashboardProject,
} from "@workspace/app-shell";
import type { ContentPiece, WebsiteProject } from "@/types/api";

type DashboardLoadState = {
  loading: boolean;
  error: string | null;
  projects: DashboardProject[];
  activeProject: DashboardProject | null;
  pieces: DashboardPiece[];
  autopilotSettings: DashboardAutopilotSettings | null;
};

function mapProject(project: WebsiteProject): DashboardProject {
  return { id: project.id, name: project.name, url: project.url };
}

function mapPiece(
  piece: ContentPiece,
  projectName?: string,
): DashboardPiece {
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

export function useDashboardData(activeProjectId: string | null) {
  const [state, setState] = useState<DashboardLoadState>({
    loading: true,
    error: null,
    projects: [],
    activeProject: null,
    pieces: [],
    autopilotSettings: null,
  });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const projects = await apiFetch<WebsiteProject[]>("/api/website-projects");
        const projectRows = projects.map(mapProject);
        const active =
          projectRows.find((row) => String(row.id) === activeProjectId) ?? projectRows[0] ?? null;

        let pieces: DashboardPiece[] = [];
        let autopilotSettings: DashboardAutopilotSettings | null = null;

        if (active) {
          const [pieceRows, autopilot] = await Promise.all([
            apiFetch<ContentPiece[]>(`/api/website-projects/${active.id}/content-pieces`),
            apiFetch<DashboardAutopilotSettings>(
              `/api/website-projects/${active.id}/autopilot-settings`,
            ).catch(() => null),
          ]);
          pieces = pieceRows.map((piece) => mapPiece(piece, active.name));
          autopilotSettings = autopilot;
        } else if (projects.length > 0) {
          const allPieces = await apiFetch<ContentPiece[]>("/api/content-pieces").catch(() => []);
          const nameById = new Map(projects.map((p) => [p.id, p.name]));
          pieces = allPieces.map((piece) =>
            mapPiece(piece, nameById.get(piece.websiteProjectId)),
          );
        }

        if (!cancelled) {
          setState({
            loading: false,
            error: null,
            projects: projectRows,
            activeProject: active,
            pieces,
            autopilotSettings,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: err instanceof Error ? err.message : "Failed to load dashboard",
          }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeProjectId]);

  return state;
}
