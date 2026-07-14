import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { websiteProjectsTable } from "./website_projects";
import { llmVisibilityPromptsTable } from "./llm_visibility_prompts";

export type LlmVisibilityEngine = "chatgpt" | "perplexity" | "claude" | "gemini";

export const llmVisibilitySnapshotsTable = sqliteTable("llm_visibility_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  websiteProjectId: integer("website_project_id")
    .notNull()
    .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
  promptId: integer("prompt_id").references(() => llmVisibilityPromptsTable.id, { onDelete: "set null" }),
  prompt: text("prompt").notNull(),
  engine: text("engine").notNull().$type<LlmVisibilityEngine>(),
  cited: integer("cited", { mode: "boolean" }).notNull().default(false),
  citationUrl: text("citation_url"),
  competitorsMentioned: text("competitors_mentioned", { mode: "json" }).$type<string[]>().notNull().default([]),
  responseSnippet: text("response_snippet"),
  checkedAt: integer("checked_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type LlmVisibilitySnapshot = typeof llmVisibilitySnapshotsTable.$inferSelect;
export type NewLlmVisibilitySnapshot = typeof llmVisibilitySnapshotsTable.$inferInsert;
