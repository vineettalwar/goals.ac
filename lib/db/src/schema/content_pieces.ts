import { pgTable, serial, text, integer, timestamp, date, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { websiteProjectsTable } from "./website_projects";
import { briefsTable } from "./briefs";
import { contentItemsTable } from "./content_strategies";

export const CONTENT_FORMAT_TYPES = [
  "blog_post",
  "news_article",
  "tutorial",
  "guide",
  "whitepaper",
  "pillar_page",
  "location_page",
  "infographic_outline",
  "linkedin_post",
  "twitter_thread",
  "instagram_post",
  "facebook_post",
  "bluesky_post",
  "mastodon_post",
  "email_sequence",
  "ad_copy",
  "landing_page_copy",
  "product_description",
  "press_release",
  "faq_article",
] as const;

export type ContentFormatType = (typeof CONTENT_FORMAT_TYPES)[number];

export type ContentPieceMetadata = {
  metaDescription?: string;
  featuredImageUrl?: string;
  faqSection?: { question: string; answer: string }[];
  citations?: { text: string; url: string; source: string }[];
  internalLinkSuggestions?: { anchorText: string; suggestedSlug: string; rationale?: string }[];
  jsonLdSchema?: object;
  humanized?: boolean;
};

export const contentPiecesTable = pgTable("content_pieces", {
  id: serial("id").primaryKey(),
  websiteProjectId: integer("website_project_id")
    .notNull()
    .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
  briefId: integer("brief_id").references(() => briefsTable.id, { onDelete: "set null" }),
  contentItemId: integer("content_item_id").references(() => contentItemsTable.id, { onDelete: "set null" }),
  parentPieceId: integer("parent_piece_id"),
  formatType: text("format_type").notNull().$type<ContentFormatType>(),
  title: text("title").notNull(),
  targetKeyword: text("target_keyword").notNull().default(""),
  bodyMarkdown: text("body_markdown").notNull().default(""),
  status: text("status").notNull().default("draft"),
  wordCount: integer("word_count").notNull().default(0),
  plannedDate: date("planned_date"),
  publishedUrl: text("published_url"),
  publishPlatform: text("publish_platform"),
  publishError: text("publish_error"),
  cacheKey: text("cache_key"),
  pieceMetadata: jsonb("piece_metadata").$type<ContentPieceMetadata | null>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("content_pieces_website_project_id_idx").on(table.websiteProjectId),
  index("content_pieces_brief_id_idx").on(table.briefId),
  index("content_pieces_content_item_id_idx").on(table.contentItemId),
]);

export const insertContentPieceSchema = createInsertSchema(contentPiecesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertContentPiece = z.infer<typeof insertContentPieceSchema>;
export type ContentPiece = typeof contentPiecesTable.$inferSelect;
