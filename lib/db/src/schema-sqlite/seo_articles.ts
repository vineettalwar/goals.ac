import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { roadmapsTable } from "./roadmaps";
import { websiteProjectsTable } from "./website_projects";

export const seoArticlesTable = sqliteTable("seo_articles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roadmapId: integer("roadmap_id").references(() => roadmapsTable.id),
  websiteProjectId: integer("website_project_id").references(() => websiteProjectsTable.id, { onDelete: "set null" }),
  brandName: text("brand_name").notNull(),
  websiteUrl: text("website_url").notNull(),
  industry: text("industry").notNull(),
  location: text("location").notNull(),
  stage: text("stage").notNull(),
  title: text("title").notNull(),
  metaDescription: text("meta_description").notNull(),
  primaryKeyword: text("primary_keyword").notNull(),
  secondaryKeywords: text("secondary_keywords", { mode: "json" }).$type<string[]>().notNull().default([]),
  content: text("content").notNull(),
  wordCount: integer("word_count").notNull().default(0),
  status: text("status").notNull().default("draft"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const insertSeoArticleSchema = createInsertSchema(seoArticlesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSeoArticle = z.infer<typeof insertSeoArticleSchema>;
export type SeoArticle = typeof seoArticlesTable.$inferSelect;
