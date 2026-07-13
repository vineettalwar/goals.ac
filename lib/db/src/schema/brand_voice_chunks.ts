import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { websiteProjectsTable } from "./website_projects";
import { brandVoiceSourcesTable } from "./brand_voice_sources";
import { vector768 } from "./pgvector";

export const brandVoiceChunksTable = pgTable(
  "brand_voice_chunks",
  {
    id: serial("id").primaryKey(),
    sourceId: integer("source_id")
      .notNull()
      .references(() => brandVoiceSourcesTable.id, { onDelete: "cascade" }),
    websiteProjectId: integer("website_project_id")
      .notNull()
      .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull().default(0),
    text: text("text").notNull(),
    tokenCount: integer("token_count").notNull().default(0),
    embedding: vector768("embedding").notNull(),
    embeddingModel: text("embedding_model").notNull().default("text-embedding-004"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
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
