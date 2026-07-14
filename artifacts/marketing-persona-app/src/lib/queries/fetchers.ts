import type {
  Brief,
  Goal,
  KeywordAlert,
  KeywordOpportunity,
  KeywordSnapshot,
  ProjectSummary,
  TrackedKeyword,
} from "./types";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${url}`);
  return res.json() as Promise<T>;
}

export async function fetchWebsiteProjects(): Promise<ProjectSummary[]> {
  return fetchJson<ProjectSummary[]>("/api/website-projects");
}

export async function fetchCompanyId(): Promise<number | null> {
  const data = await fetchJson<{ companies?: Array<{ id: number }> }>("/api/companies");
  return data.companies?.[0]?.id ?? null;
}

export async function fetchGoals(projectId: string): Promise<Goal[]> {
  const data = await fetchJson<{ goals?: Goal[] }>(`/api/goals?projectId=${projectId}`);
  return data.goals ?? [];
}

export async function fetchBriefs(projectId: string): Promise<Brief[]> {
  const data = await fetchJson<{ briefs?: Brief[] }>(`/api/briefs?projectId=${projectId}`);
  return data.briefs ?? [];
}

export async function fetchTrackedKeywords(projectId: string): Promise<TrackedKeyword[]> {
  const data = await fetchJson<{ trackedKeywords?: TrackedKeyword[]; keywords?: TrackedKeyword[] }>(
    `/api/tracked-keywords?projectId=${projectId}`,
  );
  return data.trackedKeywords ?? data.keywords ?? [];
}

export async function fetchKeywordOpportunities(projectId: string): Promise<KeywordOpportunity[]> {
  const data = await fetchJson<{ opportunities?: KeywordOpportunity[] }>(
    `/api/website-projects/${projectId}/keyword-opportunities?status=open`,
  );
  return data.opportunities ?? [];
}

export async function fetchKeywordAlerts(projectId: string): Promise<KeywordAlert[]> {
  const data = await fetchJson<{ alerts?: KeywordAlert[] }>(
    `/api/website-projects/${projectId}/keyword-alerts`,
  );
  return data.alerts ?? [];
}

export async function fetchKeywordSnapshots(trackedId: number): Promise<KeywordSnapshot[]> {
  const data = await fetchJson<{ snapshots?: KeywordSnapshot[] }>(
    `/api/tracked-keywords/${trackedId}/snapshots`,
  );
  return data.snapshots ?? [];
}

export async function fetchProjectContent(projectId: string) {
  return fetchJson<{
    roadmaps?: unknown[];
    contentStrategies?: unknown[];
    seoArticles?: unknown[];
    contentPieces?: unknown[];
    geoAudits?: unknown[];
    competitorAnalyses?: unknown[];
  }>(`/api/website-projects/${projectId}/content`);
}

export async function fetchVisibilitySettings(projectId: string) {
  return fetchJson<Record<string, unknown>>(`/api/website-projects/${projectId}/visibility-settings`);
}

export async function fetchVisibilitySummary(projectId: string) {
  return fetchJson<Record<string, unknown>>(`/api/website-projects/${projectId}/visibility`);
}

export async function fetchSearchProperties(projectId: string) {
  return fetchJson<import("@/lib/integrations/search-property-types").SearchPropertyConnectionsResponse>(
    `/api/website-projects/${projectId}/search-properties`,
  );
}

export async function fetchRoadmapsCatalog() {
  const data = await fetchJson<{ roadmaps?: unknown[] }>("/api/roadmaps?limit=20");
  return data.roadmaps ?? [];
}

export async function fetchWebsiteProject(projectId: string) {
  return fetchJson<Record<string, unknown>>(`/api/website-projects/${projectId}`);
}
