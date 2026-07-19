export type SuccessStoryMetric = {
  label: string;
  before: string;
  after: string;
};

export type SuccessStoryVerifyLink = {
  label: string;
  href: string;
};

export type SuccessStory = {
  slug: string;
  vertical: string;
  companyLabel: string;
  title: string;
  summary: string;
  timeframe: string;
  metrics: SuccessStoryMetric[];
  quote?: string;
  verifyLinks: SuccessStoryVerifyLink[];
  status: "published";
  permissionNote?: string;
};

/** Primary-source verify CTAs for when permissioned stories ship. */
export const DEFAULT_VERIFY_LINKS: SuccessStoryVerifyLink[] = [
  { label: "Google Search Console", href: "https://search.google.com/search-console" },
  { label: "Ahrefs", href: "https://ahrefs.com/" },
  { label: "Verify with ChatGPT", href: "https://chatgpt.com/" },
];

/** Real permissioned customer stories only. Empty until a launch with publish rights. */
export const PUBLISHED_STORIES: SuccessStory[] = [];

export function getPublishedStories(): SuccessStory[] {
  return PUBLISHED_STORIES.filter((s) => s.status === "published");
}

export function getStoryBySlug(slug: string): SuccessStory | undefined {
  return getPublishedStories().find((s) => s.slug === slug);
}

export function formatMetricDelta(before: string, after: string): string {
  return `${before} → ${after}`;
}
