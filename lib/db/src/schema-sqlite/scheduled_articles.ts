import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { marketingPersonasTable } from "./marketing_personas";

export const scheduledArticlesTable = sqliteTable("scheduled_articles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  personaId: integer("persona_id").references(() => marketingPersonasTable.id, {
    onDelete: "set null",
  }),
  title: text("title"),
  bodyMarkdown: text("body_markdown"),
  metaDescription: text("meta_description"),
  primaryKeyword: text("primary_keyword"),
  secondaryKeywords: text("secondary_keywords", { mode: "json" }).$type<string[]>().notNull().default([]),
  wordCount: integer("word_count").notNull().default(0),
  // pending | generating | ready | published | failed
  status: text("status").notNull().default("pending"),
  scheduledDate: text("scheduled_date"),
  publishedUrl: text("published_url"),
  wordpressPostId: integer("wordpress_post_id"),
  errorMessage: text("error_message"),
  // Enriched article metadata: citations, faqSection, jsonLdSchema, personaAlignment, etc.
  articleMetadata: text("article_metadata", { mode: "json" }),
  humanized: integer("humanized", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});

export const insertScheduledArticleSchema = createInsertSchema(scheduledArticlesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertScheduledArticle = z.infer<typeof insertScheduledArticleSchema>;
export type ScheduledArticle = typeof scheduledArticlesTable.$inferSelect;
