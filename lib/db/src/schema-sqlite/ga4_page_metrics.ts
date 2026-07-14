import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";
import { websiteProjectsTable } from "./website_projects";
import { analyticsPropertyConnectionsTable } from "./analytics_property_connections";

export const ga4PageMetricsTable = sqliteTable(
  "ga4_page_metrics",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id")
      .notNull()
      .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
    connectionId: integer("connection_id")
      .notNull()
      .references(() => analyticsPropertyConnectionsTable.id, { onDelete: "cascade" }),
    pagePath: text("page_path").notNull(),
    date: text("date").notNull(),
    sessions: integer("sessions").notNull().default(0),
    users: integer("users").notNull().default(0),
    pageviews: integer("pageviews").notNull().default(0),
    engagementRate: real("engagement_rate").notNull().default(0),
    avgSessionDuration: real("avg_session_duration").notNull().default(0),
    bounceRate: real("bounce_rate").notNull().default(0),
    ingestedAt: integer("ingested_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("ga4_page_metrics_project_page_path_date_idx").on(table.projectId, table.pagePath, table.date),
  ],
);

export type Ga4PageMetric = typeof ga4PageMetricsTable.$inferSelect;
export type NewGa4PageMetric = typeof ga4PageMetricsTable.$inferInsert;
