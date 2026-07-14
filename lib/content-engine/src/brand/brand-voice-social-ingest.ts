/**
 * @deprecated Use social-history-sync-service — kept for backward compatibility.
 */
export {
  syncSocialHistory as ingestSocialBrandVoice,
  syncSocialHistoryForPlatform,
} from "../social/social-history-sync-service";

import { syncSocialHistoryForPlatform } from "../social/social-history-sync-service";

export async function ingestLinkedInPosts(projectId: number, userId: number): Promise<number> {
  const result = await syncSocialHistoryForPlatform(projectId, userId, "linkedin");
  return result.postCount;
}

export async function ingestTwitterPosts(projectId: number, userId: number): Promise<number> {
  const result = await syncSocialHistoryForPlatform(projectId, userId, "twitter");
  return result.postCount;
}
