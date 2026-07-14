import type {
  Brief,
  Goal,
  KeywordAlert,
  KeywordOpportunity,
  KeywordSnapshot,
  ProjectSummary,
  TrackedKeyword,
} from "./types";
import { publicApiUrl } from "@/lib/marketing/site/public-api";

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
  return fetchJson<import("@/lib/integrations/search/search-property-types").SearchPropertyConnectionsResponse>(
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

export async function fetchInternalLinks(projectId: string | number) {
  return fetchJson<Record<string, unknown>>(`/api/internal-links?projectId=${projectId}`);
}

export async function fetchOrgSecuritySettings() {
  return fetchJson<{ securitySettings?: Record<string, unknown> }>("/api/organizations/security");
}

export async function fetchAdminOrganizations() {
  const data = await fetchJson<{ organizations: Array<{ id: number; name: string }> }>(
    "/api/admin/organizations?minimal=true",
  );
  return data.organizations;
}

export async function fetchPlatformSettings() {
  return fetchJson<{
    platformEnabled: boolean;
    aiGenerationEnabled: boolean;
    maintenanceMessage: string | null;
    signupsEnabled: boolean;
  }>("/api/admin/platform-settings");
}

export async function fetchBrandProfile(projectId: string) {
  const res = await fetch(`/api/website-projects/${projectId}/brand-profile`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchArticlePerformance(
  projectId: string,
  startDate: string,
  endDate: string,
) {
  const qs = new URLSearchParams({ startDate, endDate });
  return fetchJson<import("@/lib/integrations/analytics/analytics-property-types").ArticlePerformanceResponse>(
    `/api/website-projects/${projectId}/article-performance?${qs}`,
  );
}

export async function fetchGscSyncStatus(projectId: string) {
  const res = await fetch(`/api/website-projects/${projectId}/search-properties/gsc/sync`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchSemrushStatus(projectId: string) {
  const res = await fetch(`/api/website-projects/${projectId}/semrush/status`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchGscQueries(projectId: string, limit = 200) {
  const res = await fetch(`/api/website-projects/${projectId}/gsc-queries?limit=${limit}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.queries ?? []) as Array<{
    query: string;
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
  }>;
}

export async function fetchCmsIntegrations(projectId: string) {
  const res = await fetch(`/api/website-projects/${projectId}/cms-integrations`);
  if (!res.ok) throw new Error("Failed to load integrations");
  return res.json() as Promise<Record<string, unknown>>;
}

export async function fetchCompetitorContext(projectId: string) {
  const res = await fetch(`/api/website-projects/${projectId}/competitors`);
  if (!res.ok) throw new Error("Failed to load competitor context");
  return res.json() as Promise<{
    competitorUrls?: string[];
    industry?: string;
    competitorPositioning?: string;
    analyses?: unknown[];
  }>;
}

export async function fetchRoadmapFormOptions() {
  const [indRes, locRes] = await Promise.all([
    fetch(publicApiUrl("/api/industries")),
    fetch(publicApiUrl("/api/locations")),
  ]);
  if (!indRes.ok || !locRes.ok) throw new Error("Failed to load form options");
  const [ind, loc] = await Promise.all([indRes.json(), locRes.json()]);
  return {
    industries: Array.isArray(ind) ? ind : [],
    locations: Array.isArray(loc) ? loc : [],
  };
}

export async function fetchStockImageStatus() {
  const res = await fetch("/api/platform/stock-images/status");
  if (!res.ok) return null;
  const data = await res.json();
  if (data && typeof data.configured === "boolean") {
    return {
      configured: data.configured as boolean,
      unsplash: Boolean(data.unsplash),
      pexels: Boolean(data.pexels),
    };
  }
  return null;
}

export async function fetchMetaPages(token: string) {
  const res = await fetch(`/api/auth/meta/pages?token=${encodeURIComponent(token)}`);
  if (!res.ok) return null;
  return res.json() as Promise<{ pages?: Array<{
    pageId: string;
    pageName: string;
    instagramAccountId?: string;
    instagramUsername?: string;
  }> }>;
}

export async function generateOnboardingPersonas(companyId: string) {
  const res = await fetch("/api/personas/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companyId: parseInt(companyId, 10) }),
  });
  if (!res.ok) throw new Error("Failed to generate personas");
  const data = await res.json();
  return data.personas as Array<{
    id: number;
    name: string;
    ageRange: string;
    jobTitle: string;
    painPoints: string[];
    goals: string[];
    preferredContent: string[];
  }>;
}
