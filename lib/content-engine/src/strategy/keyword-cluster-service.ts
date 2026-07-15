import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  brandProfilesTable,
  contentPiecesTable,
  websiteProjectsTable,
} from "@workspace/db/schema";
import {
  getKeywordResearchProvider,
  type KeywordMetrics,
} from "@workspace/keyword-research-provider";
import { getDecryptedSemrushCredentialsForUser } from "../support/ai/org-ai-settings";
import { getUserAiProviderOptions } from "../support/ai/user-ai-provider";
import { getDecryptedUserGeminiKey } from "../support/ai/user-api-key";
import {
  generateTopicalMap,
  type TopicalCluster,
  type TopicalMapResult,
} from "./topical-map-generator";

export type KeywordClusterResult = TopicalMapResult & {
  seeds: string[];
  seedMetrics: KeywordMetrics[];
  semrushUsed: boolean;
};

function uniqueSeeds(seeds: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of seeds) {
    const seed = raw.trim().toLowerCase();
    if (!seed || seen.has(seed)) continue;
    seen.add(seed);
    out.push(raw.trim());
    if (out.length >= 10) break;
  }
  return out;
}

async function loadSeedMetrics(
  seeds: string[],
  userId: number,
): Promise<{ metrics: KeywordMetrics[]; semrushUsed: boolean }> {
  const credentials = await getDecryptedSemrushCredentialsForUser(userId);
  if (!credentials) return { metrics: [], semrushUsed: false };

  try {
    const provider = getKeywordResearchProvider();
    const metrics = await provider.getKeywordMetrics({
      keywords: seeds,
      apiKey: credentials.apiKey,
      database: credentials.database,
    });
    return { metrics, semrushUsed: true };
  } catch {
    return { metrics: [], semrushUsed: false };
  }
}

function applyMetricsToClusters(
  clusters: TopicalCluster[],
  metrics: KeywordMetrics[],
): TopicalCluster[] {
  if (metrics.length === 0) return clusters;
  const byKeyword = new Map(metrics.map((row) => [row.keyword.toLowerCase(), row]));

  return clusters.map((cluster) => {
    const pillar = byKeyword.get(cluster.pillarKeyword.toLowerCase());
    return {
      ...cluster,
      searchVolume: pillar ? String(pillar.searchVolume) : cluster.searchVolume,
      difficulty: pillar?.difficulty ?? cluster.difficulty,
      supportingTopics: cluster.supportingTopics.map((topic) => {
        const match = byKeyword.get(topic.keyword.toLowerCase());
        if (!match) return topic;
        return {
          ...topic,
          searchVolume: String(match.searchVolume),
          difficulty: match.difficulty,
        };
      }),
    };
  });
}

/**
 * Seed keywords → topical clusters (AI map) with optional Semrush volume/difficulty overlay.
 */
export async function buildKeywordClusters(params: {
  projectId: number;
  userId: number;
  seeds: string[];
}): Promise<KeywordClusterResult> {
  const seeds = uniqueSeeds(params.seeds);
  if (seeds.length === 0) {
    throw new Error("Add at least one seed keyword");
  }

  const [project] = await db
    .select({
      id: websiteProjectsTable.id,
      name: websiteProjectsTable.name,
      url: websiteProjectsTable.url,
      userId: websiteProjectsTable.userId,
    })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, params.projectId))
    .limit(1);
  if (!project) throw new Error("Project not found");

  const [brand] = await db
    .select()
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, params.projectId))
    .limit(1);

  const articles = await db
    .select({ title: contentPiecesTable.title })
    .from(contentPiecesTable)
    .where(eq(contentPiecesTable.websiteProjectId, params.projectId))
    .limit(80);

  const [userApiKey, aiProviderOptions, seedMetricsResult] = await Promise.all([
    getDecryptedUserGeminiKey(params.userId),
    getUserAiProviderOptions(params.userId),
    loadSeedMetrics(seeds, params.userId),
  ]);

  const map = await generateTopicalMap(
    {
      company: {
        name: brand?.companyName || project.name,
        industry: brand?.industry ?? "B2B software",
        description:
          brand?.brandMemory?.summary ||
          (brand?.productOfferings?.length
            ? brand.productOfferings.slice(0, 5).join(", ")
            : "") ||
          brand?.typicalStructure ||
          "",
        targetAudience: brand?.targetAudience ?? "",
        websiteUrl: project.url,
      },
      existingArticleTitles: articles.map((row) => row.title).filter(Boolean) as string[],
      primaryKeywords: seeds,
    },
    { userApiKey, aiProviderOptions },
  );

  return {
    ...map,
    clusters: applyMetricsToClusters(map.clusters, seedMetricsResult.metrics),
    seeds,
    seedMetrics: seedMetricsResult.metrics,
    semrushUsed: seedMetricsResult.semrushUsed,
  };
}
