import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { trackedKeywordsTable } from "./tracked_keywords";

export const keywordRankSnapshotsTable = pgTable("keyword_rank_snapshots", {
  id: serial("id").primaryKey(),
  trackedKeywordId: integer("tracked_keyword_id")
    .notNull()
    .references(() => trackedKeywordsTable.id, { onDelete: "cascade" }),
  position: integer("position"),
  rankingUrl: text("ranking_url"),
  serpFeatures: jsonb("serp_features").notNull().$type<Record<string, unknown>>().default({}),
  provider: text("provider").notNull().default("dataforseo"),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
});

export type KeywordRankSnapshot = typeof keywordRankSnapshotsTable.$inferSelect;
export type NewKeywordRankSnapshot = typeof keywordRankSnapshotsTable.$inferInsert;
