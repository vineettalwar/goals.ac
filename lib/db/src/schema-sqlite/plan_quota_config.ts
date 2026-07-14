import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

/** Per-plan platform-key quota limits. `null` column = unlimited / not configured. */
export const planQuotaConfigTable = sqliteTable("plan_quota_config", {
  planId: text("plan_id").primaryKey(),
  articlesPerMonth: integer("articles_per_month"),
  roadmapsPerMonth: integer("roadmaps_per_month"),
  sites: integer("sites"),
  updatedBy: integer("updated_by").references(() => usersTable.id, { onDelete: "set null" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});

export const insertPlanQuotaConfigSchema = createInsertSchema(planQuotaConfigTable).omit({
  updatedAt: true,
});
export type InsertPlanQuotaConfig = z.infer<typeof insertPlanQuotaConfigSchema>;
export type PlanQuotaConfig = typeof planQuotaConfigTable.$inferSelect;
