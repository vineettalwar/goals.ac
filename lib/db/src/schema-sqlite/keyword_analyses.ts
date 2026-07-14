import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { websiteProjectsTable } from "./website_projects";

export type KeywordAnalysisPayload = {
  keywords: Array<{
    keyword: string;
    estimatedVolume: string;
    difficulty: "low" | "medium" | "high";
    aiVisibility: number;
    opportunities: string[];
    suggestedContent: string;
  }>;
  topOpportunity: string;
  summary: string;
};

export const keywordAnalysesTable = sqliteTable("keyword_analyses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  websiteProjectId: integer("website_project_id").references(() => websiteProjectsTable.id, {
    onDelete: "set null",
  }),
  keywords: text("keywords", { mode: "json" }).$type<string[]>().notNull(),
  websiteUrl: text("website_url"),
  result: text("result", { mode: "json" }).notNull().$type<KeywordAnalysisPayload>(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type KeywordAnalysis = typeof keywordAnalysesTable.$inferSelect;
export type NewKeywordAnalysis = typeof keywordAnalysesTable.$inferInsert;
