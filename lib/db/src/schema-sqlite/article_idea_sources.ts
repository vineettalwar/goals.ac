import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
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

export const articleIdeaSourcesTable = sqliteTable("article_idea_sources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull().$type<ArticleIdeaSourceType>(),
  label: text("label").notNull(),
  spreadsheetId: text("spreadsheet_id").notNull(),
  sheetName: text("sheet_name"),
  sheetGid: text("sheet_gid"),
  encryptedConfig: text("encrypted_config"),
  columnMapping: text("column_mapping", { mode: "json" }).$type<ArticleIdeaColumnMapping>(),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp_ms" }),
  syncStatus: text("sync_status").notNull().default("idle").$type<ArticleIdeaSyncStatus>(),
  rowCount: integer("row_count").notNull().default(0),
  syncError: text("sync_error"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});

export type ArticleIdeaSource = typeof articleIdeaSourcesTable.$inferSelect;
export type NewArticleIdeaSource = typeof articleIdeaSourcesTable.$inferInsert;
