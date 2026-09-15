import { Search } from "lucide-react";
import type { SearchPropertyConnectionsResponse } from "@/lib/integrations/search/search-property-types";

export const PROVIDER_META = {
  google_search_console: {
    label: "Google Search Console",
    shortLabel: "Search Console",
    connectPath: "google-search-console",
    description: "AI Overview and AI Mode impressions from Google.",
    icon: <Search className="h-4 w-4 text-blue-600" />,
  },
  bing_webmaster: {
    label: "Bing Webmaster Tools",
    shortLabel: "Bing Webmaster",
    connectPath: "bing-webmaster",
    description: "Citation counts from Copilot and Bing AI summaries.",
    icon: <Search className="h-4 w-4 text-teal-600" />,
  },
} as const;

export const SEARCH_INTEGRATIONS_COUNT = 2;

export function isOAuthReady(
  provider: keyof typeof PROVIDER_META,
  oauthConfigured: SearchPropertyConnectionsResponse["oauthConfigured"],
) {
  return provider === "google_search_console"
    ? oauthConfigured.googleSearchConsole
    : oauthConfigured.bingWebmaster;
}
