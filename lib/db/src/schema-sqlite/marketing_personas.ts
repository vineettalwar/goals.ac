import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const marketingPersonasTable = sqliteTable("marketing_personas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  ageRange: text("age_range").notNull().default(""),
  jobTitle: text("job_title").notNull().default(""),
  painPoints: text("pain_points", { mode: "json" }).$type<string[]>().notNull().default([]),
  goals: text("goals", { mode: "json" }).$type<string[]>().notNull().default([]),
  preferredContent: text("preferred_content", { mode: "json" }).$type<string[]>().notNull().default([]),
  demographics: text("demographics", { mode: "json" }),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const insertMarketingPersonaSchema = createInsertSchema(marketingPersonasTable).omit({
  id: true,
  createdAt: true,
});
export type InsertMarketingPersona = z.infer<typeof insertMarketingPersonaSchema>;
export type MarketingPersona = typeof marketingPersonasTable.$inferSelect;
