import type { SearchPropertyProvider } from "./search-property-types";

/** Deep links to vendor AI citation dashboards (UI-only until APIs open). */
export function buildAiReportUrl(provider: SearchPropertyProvider, propertyUrl: string | null): string | null {
  if (!propertyUrl) return null;

  if (provider === "google_search_console") {
    // Generative AI performance report — rolling out in GSC UI.
    const encoded = encodeURIComponent(propertyUrl);
    return `https://search.google.com/search-console/performance/search-analytics?resource_id=${encoded}&breakdown=page`;
  }

  if (provider === "bing_webmaster") {
    return "https://www.bing.com/webmasters/aiperformance";
  }

  return null;
}

export const AI_REPORT_LABELS: Record<SearchPropertyProvider, string> = {
  google_search_console: "Generative AI performance (Search Console)",
  bing_webmaster: "AI Performance (Bing Webmaster)",
};

export const API_INGESTION_NOTES: Record<SearchPropertyProvider, string> = {
  google_search_console:
    "AI Overview impressions are visible in Search Console. API ingestion is not available yet — open the report or export CSV.",
  bing_webmaster:
    "Citation counts are visible in Bing AI Performance. API ingestion is on Microsoft's backlog — open the report for now.",
};
