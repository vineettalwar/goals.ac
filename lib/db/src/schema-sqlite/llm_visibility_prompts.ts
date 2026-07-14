import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { websiteProjectsTable } from "./website_projects";

export type LlmVisibilityPromptCategory = "brand" | "keyword" | "competitor" | "custom";

export const llmVisibilityPromptsTable = sqliteTable("llm_visibility_prompts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  websiteProjectId: integer("website_project_id")
    .notNull()
    .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  category: text("category").notNull().default("custom").$type<LlmVisibilityPromptCategory>(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type LlmVisibilityPrompt = typeof llmVisibilityPromptsTable.$inferSelect;
export type NewLlmVisibilityPrompt = typeof llmVisibilityPromptsTable.$inferInsert;
