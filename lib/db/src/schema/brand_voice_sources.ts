import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { websiteProjectsTable } from "./website_projects";

export const BRAND_VOICE_SOURCE_TYPES = [
  "website",
  "upload",
  "cms",
  "published",
  // A generated draft after the founder edited it. The strongest voice signal
  // available, because they corrected it by hand.
  "user_edit",
  "social_linkedin",
  "social_twitter",
  "social_facebook",
  "social_instagram",
  "social_bluesky",
  "social_mastodon",
] as const;

export type BrandVoiceSourceType = (typeof BRAND_VOICE_SOURCE_TYPES)[number];

export type BrandVoiceSourceStatus = "pending" | "indexed" | "failed";

export type BrandVoiceSourceMetadata = {
  fileName?: string;
  mimeType?: string;
  contentPieceId?: number;
  weight?: number;
  [key: string]: unknown;
};

export const brandVoiceSourcesTable = pgTable(
  "brand_voice_sources",
  {
    id: serial("id").primaryKey(),
    websiteProjectId: integer("website_project_id")
      .notNull()
      .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
    sourceType: text("source_type").$type<BrandVoiceSourceType>().notNull(),
    sourceUrl: text("source_url").notNull().default(""),
    title: text("title").notNull().default(""),
    rawText: text("raw_text"),
    metadata: jsonb("metadata").$type<BrandVoiceSourceMetadata | null>(),
    status: text("status").$type<BrandVoiceSourceStatus>().notNull().default("pending"),
    ingestedAt: timestamp("ingested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("brand_voice_sources_project_idx").on(table.websiteProjectId),
    index("brand_voice_sources_project_type_idx").on(
      table.websiteProjectId,
      table.sourceType,
    ),
  ],
);

export const insertBrandVoiceSourceSchema = createInsertSchema(
  brandVoiceSourcesTable,
).omit({
  id: true,
  ingestedAt: true,
  updatedAt: true,
});

export type InsertBrandVoiceSource = z.infer<typeof insertBrandVoiceSourceSchema>;
export type BrandVoiceSource = typeof brandVoiceSourcesTable.$inferSelect;
