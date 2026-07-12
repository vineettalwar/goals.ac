import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { websiteProjectsTable } from "./website_projects";

export type LlmVisibilityPromptCategory = "brand" | "keyword" | "competitor" | "custom";

export const llmVisibilityPromptsTable = pgTable("llm_visibility_prompts", {
  id: serial("id").primaryKey(),
  websiteProjectId: integer("website_project_id")
    .notNull()
    .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  category: text("category").notNull().default("custom").$type<LlmVisibilityPromptCategory>(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LlmVisibilityPrompt = typeof llmVisibilityPromptsTable.$inferSelect;
export type NewLlmVisibilityPrompt = typeof llmVisibilityPromptsTable.$inferInsert;
