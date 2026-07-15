/** Shapes returned by api.goals.ac (D1 / edge workers). */

export type WebsiteProject = {
  id: number;
  userId: number;
  organizationId: number | null;
  name: string;
  url: string;
  sitemapUrl: string | null;
  pageCount: number;
  crawlStatus: string;
  scrapeStatus?: string | null;
  contentStyle?: Record<string, unknown> | null;
  createdAt: number | string;
  updatedAt: number | string;
};

export type BrandProfile = {
  id: number;
  websiteProjectId: number;
  companyName: string;
  industry: string;
  targetAudience: string;
  voiceTone?: string | null;
  primaryKeywords?: string[] | null;
  competitorUrls?: string[] | null;
};

export type WebsiteProjectDetail = WebsiteProject & {
  brandProfile: BrandProfile | null;
};

export type ContentPiece = {
  id: number;
  websiteProjectId: number;
  title: string;
  status: string;
  formatType: string;
  wordCount: number;
  targetKeyword?: string | null;
  plannedDate?: string | null;
  updatedAt: number | string;
  bodyMarkdown?: string;
  pieceMetadata?: Record<string, unknown> | null;
};

export type CmsIntegrationSummary = Record<string, { connected?: boolean } & Record<string, unknown>>;

export function formatProjectUrl(project: Pick<WebsiteProject, "url">): string {
  return project.url?.trim() || "No website";
}

export function formatTimestamp(value: number | string | undefined): string {
  if (value == null) return "—";
  const ms = typeof value === "number" ? value : Date.parse(String(value));
  if (!Number.isFinite(ms)) return "—";
  return new Date(ms).toLocaleDateString();
}
