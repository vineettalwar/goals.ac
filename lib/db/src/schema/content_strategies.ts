import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { roadmapsTable } from "./roadmaps";

export const contentStrategiesTable = pgTable("content_strategies", {
  id: serial("id").primaryKey(),
  roadmapId: integer("roadmap_id")
    .notNull()
    .references(() => roadmapsTable.id),
  industry: text("industry").notNull(),
  location: text("location").notNull(),
  stage: text("stage").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contentItemsTable = pgTable("content_items", {
  id: serial("id").primaryKey(),
  strategyId: integer("strategy_id")
    .notNull()
    .references(() => contentStrategiesTable.id),
  day: integer("day").notNull(),
  title: text("title").notNull(),
  format: text("format").notNull(),
  topicAngle: text("topic_angle").notNull(),
  primaryKeyword: text("primary_keyword").notNull(),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ContentStrategy = typeof contentStrategiesTable.$inferSelect;
export type ContentItem = typeof contentItemsTable.$inferSelect;
