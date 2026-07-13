import { pgTable, serial, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { organizationsTable } from "./organizations";

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
}

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

export const websiteProjectsTable = pgTable("website_projects", {
  id: serial("id").primaryKey(),
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
  crawlData: jsonb("crawl_data"),
  scrapeStatus: text("scrape_status"),
  scrapeData: jsonb("scrape_data"),
  cmsIntegrations: jsonb("cms_integrations"),
  contentStyle: jsonb("content_style"),
  autopilotSettings: jsonb("autopilot_settings"),
  visibilitySettings: jsonb("visibility_settings"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
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
