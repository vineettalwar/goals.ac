import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
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

export const keywordAnalysesTable = pgTable("keyword_analyses", {
  id: serial("id").primaryKey(),
  websiteProjectId: integer("website_project_id").references(() => websiteProjectsTable.id, {
    onDelete: "set null",
  }),
  keywords: text("keywords").array().notNull(),
  websiteUrl: text("website_url"),
  result: jsonb("result").notNull().$type<KeywordAnalysisPayload>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type KeywordAnalysis = typeof keywordAnalysesTable.$inferSelect;
export type NewKeywordAnalysis = typeof keywordAnalysesTable.$inferInsert;
