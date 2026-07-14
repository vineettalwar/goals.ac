import { pgTable, serial, text, integer, timestamp, date, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { websiteProjectsTable } from "./website_projects";
import { briefsTable } from "./briefs";
import { contentItemsTable } from "./content_strategies";
import { usersTable } from "./users";
import type { ContentPieceApprovalStatus, EvergreenConfig } from "./platform_voices";
import type { StockCredentialProviderId } from "./stock-credentials";

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

export type ContentPieceImageRole = "featured" | "inline";

export type ContentPieceImageRef = {
  role: ContentPieceImageRole;
  provider: StockCredentialProviderId;
  remoteId: string;
  remoteUrl: string;
  alt: string;
  title: string;
  searchQuery: string;
  rankScore: number;
  photographer: string;
  photographerUrl: string;
  sectionHeading?: string;
  publishedUrl?: string;
};

export type ContentPieceMetadata = {
  seoTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  featuredImageUrl?: string;
  images?: ContentPieceImageRef[];
  faqSection?: { question: string; answer: string }[];
  citations?: { text: string; url: string; source: string }[];
  internalLinkSuggestions?: { anchorText: string; suggestedSlug: string; rationale?: string }[];
  jsonLdSchema?: object;
  humanized?: boolean;
  humanizationAudit?: {
    slopScoreBefore: number;
    slopScoreAfter: number;
    humanizationLevel: "off" | "light" | "strong";
    rejected?: boolean;
    tellsFixed?: number;
  };
  /** Markdown infographic template block injected post-generation */
  hasInfographicBlock?: boolean;
  deeplRefined?: boolean;
  deeplTargetLang?: string;
  /** Optional hint set at generation — pre-selects publish destination */
  intendedPublishPlatform?: string;
  /** WordPress-only: preferred editor output when publishing */
  intendedEditorMode?: "classic" | "gutenberg" | "elementor" | "divi";
  /** Preferred CMS output format when publishing (platform-specific) */
  intendedOutputMode?: string;
  /** Markdown visual summary block injected post-generation */
  visualSummaryMarkdown?: string;
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
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  approvalStatus: text("approval_status").notNull().default("draft").$type<ContentPieceApprovalStatus>(),
  approvedByUserId: integer("approved_by_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  evergreenConfig: jsonb("evergreen_config").$type<EvergreenConfig | null>(),
  queuePosition: integer("queue_position"),
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
  index("content_pieces_scheduled_at_idx").on(table.scheduledAt),
  index("content_pieces_approval_status_idx").on(table.approvalStatus),
]);

export const insertContentPieceSchema = createInsertSchema(contentPiecesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertContentPiece = z.infer<typeof insertContentPieceSchema>;
export type ContentPiece = typeof contentPiecesTable.$inferSelect;
