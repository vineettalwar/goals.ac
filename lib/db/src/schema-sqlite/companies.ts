import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const companiesTable = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  websiteUrl: text("website_url").notNull(),
  industry: text("industry").notNull().default(""),
  description: text("description").notNull().default(""),
  targetAudience: text("target_audience").notNull().default(""),
  competitorUrls: text("competitor_urls", { mode: "json" }).$type<string[]>().notNull().default([]),
  onboardingComplete: integer("onboarding_complete", { mode: "boolean" }).notNull().default(false),
  // Article humanization: off | light | strong
  humanizationLevel: text("humanization_level").notNull().default("light"),
  writingSample: text("writing_sample"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
}, (table) => [
  index("companies_user_id_idx").on(table.userId),
]);

export const insertCompanySchema = createInsertSchema(companiesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companiesTable.$inferSelect;
