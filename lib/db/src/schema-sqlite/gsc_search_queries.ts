import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";
import { websiteProjectsTable } from "./website_projects";
import { searchPropertyConnectionsTable } from "./search_property_connections";

export const gscSearchQueriesTable = sqliteTable(
  "gsc_search_queries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id")
      .notNull()
      .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
    connectionId: integer("connection_id")
      .notNull()
      .references(() => searchPropertyConnectionsTable.id, { onDelete: "cascade" }),
    query: text("query").notNull(),
    page: text("page"),
    date: text("date").notNull(),
    impressions: integer("impressions").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
    ctr: real("ctr").notNull().default(0),
    position: real("position").notNull().default(0),
    ingestedAt: integer("ingested_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("gsc_search_queries_project_query_page_date_idx").on(
      table.projectId,
      table.query,
      table.page,
      table.date,
    ),
  ],
);

export type GscSearchQuery = typeof gscSearchQueriesTable.$inferSelect;
export type NewGscSearchQuery = typeof gscSearchQueriesTable.$inferInsert;
