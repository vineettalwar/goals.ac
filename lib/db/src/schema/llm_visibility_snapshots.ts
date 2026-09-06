import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { websiteProjectsTable } from "./website_projects";
import { llmVisibilityPromptsTable } from "./llm_visibility_prompts";

export type LlmVisibilityEngine = "chatgpt" | "perplexity" | "claude" | "gemini";
export type LlmVisibilitySource = "live" | "simulated";

export const llmVisibilitySnapshotsTable = pgTable("llm_visibility_snapshots", {
  id: serial("id").primaryKey(),
  websiteProjectId: integer("website_project_id")
    .notNull()
    .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
  promptId: integer("prompt_id").references(() => llmVisibilityPromptsTable.id, { onDelete: "set null" }),
  prompt: text("prompt").notNull(),
  engine: text("engine").notNull().$type<LlmVisibilityEngine>(),
  cited: boolean("cited").notNull().default(false),
  citationUrl: text("citation_url"),
  competitorsMentioned: text("competitors_mentioned").array().notNull().default([]),
  responseSnippet: text("response_snippet"),
  source: text("source").notNull().default("simulated").$type<LlmVisibilitySource>(),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LlmVisibilitySnapshot = typeof llmVisibilitySnapshotsTable.$inferSelect;
export type NewLlmVisibilitySnapshot = typeof llmVisibilitySnapshotsTable.$inferInsert;
