/**
 * Typed registry of pg-boss queues shared across the platform.
 *
 * Design note (roadmap §7 — BYOK security architecture): job payloads carry
 * only IDs (credential IDs, connection IDs, etc.), never decrypted secrets.
 * Decryption happens exclusively at the point of egress, inside the worker
 * process that resolves the ID from the database — the same rule that
 * governs `lib/security` today. A job payload must never contain a
 * plaintext API key, token, or password, and must never be logged with one.
 */

/** Canonical queue names. Add new queues here, not as ad-hoc strings. */
export const QUEUES = {
  connectionHealthCheck: "connection-health-check",
  keywordRankCheck: "keyword-rank-check",
  contentGenerate: "content-generate",
  contentPublish: "content-publish",
  contentGenerateSweep: "content-generate-sweep",
  scheduledPublishSweep: "scheduled-publish-sweep",
  llmVisibilityCheck: "llm-visibility-check",
  geoReauditSweep: "geo-reaudit-sweep",
  keywordOpportunitySweep: "keyword-opportunity-sweep",
  gscSearchAnalyticsSync: "gsc-search-analytics-sync",
  ga4AnalyticsSync: "ga4-analytics-sync",
  articleIdeaSourceSync: "article-idea-source-sync",
  brandVoiceIndex: "brand-voice-index",
  brandVoiceSkillRegen: "brand-voice-skill-regen",
  brandVoiceResync: "brand-voice-resync",
  evergreenRecycleSweep: "evergreen-recycle-sweep",
  socialHistorySync: "social-history-sync",
  socialMetricsSync: "social-metrics-sync",
  legacyCompanyAutopilot: "legacy-company-autopilot",
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

/**
 * Health-check job for a single CMS/integration connection.
 *
 * `kind` disambiguates which table `connectionId` refers to:
 *  - "wordpress"  → `wordpress_connections.id`
 *  - "integration" → `integration_connections.id` (ghost, webhook, ...)
 *
 * The sweep (cron-triggered, no single connection) is represented by an
 * empty payload `{}`; the handler enumerates every connection of both
 * kinds and enqueues one `ConnectionHealthCheckPayload` job per row.
 */
export interface ConnectionHealthCheckPayload {
  kind: "wordpress" | "integration";
  connectionId: number;
}

/** The sweep variant of the connection-health-check job: no target row yet. */
export type ConnectionHealthCheckSweepPayload = Record<string, never>;

export type ConnectionHealthCheckJobData = ConnectionHealthCheckPayload | ConnectionHealthCheckSweepPayload;

export interface KeywordRankCheckPayload {
  trackedKeywordId: number;
}

/** Daily sweep: enumerate all active tracked keywords. */
export type KeywordRankCheckSweepPayload = Record<string, never>;

export type KeywordRankCheckJobData = KeywordRankCheckPayload | KeywordRankCheckSweepPayload;

export interface ContentGeneratePayload {
  contentItemId: number;
  projectId: number;
  userId: number;
  generateVariants?: boolean;
  schedulePublish?: boolean;
  triggeredByAutopilot?: boolean;
}

export interface ContentPublishPayload {
  contentPieceId: number;
  userId: number;
}

export type ScheduledPublishSweepPayload = Record<string, never>;

export interface ContentGenerateSweepPayload {
  projectId: number;
}

/** Hourly sweep: enumerate all autopilot-enabled projects. */
export type ContentGenerateSweepJobData = ContentGenerateSweepPayload | Record<string, never>;

export interface LlmVisibilityCheckPayload {
  projectId: number;
}

export type LlmVisibilityCheckJobData = LlmVisibilityCheckPayload | Record<string, never>;

export interface GeoReauditPayload {
  projectId: number;
}

export type GeoReauditJobData = GeoReauditPayload | Record<string, never>;

export interface KeywordOpportunitySweepPayload {
  projectId: number;
  userId: number;
}

export type KeywordOpportunitySweepJobData = KeywordOpportunitySweepPayload | Record<string, never>;

export interface GscSearchAnalyticsSyncPayload {
  projectId: number;
  userId?: number;
}

export type GscSearchAnalyticsSyncJobData = GscSearchAnalyticsSyncPayload | Record<string, never>;

export interface Ga4AnalyticsSyncPayload {
  projectId: number;
  userId?: number;
}

export type Ga4AnalyticsSyncJobData = Ga4AnalyticsSyncPayload | Record<string, never>;

export interface ArticleIdeaSourceSyncPayload {
  sourceId: number;
  userId: number;
}

export type ArticleIdeaSourceSyncJobData = ArticleIdeaSourceSyncPayload | Record<string, never>;

export interface BrandVoiceIndexPayload {
  projectId: number;
  sourceIds?: number[];
  regenerateSkill?: boolean;
}

export type BrandVoiceIndexJobData = BrandVoiceIndexPayload;

export interface BrandVoiceSkillRegenPayload {
  projectId: number;
}

export type BrandVoiceSkillRegenJobData = BrandVoiceSkillRegenPayload;

export interface BrandVoiceResyncPayload {
  projectId: number;
  userId?: number;
}

export type BrandVoiceResyncJobData = BrandVoiceResyncPayload | Record<string, never>;

export type EvergreenRecycleSweepPayload = Record<string, never>;

export interface SocialHistorySyncPayload {
  projectId: number;
  userId: number;
  platform?: string;
}

export type SocialHistorySyncJobData = SocialHistorySyncPayload | Record<string, never>;

export interface SocialMetricsSyncPayload {
  projectId: number;
  userId?: number;
}

export type SocialMetricsSyncJobData = SocialMetricsSyncPayload | Record<string, never>;

export type LegacyCompanyAutopilotJobData = Record<string, never>;

/** Maps each queue name to the payload shape(s) it accepts. */
export interface QueuePayloadMap {
  [QUEUES.connectionHealthCheck]: ConnectionHealthCheckJobData;
  [QUEUES.keywordRankCheck]: KeywordRankCheckJobData;
  [QUEUES.contentGenerate]: ContentGeneratePayload;
  [QUEUES.contentPublish]: ContentPublishPayload;
  [QUEUES.contentGenerateSweep]: ContentGenerateSweepJobData;
  [QUEUES.scheduledPublishSweep]: ScheduledPublishSweepPayload;
  [QUEUES.llmVisibilityCheck]: LlmVisibilityCheckJobData;
  [QUEUES.geoReauditSweep]: GeoReauditJobData;
  [QUEUES.keywordOpportunitySweep]: KeywordOpportunitySweepJobData;
  [QUEUES.gscSearchAnalyticsSync]: GscSearchAnalyticsSyncJobData;
  [QUEUES.ga4AnalyticsSync]: Ga4AnalyticsSyncJobData;
  [QUEUES.articleIdeaSourceSync]: ArticleIdeaSourceSyncJobData;
  [QUEUES.brandVoiceIndex]: BrandVoiceIndexJobData;
  [QUEUES.brandVoiceSkillRegen]: BrandVoiceSkillRegenJobData;
  [QUEUES.brandVoiceResync]: BrandVoiceResyncJobData;
  [QUEUES.evergreenRecycleSweep]: EvergreenRecycleSweepPayload;
  [QUEUES.socialHistorySync]: SocialHistorySyncJobData;
  [QUEUES.socialMetricsSync]: SocialMetricsSyncJobData;
  [QUEUES.legacyCompanyAutopilot]: LegacyCompanyAutopilotJobData;
}

export type QueuePayloadFor<Q extends QueueName> = QueuePayloadMap[Q];
