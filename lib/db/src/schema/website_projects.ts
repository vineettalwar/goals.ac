import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export interface ContentStyle {
  tonePreset?: "professional" | "casual" | "technical" | "conversational";
  personaName?: string;
  defaultWordCount?: number;
  primaryLanguage?: string;
  forbiddenWords?: string[];
  readingLevel?: "general" | "intermediate" | "expert";
}

export const websiteProjectsTable = pgTable("website_projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  sitemapUrl: text("sitemap_url"),
  pageCount: integer("page_count").notNull().default(0),
  crawlStatus: text("crawl_status").notNull().default("pending"),
  crawlData: jsonb("crawl_data"),
  scrapeStatus: text("scrape_status"),
  scrapeData: jsonb("scrape_data"),
  cmsIntegrations: jsonb("cms_integrations"),
  contentStyle: jsonb("content_style"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWebsiteProjectSchema = createInsertSchema(websiteProjectsTable).omit({
  id: true,
  pageCount: true,
  crawlStatus: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertWebsiteProject = z.infer<typeof insertWebsiteProjectSchema>;
export type WebsiteProject = typeof websiteProjectsTable.$inferSelect;
