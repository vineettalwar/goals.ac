import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { roadmapsTable } from "./roadmaps";
import { websiteProjectsTable } from "./website_projects";

export const contentStrategiesTable = sqliteTable("content_strategies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roadmapId: integer("roadmap_id")
    .notNull()
    .references(() => roadmapsTable.id),
  websiteProjectId: integer("website_project_id").references(() => websiteProjectsTable.id, { onDelete: "set null" }),
  industry: text("industry").notNull(),
  location: text("location").notNull(),
  stage: text("stage").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const contentItemsTable = sqliteTable("content_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  strategyId: integer("strategy_id")
    .notNull()
    .references(() => contentStrategiesTable.id),
  day: integer("day").notNull(),
  title: text("title").notNull(),
  format: text("format").notNull(),
  topicAngle: text("topic_angle").notNull(),
  primaryKeyword: text("primary_keyword").notNull(),
  status: text("status").notNull().default("draft"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type ContentStrategy = typeof contentStrategiesTable.$inferSelect;
export type ContentItem = typeof contentItemsTable.$inferSelect;
