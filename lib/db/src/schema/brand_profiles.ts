import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { websiteProjectsTable } from "./website_projects";

export const brandProfilesTable = pgTable("brand_profiles", {
  id: serial("id").primaryKey(),
  websiteProjectId: integer("website_project_id")
    .notNull()
    .unique()
    .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
  companyName: text("company_name").notNull().default(""),
  industry: text("industry").notNull().default(""),
  targetAudience: text("target_audience").notNull().default(""),
  voiceTone: text("voice_tone").notNull().default(""),
  primaryKeywords: text("primary_keywords").array().notNull().default([]),
  competitorUrls: text("competitor_urls").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBrandProfileSchema = createInsertSchema(brandProfilesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBrandProfile = z.infer<typeof insertBrandProfileSchema>;
export type BrandProfile = typeof brandProfilesTable.$inferSelect;
