import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { websiteProjectsTable } from "./website_projects";
import { trackedKeywordsTable } from "./tracked_keywords";

export type KeywordRankAlertSeverity = "info" | "warning" | "critical";
export type KeywordRankAlertStatus = "open" | "dismissed" | "actioned";

export const keywordRankAlertsTable = sqliteTable("keyword_rank_alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  websiteProjectId: integer("website_project_id")
    .notNull()
    .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
  trackedKeywordId: integer("tracked_keyword_id")
    .notNull()
    .references(() => trackedKeywordsTable.id, { onDelete: "cascade" }),
  keyword: text("keyword").notNull(),
  previousPosition: integer("previous_position"),
  currentPosition: integer("current_position"),
  changeAmount: integer("change_amount").notNull(),
  severity: text("severity").notNull().$type<KeywordRankAlertSeverity>(),
  message: text("message").notNull(),
  status: text("status").notNull().default("open").$type<KeywordRankAlertStatus>(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type KeywordRankAlert = typeof keywordRankAlertsTable.$inferSelect;
export type NewKeywordRankAlert = typeof keywordRankAlertsTable.$inferInsert;
