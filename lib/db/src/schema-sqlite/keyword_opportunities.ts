import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { websiteProjectsTable } from "./website_projects";
import { contentItemsTable } from "./content_strategies";

export type KeywordOpportunitySource =
  | "competitor_gap"
  | "rank_drop"
  | "content_refresh"
  | "ai_analysis"
  | "manual"
  | "gsc_query"
  | "csv_import"
  | "google_sheets"
  | "semrush";
export type KeywordOpportunityStatus = "open" | "queued" | "dismissed";
export type KeywordDifficultyLevel = "low" | "medium" | "high";

export const keywordOpportunitiesTable = sqliteTable("keyword_opportunities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  websiteProjectId: integer("website_project_id")
    .notNull()
    .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
  keyword: text("keyword").notNull(),
  source: text("source").notNull().$type<KeywordOpportunitySource>(),
  competitorUrl: text("competitor_url"),
  estimatedVolume: text("estimated_volume"),
  difficulty: text("difficulty").$type<KeywordDifficultyLevel>(),
  opportunityScore: integer("opportunity_score").notNull().default(0),
  intent: text("intent"),
  suggestedTitle: text("suggested_title").notNull(),
  suggestedAngle: text("suggested_angle").notNull(),
  status: text("status").notNull().default("open").$type<KeywordOpportunityStatus>(),
  contentItemId: integer("content_item_id").references(() => contentItemsTable.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type KeywordOpportunity = typeof keywordOpportunitiesTable.$inferSelect;
export type NewKeywordOpportunity = typeof keywordOpportunitiesTable.$inferInsert;
