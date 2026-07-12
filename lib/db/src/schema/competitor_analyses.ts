import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
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

export const competitorAnalysesTable = pgTable("competitor_analyses", {
  id: serial("id").primaryKey(),
  websiteProjectId: integer("website_project_id").references(() => websiteProjectsTable.id, {
    onDelete: "set null",
  }),
  competitorUrl: text("competitor_url").notNull(),
  industry: text("industry").notNull(),
  location: text("location").notNull(),
  stage: text("stage").notNull(),
  result: jsonb("result").notNull().$type<CompetitorAnalysisPayload>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CompetitorAnalysis = typeof competitorAnalysesTable.$inferSelect;
export type NewCompetitorAnalysis = typeof competitorAnalysesTable.$inferInsert;
