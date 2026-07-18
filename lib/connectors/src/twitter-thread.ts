/**
 * Split a twitter_thread body into per-tweet strings for publish, scoring, and preview.
 * Numbered segments (`1/ …`) may span multiple lines until the next `N/`.
 */
export function splitTwitterThread(bodyMarkdown: string, limit = 280): string[] {
  const text = bodyMarkdown.replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  const lines = text.split("\n");
  const numbered: string[] = [];
  let current: string[] | null = null;

  for (const line of lines) {
    const match = line.match(/^(\d+)\/\s*(.*)$/);
    if (match) {
      if (current) {
        const joined = current.join("\n").trim();
        if (joined) numbered.push(joined);
      }
      current = [match[2] ?? ""];
      continue;
    }
    if (current) current.push(line);
  }
  if (current) {
    const joined = current.join("\n").trim();
    if (joined) numbered.push(joined);
  }

  if (numbered.length >= 2) {
    return numbered.map((tweet) =>
      tweet.replace(/\*\*/g, "").replace(/^#+\s+/gm, "").trim().slice(0, limit),
    );
  }

  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.replace(/^#+\s+/gm, "").replace(/\*\*/g, "").trim())
    .filter(Boolean);

  if (paragraphs.length > 1) {
    return paragraphs.map((p) => p.slice(0, limit));
  }

  const chunks: string[] = [];
  let remaining = text.replace(/^#+\s+/gm, "").replace(/\*\*/g, "").trim();
  while (remaining.length > 0) {
    chunks.push(remaining.slice(0, limit));
    remaining = remaining.slice(limit);
  }
  return chunks.length > 0 ? chunks : [text.slice(0, limit)];
}

/** True when any tweet exceeds the platform limit (not whole-body length). */
export function isTwitterThreadOverLimit(bodyMarkdown: string, limit = 280): boolean {
  const tweets = splitTwitterThread(bodyMarkdown, Number.MAX_SAFE_INTEGER);
  if (tweets.length === 0) return false;
  return tweets.some((tweet) => tweet.length > limit);
}

export function maxTwitterThreadTweetLength(bodyMarkdown: string): number {
  const tweets = splitTwitterThread(bodyMarkdown, Number.MAX_SAFE_INTEGER);
  if (tweets.length === 0) return 0;
  return Math.max(...tweets.map((t) => t.length));
}
