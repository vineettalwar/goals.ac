import type { ReactNode } from "react";

export type DashboardLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

export type DashboardPiece = {
  id: number;
  title: string;
  status: string;
  targetKeyword?: string | null;
  wordCount?: number | null;
  websiteProjectId: number;
  projectName?: string;
};

export type DashboardProject = {
  id: number;
  name: string;
  url: string;
};

export type DashboardAutopilotSettings = {
  enabled?: boolean;
  cadence?: string;
  publishMode?: string;
};

export type DashboardData = {
  projects: DashboardProject[];
  activeProject: DashboardProject | null;
  pieces: DashboardPiece[];
  autopilotSettings: DashboardAutopilotSettings | null;
};

export function contentPiecePath(projectId: number | string, pieceId: number | string): string {
  return `/projects/${projectId}/content-piece/${pieceId}`;
}

export function countByStatus(pieces: DashboardPiece[]) {
  const counts: Record<string, number> = {};
  for (const piece of pieces) {
    counts[piece.status] = (counts[piece.status] ?? 0) + 1;
  }
  return counts;
}
