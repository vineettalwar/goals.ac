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
  /** Body markdown as it was immediately before the most recent humanize pass. */
  preHumanizeBodyMarkdown?: string;
  /** Markdown infographic template block injected post-generation */
  hasInfographicBlock?: boolean;
  deeplRefined?: boolean;
  deeplTargetLang?: string;
  /**
   * Regulated-vertical review gate. Set true at generation for verticals whose
   * content must be approved by a human before it can be published (law, dental),
   * and cleared only by the approval path. The publish call refuses while it is
   * true, so it has to live on the column type and not only on the generator's
   * view of metadata: every gate reads it back off a database row.
   */
  requiresReview?: boolean;
  /** Disclaimer appended for regulated verticals, rendered at the foot of the article. */
  verticalDisclaimer?: string;
  /** Claims the vertical forbids that survived generation, for the reviewer to resolve. */
  forbiddenClaimHits?: { claim: string; index: number; excerpt: string }[];
  /** True when a forbidden-claim hit triggered one regeneration pass before surfacing. */
  verticalGuardrailRegenerated?: boolean;
  /** Optional hint set at generation — pre-selects publish destination */
  intendedPublishPlatform?: string;
  /** WordPress-only: preferred editor output when publishing */
  intendedEditorMode?: "classic" | "gutenberg" | "elementor" | "divi";
  /** Preferred CMS output format when publishing (platform-specific) */
  intendedOutputMode?: string;
  /** Raster/data featured warnings from last CMS publish (Notion/Webflow omit, etc.) */
  lastPublishWarnings?: { code: string; message: string }[];
  /**
   * Audit trail for a publish that went through despite unresolved
   * assessPublishReadiness blockers. Set only when the caller supplied an
   * overrideReason; a reviewer can see who overrode what and why after the fact.
   */
  publishOverride?: {
    reason: string | undefined;
    blockers: { code: string; severity: "blocker" | "warning"; message: string; detail?: string }[];
    /** Absent when the override came through an API key rather than a signed-in user. */
    userId?: number;
    /** Set instead of userId for public API publishes, so the org is still attributable. */
    organizationId?: number;
    overriddenAt: string;
  };
  /** Markdown visual summary block injected post-generation */
  visualSummaryMarkdown?: string;
  /** Raw SVG “At a glance” graphic */
  visualSummarySvg?: string;
  /** data:image/svg+xml for aside / markdown — not CMS featuredImageUrl */
  visualSummarySvgDataUri?: string;
  /** Generation angle / editor notes (includes section: and source URLs for news). */
  contentAngle?: string;
  /** WordPress category names to resolve via site-graph at publish. */
  cmsCategories?: string[];
  /** WordPress tag names (falls back to keyword + format when omitted). */
  cmsTags?: string[];
  /**
   * Set by the publish job when assessPublishReadiness finds unresolved
   * blockers and there is no human present to supply an override reason.
   * The piece is held at status "draft" for human attention instead of
   * being published or silently dropped. Cleared once a human resolves the
   * blockers (edit + re-ready) or supplies a publishOverride.
   */
  publishBlocked?: {
    blockers: { code: string; severity: "blocker" | "warning"; message: string; detail?: string }[];
    blockedAt: string;
    attempt?: number;
  };
  /** Content Refresh Loop — piece imported from a live URL (not generated). */
  source?: "refresh";
  /** URL the user asked to optimize. */
  sourceUrl?: string;
  /** Canonical URL from the fetched page `<link rel="canonical">`, when present. */
  fetchedCanonicalUrl?: string;
  /** Optional prior content piece this refresh replaces. */
  refreshOf?: number;
  /** WordPress (or other CMS) remote post id for update-in-place publish. */
  cmsRemoteId?: string;
  /** Remote post link matched at import time (for confirm UI). */
  cmsRemoteLink?: string;
  /** True when body was truncated for import size limits. */
  extractTruncated?: boolean;
  /** User confirmed CMS update target before publish (WP-first refresh). */
  updateConfirmed?: boolean;
  /** Secondary / coverage keywords for dual score checklist. */
  secondaryKeywords?: string[];
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
