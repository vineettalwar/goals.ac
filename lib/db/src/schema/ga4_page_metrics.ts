import { pgTable, serial, integer, text, date, real, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { websiteProjectsTable } from "./website_projects";
import { analyticsPropertyConnectionsTable } from "./analytics_property_connections";

export const ga4PageMetricsTable = pgTable(
  "ga4_page_metrics",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
    connectionId: integer("connection_id")
      .notNull()
      .references(() => analyticsPropertyConnectionsTable.id, { onDelete: "cascade" }),
    pagePath: text("page_path").notNull(),
    date: date("date").notNull(),
    sessions: integer("sessions").notNull().default(0),
    users: integer("users").notNull().default(0),
    pageviews: integer("pageviews").notNull().default(0),
    engagementRate: real("engagement_rate").notNull().default(0),
    avgSessionDuration: real("avg_session_duration").notNull().default(0),
    bounceRate: real("bounce_rate").notNull().default(0),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("ga4_page_metrics_project_page_path_date_idx").on(table.projectId, table.pagePath, table.date),
  ],
);

export type Ga4PageMetric = typeof ga4PageMetricsTable.$inferSelect;
export type NewGa4PageMetric = typeof ga4PageMetricsTable.$inferInsert;
