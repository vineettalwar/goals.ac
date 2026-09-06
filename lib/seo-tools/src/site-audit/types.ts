import type { AuditIssueType } from "./issue-types";

export type FetchClass = "ok" | "blocked" | "error";

export type PageLink = {
  href: string;
  internal: boolean;
  rel: string;
  anchor: string;
};

export type CrawledPage = {
  id: string;
  url: string;
  statusCode: number | null;
  fetchClass: FetchClass;
  responseTimeMs: number;
  redirectUrl: string | null;
  isHtml: boolean;
  title: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  headerCanonicalUrl: string | null;
  robotsMeta: string | null;
  xRobotsTag: string | null;
  isIndexable: boolean;
  h1Count: number;
  headingOrder: number[];
  wordCount: number;
  contentHash: string | null;
  imagesTotal: number;
  imagesMissingAlt: number;
  links: PageLink[];
  crawlDepth: number | null;
  fromSitemap: boolean;
};

export type DetectedIssue = {
  issueType: AuditIssueType;
  pageId: string | null;
  pageUrl: string;
  details?: Record<string, unknown>;
  dedupeKey?: string;
};

export type SiteAuditResult = {
  startUrl: string;
  maxPages: number;
  pagesCrawled: number;
  crawlComplete: boolean;
  pages: CrawledPage[];
  issues: DetectedIssue[];
};
