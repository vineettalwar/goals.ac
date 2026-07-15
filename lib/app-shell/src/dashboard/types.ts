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

export type DashboardAutopilotCadence = "daily" | "weekly";

export type DashboardAutopilotSettings = {
  enabled?: boolean;
  cadence?: string;
  publishMode?: string;
  autoQueueOpportunities?: boolean;
};

/** Compact dashboard PATCH payload (full controls remain on Publishing). */
export type DashboardAutopilotSavePayload = {
  enabled: boolean;
  cadence: DashboardAutopilotCadence;
  autoQueueOpportunities: boolean;
};

/** Monthly article quota from plan usage (platform key). `articleQuotaLimit` is null when unlimited. */
export type DashboardArticleUsage = {
  articlesThisMonth: number;
  articleQuotaLimit: number | null;
  articlesRemaining: number | null;
  usesByok: boolean;
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
  /** Coverage % from `/internal-links` rules; null when no pages in map. */
  internalLinkCoverage?: number | null;
  /** Published pages with zero inbound links; null when coverage unavailable. */
  internalLinkOrphanCount?: number | null;
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
  articleUsage?: DashboardArticleUsage | null;
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
