import { getPlatformGeminiClient } from "./gemini";

export const DEFAULT_EMBEDDING_MODEL = "text-embedding-004";
export const EMBEDDING_DIMENSIONS = 768;

export interface EmbedTextOptions {
  model?: string;
  taskType?: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" | "SEMANTIC_SIMILARITY";
}

function normalizeEmbedding(values: number[]): number[] {
  if (values.length === EMBEDDING_DIMENSIONS) return values;
  if (values.length > EMBEDDING_DIMENSIONS) return values.slice(0, EMBEDDING_DIMENSIONS);
  return [...values, ...Array(EMBEDDING_DIMENSIONS - values.length).fill(0)];
}

/**
 * Embed one or more text strings using Gemini text-embedding-004.
 * Returns 768-dimensional vectors.
 */
export async function embedTexts(
  texts: string[],
  options?: EmbedTextOptions,
): Promise<number[][]> {
  const trimmed = texts.map((t) => t.trim()).filter(Boolean);
  if (trimmed.length === 0) return [];

  const client = await getPlatformGeminiClient();
  if (!client) {
    throw new Error(
      "Embedding requires Gemini API key. Set GEMINI_API_KEY or AI_INTEGRATIONS_GEMINI_API_KEY.",
    );
  }

  const model = options?.model ?? DEFAULT_EMBEDDING_MODEL;
  const embeddings: number[][] = [];

  const batchSize = 20;
  for (let i = 0; i < trimmed.length; i += batchSize) {
    const batch = trimmed.slice(i, i + batchSize);
    const response = await client.models.embedContent({
      model,
      contents: batch.map((text) => ({ parts: [{ text }] })),
      config: options?.taskType
        ? { taskType: options.taskType }
        : undefined,
    });

    const batchEmbeddings = response.embeddings ?? [];
    for (const entry of batchEmbeddings) {
      const values = entry.values ?? [];
      embeddings.push(normalizeEmbedding(values));
    }
  }

  return embeddings;
}

export async function embedText(
  text: string,
  options?: EmbedTextOptions,
): Promise<number[]> {
  const [embedding] = await embedTexts([text], options);
  if (!embedding) {
    throw new Error("Failed to generate embedding");
  }
  return embedding;
}
