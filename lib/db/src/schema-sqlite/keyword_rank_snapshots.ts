import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { trackedKeywordsTable } from "./tracked_keywords";

export const keywordRankSnapshotsTable = sqliteTable("keyword_rank_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  trackedKeywordId: integer("tracked_keyword_id")
    .notNull()
    .references(() => trackedKeywordsTable.id, { onDelete: "cascade" }),
  position: integer("position"),
  rankingUrl: text("ranking_url"),
  serpFeatures: text("serp_features", { mode: "json" }).notNull().$type<Record<string, unknown>>().default({} as Record<string, unknown>),
  provider: text("provider").notNull().default("dataforseo"),
  checkedAt: integer("checked_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index("keyword_rank_snapshots_tracked_keyword_checked_idx").on(table.trackedKeywordId, table.checkedAt),
]);

export type KeywordRankSnapshot = typeof keywordRankSnapshotsTable.$inferSelect;
export type NewKeywordRankSnapshot = typeof keywordRankSnapshotsTable.$inferInsert;
