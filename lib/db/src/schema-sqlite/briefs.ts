import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { goalsTable } from "./goals";

export const briefsTable = sqliteTable("briefs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  goalId: integer("goal_id")
    .notNull()
    .references(() => goalsTable.id, { onDelete: "cascade" }),
  targetKeywordCluster: text("target_keyword_cluster"),
  searchIntent: text("search_intent"),
  // tofu | mofu | bofu
  funnelStage: text("funnel_stage"),
  workingTitle: text("working_title").notNull(),
  outline: text("outline", { mode: "json" }),
  angle: text("angle"),
  cta: text("cta"),
  internalLinkTargets: text("internal_link_targets", { mode: "json" }),
  successMetric: text("success_metric"),
  format: text("format"),
  wordCount: integer("word_count"),
  // draft | approved | generating | done
  status: text("status").notNull().default("draft"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
}, (table) => [
  index("briefs_goal_id_idx").on(table.goalId),
]);

export const insertBriefSchema = createInsertSchema(briefsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBrief = z.infer<typeof insertBriefSchema>;
export type Brief = typeof briefsTable.$inferSelect;
