import { pgTable, serial, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { goalsTable } from "./goals";

export const briefsTable = pgTable("briefs", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id")
    .notNull()
    .references(() => goalsTable.id, { onDelete: "cascade" }),
  targetKeywordCluster: text("target_keyword_cluster"),
  searchIntent: text("search_intent"),
  // tofu | mofu | bofu
  funnelStage: text("funnel_stage"),
  workingTitle: text("working_title").notNull(),
  outline: jsonb("outline"),
  angle: text("angle"),
  cta: text("cta"),
  internalLinkTargets: jsonb("internal_link_targets"),
  successMetric: text("success_metric"),
  format: text("format"),
  wordCount: integer("word_count"),
  // draft | approved | generating | done
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
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
