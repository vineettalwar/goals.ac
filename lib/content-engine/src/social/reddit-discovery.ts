import { cleanAndParse } from "../core/utils";
import { persistRedditOpportunities } from "../strategy/keyword-opportunity-discover/reddit";
import {
  fetchRedditThreadContext,
  isFreshRedditThread,
  searchRedditThreads,
  type RedditSearchHit,
} from "./reddit-public-search";

export type RedditDiscoveryThread = {
  subreddit: string;
  title: string;
  url: string;
  intentScore: number;
  suggestedReply: string;
  score: number;
  numComments: number;
  source: "reddit";
};

function keywordTerms(primaryKeywords: string[] | null | undefined, projectName: string): string[] {
  const fromBrand = primaryKeywords?.slice(0, 5) ?? [];
  if (fromBrand.length > 0) return fromBrand;
  return projectName.split(/\s+/).filter((w) => w.length > 2).slice(0, 3);
}

function intentScoreForHit(hit: RedditSearchHit, keywords: string[]): number {
  const titleLower = hit.title.toLowerCase();
  const keywordHits = keywords.filter((k) => titleLower.includes(k.toLowerCase())).length;
  const engagement = Math.min(
    40,
    Math.log10(Math.max(hit.score, 1) + 1) * 12 + Math.log10(Math.max(hit.numComments, 1) + 1) * 6,
  );
  const relevance = Math.min(60, keywordHits * 18 + (hit.numComments >= 5 ? 12 : 0));
  return Math.round(Math.min(100, engagement + relevance));
}

async function findRedditHits(keywords: string[], industry: string): Promise<RedditSearchHit[]> {
  const primaryQuery = keywords.slice(0, 3).join(" ");
  let hits = primaryQuery ? await searchRedditThreads(primaryQuery, 8) : [];
  if (hits.length === 0 && keywords[0]) {
    hits = await searchRedditThreads(keywords[0], 8);
  }
  if (hits.length === 0 && industry) {
    hits = await searchRedditThreads(`${industry} ${keywords[0] ?? ""}`.trim(), 6);
  }
  return hits
    .filter((hit) => hit.title.trim().length > 0 && isFreshRedditThread(hit.createdUtc))
    .slice(0, 6);
}

export async function runRedditDiscovery(input: {
  projectId: number;
  projectName: string;
  projectUrl?: string | null;
  industry?: string | null;
  audience?: string | null;
  primaryKeywords?: string[] | null;
  generate: (prompt: string) => Promise<string>;
}): Promise<{
  threads: RedditDiscoveryThread[];
  keywords: string[];
  source: "reddit";
  opportunitiesInserted: number;
}> {
  const keywords = keywordTerms(input.primaryKeywords, input.projectName);
  const industry = input.industry ?? "B2B";
  const hits = await findRedditHits(keywords, industry);
  if (hits.length === 0) {
    return { threads: [], keywords, source: "reddit", opportunitiesInserted: 0 };
  }

  const contexts = await Promise.all(hits.map((hit) => fetchRedditThreadContext(hit.permalink)));
  const threadBrief = hits.map((h, i) => ({
    index: i,
    subreddit: h.subreddit,
    title: h.title,
    url: h.url,
    selftext: contexts[i]?.selftext ?? "",
    comments: contexts[i]?.comments ?? [],
  }));

  const prompt = `Draft helpful Reddit replies for a ${industry} brand.
Keywords: ${keywords.join(", ")}
Audience: ${input.audience ?? ""}
Website: ${input.projectUrl ?? ""}

Threads (real Reddit posts — reply to THIS post body; do not invent URLs or threads):
${JSON.stringify(threadBrief)}

Return JSON: { "replies": [{ "index": 0, "suggestedReply": "2-3 sentence helpful reply, not salesy" }] }
One reply per thread index. Be conversational and value-first.`;

  const text = await input.generate(prompt);
  const data = cleanAndParse<{ replies: Array<{ index: number; suggestedReply: string }> }>(text);
  const replies = data.replies ?? [];
  const replyByIndex = new Map(replies.map((r) => [r.index, r.suggestedReply]));

  const threads: RedditDiscoveryThread[] = hits.map((hit, i) => ({
    subreddit: hit.subreddit.startsWith("r/") ? hit.subreddit : `r/${hit.subreddit}`,
    title: hit.title,
    url: hit.url,
    intentScore: intentScoreForHit(hit, keywords),
    suggestedReply:
      replyByIndex.get(i) ??
      "Share a concise, helpful perspective based on your experience — avoid pitching unless asked.",
    score: hit.score,
    numComments: hit.numComments,
    source: "reddit",
  }));

  let opportunitiesInserted = 0;
  try {
    opportunitiesInserted = await persistRedditOpportunities(input.projectId, threads, keywords);
  } catch {
    // discovery still succeeds even if opportunity persist fails
  }

  return { threads, keywords, source: "reddit", opportunitiesInserted };
}
