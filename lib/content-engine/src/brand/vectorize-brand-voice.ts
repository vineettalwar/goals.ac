/**
 * Phase 5 — Vectorize-backed brand voice retrieval (post-launch).
 *
 * Today D1 stores embeddings as JSON with in-app cosine similarity.
 * When project chunk count grows, migrate to Cloudflare Vectorize:
 *
 * 1. wrangler vectorize create goals-ac-brand-voice --dimensions=768 --metric=cosine
 * 2. On brand-voice-index job: upsert vectors with metadata { chunkId, projectId }
 * 3. On retrieval: query Vectorize → load chunk text from D1 by chunkId
 *
 * @see docs/deploy-cloudflare.md#vectorize-brand-voice
 */

export interface VectorizeBrandVoiceConfig {
  indexName: string;
  dimensions: number;
}

export const VECTORIZE_BRAND_VOICE_CONFIG: VectorizeBrandVoiceConfig = {
  indexName: "goals-ac-brand-voice",
  dimensions: 768,
};

/** Stub — implement when enabling Vectorize binding on goals-ac-jobs Worker. */
export async function queryBrandVoiceVectorize(
  _projectId: number,
  _queryEmbedding: number[],
  _topK = 8,
): Promise<number[]> {
  throw new Error(
    "Vectorize brand voice is not enabled. See lib/content-engine/src/brand/vectorize-brand-voice.ts",
  );
}
