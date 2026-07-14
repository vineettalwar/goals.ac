import {
  buildHybridBrandVoicePromptContext,
  type UnifiedBrandContext,
} from "../../brand/brand-voice";
import {
  buildRetrievedPassagesPrompt,
  retrieveBrandVoicePassages,
} from "../../brand/brand-voice-retrieval";
import { loadBrandContextForProject } from "./brand-context-loader";

export interface BrandVoiceGenerationContext {
  brand: UnifiedBrandContext;
  promptContext: string;
}

export async function loadBrandVoiceGenerationContext(
  projectId: number,
  query: string,
  userId?: number,
): Promise<BrandVoiceGenerationContext | null> {
  const brand = await loadBrandContextForProject(projectId, userId);
  if (!brand) return null;

  const passages = await retrieveBrandVoicePassages({
    projectId,
    query,
    topK: 5,
    minSimilarity: 0.65,
  });

  const promptContext = buildHybridBrandVoicePromptContext(brand, {
    brandVoiceSkill: brand.brandVoiceSkill,
    retrievedPassages: buildRetrievedPassagesPrompt(passages),
  });

  return { brand, promptContext };
}

export async function ingestPublishedContentPiece(
  projectId: number,
  contentPieceId: number,
  title: string,
  bodyMarkdown: string,
  publishedUrl?: string | null,
): Promise<void> {
  const text = `# ${title}\n\n${bodyMarkdown}`.trim();
  if (text.length < 80) return;

  const { ingestBrandVoiceDocuments } = await import("../../brand/brand-voice-indexer");
  await ingestBrandVoiceDocuments(projectId, [
    {
      sourceType: "published",
      sourceUrl: publishedUrl ?? `content-piece:${contentPieceId}`,
      title,
      text,
      metadata: { contentPieceId, weight: 2 },
      replaceExisting: true,
    },
  ]);
}
