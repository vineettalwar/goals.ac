import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { websiteProjectsTable } from "./website_projects";
import { usersTable } from "./users";

export const ARTICLE_IDEA_IMPORT_SOURCES = ["csv", "manual", "google_sheets"] as const;
export type ArticleIdeaImportSource = (typeof ARTICLE_IDEA_IMPORT_SOURCES)[number];

export const articleIdeaImportsTable = sqliteTable("article_idea_imports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
  sourceType: text("source_type").notNull().$type<ArticleIdeaImportSource>(),
  fileName: text("file_name"),
  rowCount: integer("row_count").notNull().default(0),
  errorCount: integer("error_count").notNull().default(0),
  importedByUserId: integer("imported_by_user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type ArticleIdeaImport = typeof articleIdeaImportsTable.$inferSelect;
export type NewArticleIdeaImport = typeof articleIdeaImportsTable.$inferInsert;
