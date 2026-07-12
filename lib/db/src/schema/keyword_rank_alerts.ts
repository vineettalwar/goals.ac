import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { websiteProjectsTable } from "./website_projects";
import { trackedKeywordsTable } from "./tracked_keywords";

export type KeywordRankAlertSeverity = "info" | "warning" | "critical";
export type KeywordRankAlertStatus = "open" | "dismissed" | "actioned";

export const keywordRankAlertsTable = pgTable("keyword_rank_alerts", {
  id: serial("id").primaryKey(),
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type KeywordRankAlert = typeof keywordRankAlertsTable.$inferSelect;
export type NewKeywordRankAlert = typeof keywordRankAlertsTable.$inferInsert;
