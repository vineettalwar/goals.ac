import { pgTable, serial, integer, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { websiteProjectsTable } from "./website_projects";

export const ARTICLE_IDEA_SOURCE_TYPES = ["google_sheets"] as const;
export type ArticleIdeaSourceType = (typeof ARTICLE_IDEA_SOURCE_TYPES)[number];

export const ARTICLE_IDEA_SYNC_STATUSES = ["idle", "syncing", "ok", "error"] as const;
export type ArticleIdeaSyncStatus = (typeof ARTICLE_IDEA_SYNC_STATUSES)[number];

export type ArticleIdeaColumnMapping = {
  keyword?: string;
  title?: string;
  angle?: string;
  volume?: string;
  intent?: string;
  difficulty?: string;
};

export const articleIdeaSourcesTable = pgTable("article_idea_sources", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull().$type<ArticleIdeaSourceType>(),
  label: text("label").notNull(),
  spreadsheetId: text("spreadsheet_id").notNull(),
  sheetName: text("sheet_name"),
  sheetGid: text("sheet_gid"),
  encryptedConfig: text("encrypted_config"),
  columnMapping: jsonb("column_mapping").$type<ArticleIdeaColumnMapping>(),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  syncStatus: text("sync_status").notNull().default("idle").$type<ArticleIdeaSyncStatus>(),
  rowCount: integer("row_count").notNull().default(0),
  syncError: text("sync_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type ArticleIdeaSource = typeof articleIdeaSourcesTable.$inferSelect;
export type NewArticleIdeaSource = typeof articleIdeaSourcesTable.$inferInsert;
