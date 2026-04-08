import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { roadmapsTable } from "./roadmaps";

export const seoArticlesTable = pgTable("seo_articles", {
  id: serial("id").primaryKey(),
  roadmapId: integer("roadmap_id").references(() => roadmapsTable.id),
  brandName: text("brand_name").notNull(),
  websiteUrl: text("website_url").notNull(),
  industry: text("industry").notNull(),
  location: text("location").notNull(),
  stage: text("stage").notNull(),
  title: text("title").notNull(),
  metaDescription: text("meta_description").notNull(),
  primaryKeyword: text("primary_keyword").notNull(),
  secondaryKeywords: text("secondary_keywords").array().notNull().default([]),
  content: text("content").notNull(),
  wordCount: integer("word_count").notNull().default(0),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSeoArticleSchema = createInsertSchema(seoArticlesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSeoArticle = z.infer<typeof insertSeoArticleSchema>;
export type SeoArticle = typeof seoArticlesTable.$inferSelect;
