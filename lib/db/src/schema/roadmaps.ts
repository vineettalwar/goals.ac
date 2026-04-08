import { pgTable, serial, text, jsonb, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const roadmapsTable = pgTable("roadmaps", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  industry: text("industry").notNull(),
  location: text("location").notNull(),
  stage: text("stage").notNull(),
  content: jsonb("content").notNull(),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRoadmapSchema = createInsertSchema(roadmapsTable).omit({
  id: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRoadmap = z.infer<typeof insertRoadmapSchema>;
export type Roadmap = typeof roadmapsTable.$inferSelect;
