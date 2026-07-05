import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const companiesTable = pgTable("companies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  websiteUrl: text("website_url").notNull(),
  industry: text("industry").notNull().default(""),
  description: text("description").notNull().default(""),
  targetAudience: text("target_audience").notNull().default(""),
  competitorUrls: text("competitor_urls").array().notNull().default([]),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  // Article humanization: off | light | strong
  humanizationLevel: text("humanization_level").notNull().default("light"),
  writingSample: text("writing_sample"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCompanySchema = createInsertSchema(companiesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companiesTable.$inferSelect;
