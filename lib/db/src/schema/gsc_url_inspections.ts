import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { websiteProjectsTable } from "./website_projects";
import { contentPiecesTable } from "./content_pieces";

export const gscUrlInspectionsTable = pgTable(
  "gsc_url_inspections",
  {
    id: serial("id").primaryKey(),
    websiteProjectId: integer("website_project_id")
      .notNull()
      .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
    contentPieceId: integer("content_piece_id").references(
      () => contentPiecesTable.id,
      { onDelete: "set null" },
    ),
    publishRecordId: integer("publish_record_id"),
    inspectionUrl: text("inspection_url").notNull(),
    siteUrl: text("site_url").notNull(),
    verdict: text("verdict"),
    coverageState: text("coverage_state"),
    indexingState: text("indexing_state"),
    robotsTxtState: text("robots_txt_state"),
    pageFetchState: text("page_fetch_state"),
    googleCanonical: text("google_canonical"),
    userCanonical: text("user_canonical"),
    lastCrawlTime: text("last_crawl_time"),
    inspectedAt: timestamp("inspected_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    errorMessage: text("error_message"),
    rawJson: jsonb("raw_json"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("gsc_url_inspections_project_inspected_idx").on(
      t.websiteProjectId,
      t.inspectedAt,
    ),
    index("gsc_url_inspections_content_piece_idx").on(t.contentPieceId),
  ],
);

export type GscUrlInspection = typeof gscUrlInspectionsTable.$inferSelect;
export type NewGscUrlInspection = typeof gscUrlInspectionsTable.$inferInsert;
