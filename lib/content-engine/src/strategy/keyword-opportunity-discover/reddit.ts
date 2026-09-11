import { opportunitiesFromRedditThreads } from "@workspace/seo-tools/keywordGapAnalyzer";
import { logger } from "../../core/logger";
import { insertOpportunities, loadOpenQueuedKeywords } from "./shared";

/** Persist Reddit discovery threads as open keyword opportunities (deduped). */
export async function persistRedditOpportunities(
  projectId: number,
  threads: Array<{
    title: string;
    url: string;
    subreddit: string;
    intentScore: number;
  }>,
  brandKeywords: string[],
): Promise<number> {
  if (threads.length === 0) return 0;
  const collected = opportunitiesFromRedditThreads({ threads, brandKeywords });
  const existingKeywords = await loadOpenQueuedKeywords(projectId);
  const inserted = await insertOpportunities(projectId, collected, existingKeywords);
  if (inserted > 0) {
    logger.info({ projectId, inserted }, "Reddit threads persisted as keyword opportunities");
  }
  return inserted;
}
