/**
 * Reddit public JSON search (read-only, no OAuth).
 */

export type RedditSearchHit = {
  subreddit: string;
  title: string;
  url: string;
  permalink: string;
  score: number;
  numComments: number;
  createdUtc: number;
};

const USER_AGENT = "goals.ac/1.0 (content research)";

export async function searchRedditThreads(
  query: string,
  limit = 6,
): Promise<RedditSearchHit[]> {
  const q = query.trim();
  if (!q) return [];

  const url = new URL("https://www.reddit.com/search.json");
  url.searchParams.set("q", q);
  url.searchParams.set("sort", "relevance");
  url.searchParams.set("limit", String(Math.min(limit, 25)));
  url.searchParams.set("type", "link");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });

  if (!res.ok) return [];

  const json = (await res.json()) as {
    data?: {
      children?: Array<{
        data?: {
          subreddit?: string;
          title?: string;
          url?: string;
          permalink?: string;
          score?: number;
          num_comments?: number;
          created_utc?: number;
        };
      }>;
    };
  };

  const hits: RedditSearchHit[] = [];
  for (const child of json.data?.children ?? []) {
    const d = child.data;
    if (!d?.title || !d.subreddit) continue;
    const permalink = d.permalink?.startsWith("http")
      ? d.permalink
      : d.permalink
        ? `https://www.reddit.com${d.permalink}`
        : d.url ?? `https://www.reddit.com/r/${d.subreddit}/search/?q=${encodeURIComponent(q)}`;

    hits.push({
      subreddit: d.subreddit.startsWith("r/") ? d.subreddit : `r/${d.subreddit}`,
      title: d.title,
      url: permalink,
      permalink,
      score: d.score ?? 0,
      numComments: d.num_comments ?? 0,
      createdUtc: d.created_utc ?? 0,
    });
    if (hits.length >= limit) break;
  }

  return hits;
}

export function redditSearchUrl(subreddit: string, query: string): string {
  const sub = subreddit.replace(/^r\//, "");
  return `https://www.reddit.com/r/${sub}/search/?q=${encodeURIComponent(query)}&restrict_sr=1&sort=relevance`;
}
