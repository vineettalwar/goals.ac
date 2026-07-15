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

export type DashboardCommandCenterRecentPiece = {
  id: number;
  title: string;
  status: string;
  updatedAt: string;
};

export type DashboardCommandCenterRecentPublish = {
  id: number;
  contentPieceId: number;
  provider: string;
  status: string;
  pieceTitle: string | null;
  remoteUrl: string | null;
  errorMessage: string | null;
  publishedAt: string | null;
  createdAt: string;
};

export type DashboardCommandCenter = {
  openOpportunities: number;
  queuedOpportunities: number;
  calendarDraftItems: number;
  draftsNeedingReview: number;
  generatingPieces: number;
  latestGeoScore: number | null;
  latestGeoAuditAt: string | null;
  llmCitationRate: number | null;
  topOpportunities: Array<{
    id: number;
    keyword: string;
    opportunityScore: number;
    suggestedTitle: string;
    source: string;
  }>;
  internalLinkCoverage?: number | null;
  internalLinkSuggestions?: number;
  recentPieces?: DashboardCommandCenterRecentPiece[];
  recentPublishes?: DashboardCommandCenterRecentPublish[];
};

export type DashboardData = {
  projects: DashboardProject[];
  activeProject: DashboardProject | null;
  pieces: DashboardPiece[];
  autopilotSettings: DashboardAutopilotSettings | null;
  commandCenter: DashboardCommandCenter | null;
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
