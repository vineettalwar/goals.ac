import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { organizationsTable } from "./organizations";
import type { SocialScheduleSettings, SocialHistorySyncMeta } from "./platform_voices";
import type { EncryptedStockCredentialsMap } from "./stock-credentials";

export type { EncryptedStockCredentialsMap, StockCredentialProviderId } from "./stock-credentials";

import type { StockCredentialProviderId } from "./stock-credentials";

export type StockImageProviderSetting = "auto" | StockCredentialProviderId;

export interface ProjectImageSettings {
  stockProvider?: StockImageProviderSetting;
  autoFeaturedImage?: boolean;
  autoInlineImages?: boolean;
  maxInlineImages?: number;
  includeAttribution?: boolean;
  /** Project-level encrypted stock API keys (override org + platform for this site). */
  encryptedStockCredentials?: EncryptedStockCredentialsMap;
}

export interface ProjectTranslationSettings {
  /** Project override; wins over org key */
  encryptedDeeplApiKey?: string;
  /** Default true when key resolves and language != en */
  deeplRefinementEnabled?: boolean;
  /** Optional DeepL glossary ID for brand terms */
  deeplGlossaryId?: string;
}

export interface ContentStyle {
  tonePreset?: "professional" | "casual" | "technical" | "conversational";
  personaName?: string;
  defaultWordCount?: number;
  primaryLanguage?: string;
  forbiddenWords?: string[];
  readingLevel?: "general" | "intermediate" | "expert";
  /** Article humanization: off | light | strong */
  humanizationLevel?: "off" | "light" | "strong";
  /** Optional writing sample override for humanizer voice matching */
  writingSample?: string | null;
  imageSettings?: ProjectImageSettings;
  translationSettings?: ProjectTranslationSettings;
}

export const DEFAULT_IMAGE_SETTINGS: ProjectImageSettings = {
  stockProvider: "auto",
  autoFeaturedImage: true,
  autoInlineImages: true,
  maxInlineImages: 2,
  includeAttribution: false,
};

export type AutopilotCadence = "daily" | "weekly";
export type AutopilotPublishMode = "manual" | "draft" | "live";

export interface AutopilotSettings {
  enabled: boolean;
  cadence: AutopilotCadence;
  /** IANA timezone, e.g. America/New_York */
  timezone: string;
  /** manual = generate only; draft/live = auto-publish to CMS */
  publishMode: AutopilotPublishMode;
  /** Hour of day (0–23) in project timezone when autopilot may run */
  preferredRunHour: number;
  /** ISO timestamp of last successful autopilot generation */
  lastRunAt?: string;
  /** Auto-queue high-score keyword opportunities into content strategy */
  autoQueueOpportunities?: boolean;
  /** Minimum opportunity score (0–100) to auto-queue */
  opportunityScoreThreshold?: number;
  lastOpportunityDiscoveryAt?: string;
  lastSemrushDiscoveryAt?: string;
}

export const DEFAULT_AUTOPILOT_SETTINGS: AutopilotSettings = {
  enabled: false,
  cadence: "daily",
  timezone: "UTC",
  publishMode: "draft",
  preferredRunHour: 9,
};

export interface VisibilitySettings {
  llmTrackingEnabled: boolean;
  geoReauditEnabled: boolean;
  lastVisibilityCheckAt?: string;
  lastGeoReauditAt?: string;
}

export const DEFAULT_VISIBILITY_SETTINGS: VisibilitySettings = {
  llmTrackingEnabled: false,
  geoReauditEnabled: false,
};

/** Project-level publish defaults (primary CMS, etc.) */
export interface PublishingSettings {
  /** Default long-form blog destination when user does not pick one at generation */
  primaryBlogDestination?: string | null;
}

export const DEFAULT_PUBLISHING_SETTINGS: PublishingSettings = {};

export const websiteProjectsTable = sqliteTable("website_projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id")
    .references(() => organizationsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  sitemapUrl: text("sitemap_url"),
  pageCount: integer("page_count").notNull().default(0),
  crawlStatus: text("crawl_status").notNull().default("pending"),
  crawlData: text("crawl_data", { mode: "json" }),
  scrapeStatus: text("scrape_status"),
  scrapeData: text("scrape_data", { mode: "json" }),
  cmsIntegrations: text("cms_integrations", { mode: "json" }),
  contentStyle: text("content_style", { mode: "json" }),
  autopilotSettings: text("autopilot_settings", { mode: "json" }),
  visibilitySettings: text("visibility_settings", { mode: "json" }),
  publishingSettings: text("publishing_settings", { mode: "json" }).$type<PublishingSettings | null>(),
  socialScheduleSettings: text("social_schedule_settings", { mode: "json" }).$type<SocialScheduleSettings | null>(),
  socialHistorySyncMeta: text("social_history_sync_meta", { mode: "json" }).$type<SocialHistorySyncMeta | null>(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
}, (table) => [
  index("website_projects_user_id_idx").on(table.userId),
  index("website_projects_organization_id_idx").on(table.organizationId),
]);

export const insertWebsiteProjectSchema = createInsertSchema(websiteProjectsTable).omit({
  id: true,
  pageCount: true,
  crawlStatus: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertWebsiteProject = z.infer<typeof insertWebsiteProjectSchema>;
export type WebsiteProject = typeof websiteProjectsTable.$inferSelect;
