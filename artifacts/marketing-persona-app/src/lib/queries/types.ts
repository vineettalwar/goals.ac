export interface Goal {
  id: number;
  objective: string;
  targetMetric: string;
  status: string;
  deadline: string | null;
}

export interface Brief {
  id: number;
  workingTitle: string;
  targetKeywordCluster: string;
  status: string;
}

export interface TrackedKeyword {
  id: number;
  keyword: string;
  targetUrl: string | null;
  latestSnapshot: { position: number | null; checkedAt: string } | null;
}

export interface KeywordSnapshot {
  checkedAt: string;
  position: number | null;
}

export interface KeywordOpportunity {
  id: number;
  keyword: string;
  opportunityScore: number;
  difficulty: string | null;
  suggestedTitle: string;
  status: string;
}

export interface KeywordAlert {
  id: number;
  keyword: string;
  previousPosition: number | null;
  currentPosition: number | null;
  severity: string;
  message: string;
}

export interface ProjectSummary {
  id: number;
  name: string;
  url: string;
  crawlStatus: string;
}
