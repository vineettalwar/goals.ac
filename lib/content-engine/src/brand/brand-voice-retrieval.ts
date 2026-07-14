import { db } from "@workspace/db";
import { brandVoiceChunksTable } from "@workspace/db/schema";
import { embedText } from "@workspace/ai-providers/embed";
import { sql, eq } from "drizzle-orm";
import { logger } from "../core/logger";

export interface RetrievedBrandPassage {
  text: string;
  similarity: number;
  sourceType: string;
  sourceUrl: string;
  title: string;
}

export interface RetrieveBrandVoiceOptions {
  projectId: number;
  query: string;
  topK?: number;
  minSimilarity?: number;
}

const SOURCE_WEIGHT: Record<string, number> = {
  published: 0.08,
  upload: 0.04,
  cms: 0.03,
  website: 0.02,
  social_linkedin: 0.02,
  social_twitter: 0.02,
};

function formatVectorForSql(values: number[]): string {
  return `[${values.join(",")}]`;
}

export async function retrieveBrandVoicePassages(
  options: RetrieveBrandVoiceOptions,
): Promise<RetrievedBrandPassage[]> {
  const { projectId, query, topK = 5, minSimilarity = 0.72 } = options;
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  try {
    const queryEmbedding = await embedText(trimmedQuery, { taskType: "RETRIEVAL_QUERY" });
    const vectorLiteral = formatVectorForSql(queryEmbedding);

    const result = await db.execute(sql`
      SELECT
        c.text,
        1 - (c.embedding <=> ${vectorLiteral}::vector) AS similarity,
        s.source_type,
        s.source_url,
        s.title
      FROM brand_voice_chunks c
      INNER JOIN brand_voice_sources s ON s.id = c.source_id
      WHERE c.website_project_id = ${projectId}
        AND s.status = 'indexed'
      ORDER BY c.embedding <=> ${vectorLiteral}::vector
      LIMIT ${topK * 3}
    `);

    const rows = (result.rows ?? result) as Array<{
      text: string;
      similarity: number;
      source_type: string;
      source_url: string;
      title: string;
    }>;

    return rows
      .map((row) => {
        const weight = SOURCE_WEIGHT[row.source_type] ?? 0;
        return {
          text: row.text,
          similarity: Number(row.similarity) + weight,
          sourceType: row.source_type,
          sourceUrl: row.source_url ?? "",
          title: row.title ?? "",
        };
      })
      .filter((row) => row.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  } catch (err) {
    logger.warn({ err, projectId }, "Brand voice retrieval failed");
    return [];
  }
}

export function buildRetrievedPassagesPrompt(passages: RetrievedBrandPassage[]): string {
  if (passages.length === 0) return "";

  const blocks = passages.map((passage, index) => {
    const label = passage.title || passage.sourceUrl || passage.sourceType;
    return `Reference ${index + 1} (${label}):\n${passage.text.slice(0, 900)}`;
  });

  return `
STYLE REFERENCE PASSAGES (match tone and cadence — do NOT copy verbatim):
${blocks.join("\n\n")}
`;
}

export async function countBrandVoiceChunks(projectId: number): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(brandVoiceChunksTable)
    .where(eq(brandVoiceChunksTable.websiteProjectId, projectId));
  return row?.count ?? 0;
}
