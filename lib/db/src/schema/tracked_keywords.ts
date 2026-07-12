import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { websiteProjectsTable } from "./website_projects";

export const trackedKeywordsTable = pgTable("tracked_keywords", {
  id: serial("id").primaryKey(),
  websiteProjectId: integer("website_project_id")
    .notNull()
    .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
  keyword: text("keyword").notNull(),
  targetUrl: text("target_url"),
  location: text("location").notNull().default("United States"),
  language: text("language").notNull().default("en"),
  device: text("device").notNull().default("desktop"),
  isActive: boolean("is_active").notNull().default(true),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TrackedKeyword = typeof trackedKeywordsTable.$inferSelect;
export type NewTrackedKeyword = typeof trackedKeywordsTable.$inferInsert;
