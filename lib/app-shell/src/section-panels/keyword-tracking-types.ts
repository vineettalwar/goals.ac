/**
 * Shared keyword-tracking types.
 *
 * Extracted from keyword-tracking-ui so tab components can import types
 * without creating a circular dependency with the parent shell.
 */

export type KeywordSourceFilter =
  | "all"
  | "semrush"
  | "gsc_query"
  | "csv_import"
  | "google_sheets"
  | "manual"
  | "imports"
  | "ai_analysis"
  | "competitor_gap"
  | "reddit"
  | "rank_drop"
  | "content_refresh";

export type KeywordOpportunityRow = {
  id: number;
  keyword: string;
  source: string;
  opportunityScore: number;
  difficulty?: string | null;
  suggestedTitle: string;
  suggestedAngle: string;
  estimatedVolume?: string | null;
  linkedContentPieceId?: number | null;
};

export type KeywordAlertRow = {
  id: number;
  keyword: string;
  message: string;
};

export type TrackedKeywordRow = {
  id: number;
  keyword: string;
  latestSnapshot?: {
    position?: number | null;
    serpFeatures?: Record<string, unknown>;
  } | null;
};

export type KeywordAnalysisResult = {
  keywords: Array<{
    keyword: string;
    estimatedVolume: string;
    difficulty: "low" | "medium" | "high";
    aiVisibility: number;
    opportunities: string[];
    suggestedContent: string;
  }>;
  topOpportunity: string;
  summary: string;
};

export type GscQueryMetric = {
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
};

export type ArticleIdeaImportHistory = {
  id: number;
  source: string;
  rowCount: number;
  createdAt: string;
};

export type ArticleIdeaSourceRow = {
  id: number;
  label: string;
  spreadsheetId: string;
  sheetName: string | null;
  connected: boolean;
  syncStatus: string;
  rowCount: number;
  lastSyncedAt: string | null;
  syncError: string | null;
};
