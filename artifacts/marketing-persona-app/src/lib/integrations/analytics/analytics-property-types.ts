export type AnalyticsPropertyProvider = "google_analytics_4";

export type AnalyticsPropertyConnectionStatus = {
  provider: AnalyticsPropertyProvider;
  connected: boolean;
  propertyId: string | null;
  propertyName: string | null;
  streamId: string | null;
  propertyVerified: boolean;
  accountEmail: string | null;
  connectedAt: string | null;
};

export type AnalyticsPropertyConnectionsResponse = {
  connections: AnalyticsPropertyConnectionStatus[];
  oauthConfigured: {
    googleAnalytics4: boolean;
  };
};

export type AvailableAnalyticsProperty = {
  propertyId: string;
  propertyName: string;
  streamId: string | null;
  streamUri: string | null;
  label: string;
  recommended: boolean;
};

export type AvailableAnalyticsPropertiesResponse = {
  properties: AvailableAnalyticsProperty[];
  projectUrl: string;
};

export type Ga4SyncStatus = {
  connected: boolean;
  propertyVerified: boolean;
  propertyId: string | null;
  propertyName: string | null;
  lastSyncedAt: string | null;
  pageCount: number;
  /** Outcome of the most recent sync attempt. Null before the first attempt. */
  lastSyncStatus: "ok" | "auth_error" | "error" | null;
  /** Set when lastSyncStatus is not "ok" — a short, user-facing reason. */
  lastSyncError: string | null;
};

export type Ga4SyncResult = {
  rowsUpserted: number;
  dateRange: { startDate: string; endDate: string };
};

export type ArticlePerformanceMetrics = {
  sessions: number;
  users: number;
  pageviews: number;
  engagementRate: number;
  avgSessionDuration: number;
  bounceRate: number;
};

export type ArticleGscMetrics = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type ArticlePerformanceRow = {
  contentPieceId: number;
  title: string;
  publishedUrl: string | null;
  targetKeyword: string;
  status: string;
  ga4: ArticlePerformanceMetrics;
  gsc: ArticleGscMetrics;
};

export type GscSyncStatus = {
  connected: boolean;
  propertyVerified: boolean;
  lastSyncedAt: string | null;
  queryCount: number;
};

export type ArticlePerformanceResponse = {
  articles: ArticlePerformanceRow[];
  totals: {
    ga4: ArticlePerformanceMetrics;
    gsc: ArticleGscMetrics;
  };
  connectionStatus: {
    ga4: Ga4SyncStatus;
    gsc: GscSyncStatus;
  };
  dateRange: { startDate: string; endDate: string };
};
