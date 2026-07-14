import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { contentPiecesTable } from "./content_pieces";

export const socialPostMetricsTable = sqliteTable(
  "social_post_metrics",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    contentPieceId: integer("content_piece_id")
      .notNull()
      .references(() => contentPiecesTable.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(),
    remotePostId: text("remote_post_id"),
    impressions: integer("impressions"),
    likes: integer("likes"),
    comments: integer("comments"),
    shares: integer("shares"),
    clicks: integer("clicks"),
    syncedAt: integer("synced_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    index("social_post_metrics_content_piece_id_idx").on(table.contentPieceId),
    index("social_post_metrics_platform_idx").on(table.platform),
    uniqueIndex("social_post_metrics_piece_platform_uidx").on(
      table.contentPieceId,
      table.platform,
    ),
  ],
);

export const insertSocialPostMetricsSchema = createInsertSchema(socialPostMetricsTable).omit({
  id: true,
  syncedAt: true,
});
export type InsertSocialPostMetrics = z.infer<typeof insertSocialPostMetricsSchema>;
export type SocialPostMetrics = typeof socialPostMetricsTable.$inferSelect;
