import { pgTable, serial, text, integer, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { marketingPersonasTable } from "./marketing_personas";

export const scheduledArticlesTable = pgTable("scheduled_articles", {
  id: serial("id").primaryKey(),
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
  secondaryKeywords: text("secondary_keywords").array().notNull().default([]),
  wordCount: integer("word_count").notNull().default(0),
  // pending | generating | ready | published | failed
  status: text("status").notNull().default("pending"),
  scheduledDate: date("scheduled_date"),
  publishedUrl: text("published_url"),
  wordpressPostId: integer("wordpress_post_id"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertScheduledArticleSchema = createInsertSchema(scheduledArticlesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertScheduledArticle = z.infer<typeof insertScheduledArticleSchema>;
export type ScheduledArticle = typeof scheduledArticlesTable.$inferSelect;
