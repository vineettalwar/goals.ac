import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { websiteProjectsTable } from "./website_projects";

export const trackedKeywordsTable = sqliteTable("tracked_keywords", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  websiteProjectId: integer("website_project_id")
    .notNull()
    .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
  keyword: text("keyword").notNull(),
  targetUrl: text("target_url"),
  location: text("location").notNull().default("United States"),
  language: text("language").notNull().default("en"),
  device: text("device").notNull().default("desktop"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastCheckedAt: integer("last_checked_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index("tracked_keywords_website_project_id_idx").on(table.websiteProjectId),
]);

export type TrackedKeyword = typeof trackedKeywordsTable.$inferSelect;
export type NewTrackedKeyword = typeof trackedKeywordsTable.$inferInsert;
