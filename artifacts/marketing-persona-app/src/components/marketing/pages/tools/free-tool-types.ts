export type MetaResult = {
  score: number;
  issues: string[];
  titleLen: number;
  descLen: number;
  pageTitle: string | null;
  metaDescription: string | null;
  url: string;
  h1?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
};

export type LlmsTxtCheck = {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
};

export type LlmsResult = {
  url: string;
  content: string;
  pageCount: number;
  title?: string;
  description?: string;
  existingFound?: boolean;
  existingUrl?: string;
  existingContent?: string | null;
  pageSource?: "sitemap" | "homepage-links";
  checks?: LlmsTxtCheck[];
};

export type RobotsAgentRules = {
  userAgents: string[];
  allows: string[];
  disallows: string[];
  blocksAll: boolean;
};

export type RobotsResult = {
  url: string;
  content: string;
  allowsAll: boolean;
  disallows: string[];
  sitemapUrls: string[];
  agents?: RobotsAgentRules[];
  flaggedAgents?: string[];
};

export type SitemapResult = {
  url: string;
  urlCount: number;
  urls: string[];
  errors: string[];
  sitemapType?: "urlset" | "sitemapindex" | null;
};
