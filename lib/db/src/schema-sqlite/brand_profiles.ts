import { sqliteTable, text, integer, unique } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { websiteProjectsTable } from "./website_projects";
import type { PlatformVoices } from "./platform_voices";

export const brandProfilesTable = sqliteTable("brand_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  websiteProjectId: integer("website_project_id")
    .notNull()
    .unique()
    .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
  companyName: text("company_name").notNull().default(""),
  industry: text("industry").notNull().default(""),
  targetAudience: text("target_audience").notNull().default(""),
  voiceTone: text("voice_tone").notNull().default(""),
  primaryKeywords: text("primary_keywords", { mode: "json" }).$type<string[]>().notNull().default([]),
  competitorUrls: text("competitor_urls", { mode: "json" }).$type<string[]>().notNull().default([]),
  // Brand Voice Storage Fields (Phase 1)
  writingExamples: text("writing_examples", { mode: "json" }).$type<string[]>().notNull().default([]),
  brandGlossary: text("brand_glossary", { mode: "json" }).$type<string[]>().notNull().default([]),
  antiPatterns: text("anti_patterns", { mode: "json" }).$type<string[]>().notNull().default([]),
  typicalStructure: text("typical_structure").notNull().default(""),
  doWords: text("do_words", { mode: "json" }).$type<string[]>().notNull().default([]),
  dontWords: text("dont_words", { mode: "json" }).$type<string[]>().notNull().default([]),
  brandColors: text("brand_colors", { mode: "json" }).$type<string[]>().notNull().default([]),
  productOfferings: text("product_offerings", { mode: "json" }).$type<string[]>().notNull().default([]),
  brandMemory: text("brand_memory", { mode: "json" }).$type<BrandMemory | null>(),
  platformVoices: text("platform_voices", { mode: "json" }).$type<PlatformVoices | null>(),
  brandVoiceSkill: text("brand_voice_skill").notNull().default(""),
  skillLocked: integer("skill_locked", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});

/**
 * A verified, concrete proof point the content generators may cite (a
 * metric, case study, customer quote, or named example). Mirrors
 * `ProofAsset` in `@workspace/content-engine/personalization` structurally;
 * declared independently here since `db` must not depend on `content-engine`.
 */
export type BrandMemoryProofAsset = {
  kind: "metric" | "case_study" | "customer_quote" | "named_example";
  claim: string;
  source?: string;
  url?: string;
};

/**
 * Measured (not qualitative) writing style, computed deterministically over
 * the scanned corpus. Mirrors `StyleVector` in
 * `@workspace/content-engine/brand/style-vector` structurally; declared
 * independently here since `db` must not depend on `content-engine`.
 * Type-only addition on the existing brand_memory jsonb column, no
 * migration required.
 */
export type BrandStyleVector = {
  avgSentenceWords: number;
  sentenceLengthStdDev: number;
  avgParagraphSentences: number;
  longSentenceRatio: number;
  shortSentenceRatio: number;
  questionRatio: number;
  exclamationRatio: number;
  firstPersonRatio: number;
  secondPersonRatio: number;
  contractionRatio: number;
  avgWordLength: number;
  complexWordRatio: number;
  fleschReadingEase: number;
  readingGradeLevel: number;
  vocabularyTier: "plain" | "professional" | "technical";
  listUsageRatio: number;
  headingDensity: number;
  sampleWordCount: number;
  sampleDocumentCount: number;
  computedAt: string;
};

/**
 * Result of scoring the scanned corpus for whether it carries enough real
 * writing for the style vector to be trustworthy. Mirrors
 * `StyleSufficiency` in `@workspace/content-engine/brand/style-sufficiency`
 * structurally, for the same reason as `BrandStyleVector` above.
 */
export type BrandStyleSufficiency = {
  sufficient: boolean;
  score: number;
  totalWords: number;
  usablePages: number;
  reasons: string[];
};

export type BrandMemory = {
  summary?: string;
  voiceTraits?: string[];
  audienceInsights?: string[];
  competitorPositioning?: string;
  lastScannedAt?: string;
  lastIndexedAt?: string;
  skillVersion?: number;
  scanSources?: string[];
  confidence?: Record<string, string>;
  /**
   * Concrete, verified proof points the content generators may cite for
   * specific claims instead of inventing them. Type-only addition on the
   * existing brand_memory jsonb column, no migration required.
   */
  proofAssets?: BrandMemoryProofAsset[];
  /** Deterministic style measurement over the scanned corpus. Absent for
   * existing projects that were scanned before this field existed. */
  styleVector?: BrandStyleVector;
  /** Sufficiency score for the corpus behind `styleVector`. Absent for
   * existing projects that were scanned before this field existed. */
  styleSufficiency?: BrandStyleSufficiency;
};

export const insertBrandProfileSchema = createInsertSchema(
  brandProfilesTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBrandProfile = z.infer<typeof insertBrandProfileSchema>;
export type BrandProfile = typeof brandProfilesTable.$inferSelect;
