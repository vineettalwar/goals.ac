export type SearchPropertyProvider = "google_search_console" | "bing_webmaster";

export type SearchPropertyConnectionStatus = {
  provider: SearchPropertyProvider;
  connected: boolean;
  propertyUrl: string | null;
  propertyVerified: boolean;
  accountEmail: string | null;
  connectedAt: string | null;
  aiReportUrl: string | null;
  aiReportLabel: string;
  /** True when the vendor exposes AI citation data in their dashboard (API may still be unavailable). */
  aiReportAvailable: boolean;
  /** Human-readable note about API ingestion status. */
  apiIngestionNote: string;
};

export type SearchPropertyConnectionsResponse = {
  connections: SearchPropertyConnectionStatus[];
  oauthConfigured: {
    googleSearchConsole: boolean;
    bingWebmaster: boolean;
  };
};

export type AvailableSearchProperty = {
  propertyUrl: string;
  label: string;
  recommended: boolean;
};

export type AvailableSearchPropertiesResponse = {
  properties: AvailableSearchProperty[];
  projectUrl: string;
};
