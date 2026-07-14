import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { websiteProjectsTable } from "./website_projects";
import { brandVoiceSourcesTable } from "./brand_voice_sources";
import { embedding768 } from "./embedding";

export const brandVoiceChunksTable = sqliteTable(
  "brand_voice_chunks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sourceId: integer("source_id")
      .notNull()
      .references(() => brandVoiceSourcesTable.id, { onDelete: "cascade" }),
    websiteProjectId: integer("website_project_id")
      .notNull()
      .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull().default(0),
    text: text("text").notNull(),
    tokenCount: integer("token_count").notNull().default(0),
    embedding: embedding768("embedding").notNull(),
    embeddingModel: text("embedding_model").notNull().default("text-embedding-004"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    index("brand_voice_chunks_project_idx").on(table.websiteProjectId),
    index("brand_voice_chunks_source_idx").on(table.sourceId),
  ],
);

export const insertBrandVoiceChunkSchema = createInsertSchema(
  brandVoiceChunksTable,
).omit({
  id: true,
  createdAt: true,
});

export type InsertBrandVoiceChunk = z.infer<typeof insertBrandVoiceChunkSchema>;
export type BrandVoiceChunk = typeof brandVoiceChunksTable.$inferSelect;
