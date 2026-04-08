import { pgTable, serial, integer, text, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { roadmapsTable } from "./roadmaps";

export const geoAuditsTable = pgTable("geo_audits", {
  id: serial("id").primaryKey(),
  roadmapId: integer("roadmap_id").references(() => roadmapsTable.id),
  url: text("url").notNull(),
  geoScore: integer("geo_score").notNull(),
  issues: jsonb("issues").notNull().$type<GeoIssue[]>(),
  pageTitle: text("page_title"),
  metaDescription: text("meta_description"),
  hasSchemaOrg: boolean("has_schema_org").notNull().default(false),
  schemaTypes: text("schema_types").array().notNull().default([]),
  h1Count: integer("h1_count").notNull().default(0),
  imageCount: integer("image_count").notNull().default(0),
  imagesMissingAlt: integer("images_missing_alt").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GeoIssue = {
  check: string;
  status: "pass" | "fail" | "warn";
  detail: string;
  fix: string;
};

export type GeoAudit = typeof geoAuditsTable.$inferSelect;
export type NewGeoAudit = typeof geoAuditsTable.$inferInsert;
