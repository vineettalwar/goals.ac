import { db } from "@workspace/db";
import {
  brandProfilesTable,
  brandVoiceChunksTable,
  brandVoiceSourcesTable,
  type BrandVoiceSourceType,
} from "@workspace/db/schema";
import { embedTexts, DEFAULT_EMBEDDING_MODEL } from "@workspace/ai-providers/embed";
import { eq, and } from "drizzle-orm";
import { chunkSocialText, chunkText } from "./brand-voice-chunker";
import { logger } from "../core/logger";
import { enqueue } from "@workspace/jobs/boss";
import { QUEUES } from "@workspace/jobs/queues";

export interface BrandVoiceIngestDocument {
  sourceType: BrandVoiceSourceType;
  sourceUrl?: string;
  title?: string;
  text: string;
  metadata?: Record<string, unknown>;
  /** Replace existing source with same sourceUrl + sourceType */
  replaceExisting?: boolean;
}

export async function ingestBrandVoiceDocuments(
  projectId: number,
  documents: BrandVoiceIngestDocument[],
): Promise<number[]> {
  const sourceIds: number[] = [];

  for (const doc of documents) {
    const text = doc.text.trim();
    if (!text) continue;

    if (doc.replaceExisting && doc.sourceUrl) {
      const existing = await db
        .select({ id: brandVoiceSourcesTable.id })
        .from(brandVoiceSourcesTable)
        .where(
          and(
            eq(brandVoiceSourcesTable.websiteProjectId, projectId),
            eq(brandVoiceSourcesTable.sourceUrl, doc.sourceUrl),
            eq(brandVoiceSourcesTable.sourceType, doc.sourceType),
          ),
        );

      for (const row of existing) {
        await db
          .delete(brandVoiceSourcesTable)
          .where(eq(brandVoiceSourcesTable.id, row.id));
      }
    }

    const [source] = await db
      .insert(brandVoiceSourcesTable)
      .values({
        websiteProjectId: projectId,
        sourceType: doc.sourceType,
        sourceUrl: doc.sourceUrl ?? "",
        title: doc.title ?? "",
        rawText: text,
        metadata: doc.metadata ?? null,
        status: "pending",
      })
      .returning({ id: brandVoiceSourcesTable.id });

    if (source) sourceIds.push(source.id);
  }

  if (sourceIds.length > 0) {
    await enqueueBrandVoiceIndex(projectId, sourceIds);
  }

  return sourceIds;
}

export async function enqueueBrandVoiceIndex(
  projectId: number,
  sourceIds?: number[],
  options?: { regenerateSkill?: boolean },
): Promise<void> {
  try {
    await enqueue(QUEUES.brandVoiceIndex, {
      projectId,
      sourceIds,
      regenerateSkill: options?.regenerateSkill ?? true,
    });
  } catch (err) {
    logger.warn({ err, projectId }, "Failed to enqueue brand voice index job; indexing inline");
    await indexBrandVoiceSources(projectId, sourceIds, options);
  }
}

export async function indexBrandVoiceSources(
  projectId: number,
  sourceIds?: number[],
  options?: { regenerateSkill?: boolean },
): Promise<void> {
  const allSources = await db
    .select()
    .from(brandVoiceSourcesTable)
    .where(eq(brandVoiceSourcesTable.websiteProjectId, projectId));

  const sources = sourceIds?.length
    ? allSources.filter((r) => sourceIds.includes(r.id))
    : allSources.filter((s) => s.status === "pending");

  if (sources.length === 0) return;

  for (const source of sources) {
    const rawText = source.rawText?.trim();
    if (!rawText) {
      await db
        .update(brandVoiceSourcesTable)
        .set({ status: "failed" })
        .where(eq(brandVoiceSourcesTable.id, source.id));
      continue;
    }

    try {
      await db
        .delete(brandVoiceChunksTable)
        .where(eq(brandVoiceChunksTable.sourceId, source.id));

      const isSocial =
        source.sourceType === "social_linkedin" || source.sourceType === "social_twitter";
      const chunks = isSocial ? chunkSocialText(rawText) : chunkText(rawText);
      if (chunks.length === 0) {
        await db
          .update(brandVoiceSourcesTable)
          .set({ status: "failed" })
          .where(eq(brandVoiceSourcesTable.id, source.id));
        continue;
      }

      const embeddings = await embedTexts(
        chunks.map((c) => c.text),
        { taskType: "RETRIEVAL_DOCUMENT" },
      );

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]!;
        const embedding = embeddings[i];
        if (!embedding) continue;

        await db.insert(brandVoiceChunksTable).values({
          sourceId: source.id,
          websiteProjectId: projectId,
          chunkIndex: chunk.chunkIndex,
          text: chunk.text,
          tokenCount: chunk.tokenCount,
          embedding,
          embeddingModel: DEFAULT_EMBEDDING_MODEL,
        });
      }

      await db
        .update(brandVoiceSourcesTable)
        .set({ status: "indexed" })
        .where(eq(brandVoiceSourcesTable.id, source.id));
    } catch (err) {
      logger.error({ err, sourceId: source.id, projectId }, "Brand voice chunk indexing failed");
      await db
        .update(brandVoiceSourcesTable)
        .set({ status: "failed" })
        .where(eq(brandVoiceSourcesTable.id, source.id));
    }
  }

  const now = new Date().toISOString();
  const [profile] = await db
    .select({ brandMemory: brandProfilesTable.brandMemory })
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .limit(1);

  const memory = profile?.brandMemory ?? {};
  await db
    .update(brandProfilesTable)
    .set({
      brandMemory: {
        ...memory,
        lastIndexedAt: now,
      },
    })
    .where(eq(brandProfilesTable.websiteProjectId, projectId));

  if (options?.regenerateSkill !== false) {
    try {
      await enqueue(QUEUES.brandVoiceSkillRegen, { projectId });
    } catch {
      const { regenerateBrandVoiceSkill } = await import("./brand-voice-skill");
      await regenerateBrandVoiceSkill(projectId).catch((err) => {
        logger.warn({ err, projectId }, "Inline brand voice skill regen failed");
      });
    }
  }
}

export async function listBrandVoiceSources(projectId: number) {
  return db
    .select({
      id: brandVoiceSourcesTable.id,
      sourceType: brandVoiceSourcesTable.sourceType,
      sourceUrl: brandVoiceSourcesTable.sourceUrl,
      title: brandVoiceSourcesTable.title,
      status: brandVoiceSourcesTable.status,
      ingestedAt: brandVoiceSourcesTable.ingestedAt,
      metadata: brandVoiceSourcesTable.metadata,
    })
    .from(brandVoiceSourcesTable)
    .where(eq(brandVoiceSourcesTable.websiteProjectId, projectId));
}

export async function getBrandVoiceSourceStats(projectId: number) {
  const sources = await listBrandVoiceSources(projectId);
  const byType: Record<string, number> = {};
  for (const source of sources) {
    byType[source.sourceType] = (byType[source.sourceType] ?? 0) + 1;
  }
  const [profile] = await db
    .select({
      brandMemory: brandProfilesTable.brandMemory,
      skillLocked: brandProfilesTable.skillLocked,
      brandVoiceSkill: brandProfilesTable.brandVoiceSkill,
    })
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .limit(1);

  return {
    totalSources: sources.length,
    byType,
    lastIndexedAt: profile?.brandMemory?.lastIndexedAt ?? null,
    skillLocked: profile?.skillLocked ?? false,
    hasSkill: Boolean(profile?.brandVoiceSkill?.trim()),
    skillVersion: profile?.brandMemory?.skillVersion ?? 0,
  };
}
