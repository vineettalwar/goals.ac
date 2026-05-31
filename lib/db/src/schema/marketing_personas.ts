import { pgTable, serial, text, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const marketingPersonasTable = pgTable("marketing_personas", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  ageRange: text("age_range").notNull().default(""),
  jobTitle: text("job_title").notNull().default(""),
  painPoints: text("pain_points").array().notNull().default([]),
  goals: text("goals").array().notNull().default([]),
  preferredContent: text("preferred_content").array().notNull().default([]),
  demographics: jsonb("demographics"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMarketingPersonaSchema = createInsertSchema(marketingPersonasTable).omit({
  id: true,
  createdAt: true,
});
export type InsertMarketingPersona = z.infer<typeof insertMarketingPersonaSchema>;
export type MarketingPersona = typeof marketingPersonasTable.$inferSelect;
