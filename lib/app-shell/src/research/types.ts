import type { ReactNode } from "react";

export type ThreatLevel = "low" | "medium" | "high";

export type CompetitorAnalysisResult = {
  competitorName: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  contentGaps: string[];
  geoGaps: string[];
  quickWins: string[];
  threatLevel: ThreatLevel;
};

export type CompetitorAnalysisRow = {
  id: number;
  competitorUrl: string;
  industry: string;
  location?: string;
  stage?: string;
  createdAt?: string | null;
  competitorName?: string;
  summary?: string;
  threatLevel?: ThreatLevel;
  strengths?: string[];
  weaknesses?: string[];
  contentGaps?: string[];
  geoGaps?: string[];
  quickWins?: string[];
};

export type CompetitorFormState = {
  competitorUrl: string;
  industry: string;
  location: string;
  stage: string;
};

export type RedditThread = {
  subreddit: string;
  title: string;
  url: string;
  intentScore: number;
  suggestedReply: string;
  score?: number;
  numComments?: number;
  source?: string;
};

export type AttackItemKind = "quick_win" | "content_gap" | "geo_gap";

export type AttackItem = {
  id: string;
  kind: AttackItemKind;
  text: string;
  analysisId: number;
  competitorName: string;
  competitorUrl: string;
};

export type ResearchLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

export type ResearchActionPaths = {
  studioCreateHref: (input: { title: string; keyword?: string; angle?: string }) => string;
  keywordsHref: (keyword?: string, source?: string) => string;
  visibilityHref: () => string;
  auditHref: (url?: string) => string;
  competitorsHref: (analysisId?: number) => string;
  signalsHref: () => string;
};

export const COMPETITOR_STAGES = ["early", "growth", "scale"] as const;
