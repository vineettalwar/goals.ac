import { pgTable, serial, integer, text, date, real, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { websiteProjectsTable } from "./website_projects";
import { searchPropertyConnectionsTable } from "./search_property_connections";

export const gscSearchQueriesTable = pgTable(
  "gsc_search_queries",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
    connectionId: integer("connection_id")
      .notNull()
      .references(() => searchPropertyConnectionsTable.id, { onDelete: "cascade" }),
    query: text("query").notNull(),
    page: text("page"),
    date: date("date").notNull(),
    impressions: integer("impressions").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
    ctr: real("ctr").notNull().default(0),
    position: real("position").notNull().default(0),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().defaultNow(),
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
