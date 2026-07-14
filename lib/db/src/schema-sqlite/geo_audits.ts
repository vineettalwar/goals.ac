import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { roadmapsTable } from "./roadmaps";
import { websiteProjectsTable } from "./website_projects";

export const geoAuditsTable = sqliteTable("geo_audits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roadmapId: integer("roadmap_id").references(() => roadmapsTable.id),
  websiteProjectId: integer("website_project_id").references(() => websiteProjectsTable.id, { onDelete: "set null" }),
  url: text("url").notNull(),
  geoScore: integer("geo_score").notNull(),
  issues: text("issues", { mode: "json" }).notNull().$type<GeoIssue[]>(),
  pageTitle: text("page_title"),
  metaDescription: text("meta_description"),
  hasSchemaOrg: integer("has_schema_org", { mode: "boolean" }).notNull().default(false),
  schemaTypes: text("schema_types", { mode: "json" }).$type<string[]>().notNull().default([]),
  h1Count: integer("h1_count").notNull().default(0),
  imageCount: integer("image_count").notNull().default(0),
  imagesMissingAlt: integer("images_missing_alt").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type GeoIssue = {
  check: string;
  status: "pass" | "fail" | "warn";
  detail: string;
  fix: string;
};

export type GeoAudit = typeof geoAuditsTable.$inferSelect;
export type NewGeoAudit = typeof geoAuditsTable.$inferInsert;
