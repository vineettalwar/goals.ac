import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { websiteProjectsTable } from "./website_projects";

export type CompetitorAnalysisPayload = {
  competitorName: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  contentGaps: string[];
  geoGaps: string[];
  quickWins: string[];
  threatLevel: "low" | "medium" | "high";
};

export const competitorAnalysesTable = sqliteTable("competitor_analyses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  websiteProjectId: integer("website_project_id").references(() => websiteProjectsTable.id, {
    onDelete: "set null",
  }),
  competitorUrl: text("competitor_url").notNull(),
  industry: text("industry").notNull(),
  location: text("location").notNull(),
  stage: text("stage").notNull(),
  result: text("result", { mode: "json" }).notNull().$type<CompetitorAnalysisPayload>(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type CompetitorAnalysis = typeof competitorAnalysesTable.$inferSelect;
export type NewCompetitorAnalysis = typeof competitorAnalysesTable.$inferInsert;
