import { splitTwitterThread } from "@workspace/connectors/twitter-thread";
import { describe, expect, it } from "vitest";
import { scoreTwitterThreadQuality } from "./social-thread-quality";

describe("splitTwitterThread", () => {
  it("keeps multi-line tweets until the next number", () => {
    const body = `1/ Hook line.

More context.
Thread 🧵

2/ Second tweet insight.

3/ Close — bookmark this.`;
    const tweets = splitTwitterThread(body, 280);
    expect(tweets).toHaveLength(3);
    expect(tweets[0]).toContain("More context");
    expect(tweets[0]).toContain("Thread");
    expect(tweets[1]).toContain("Second tweet");
    expect(tweets.every((t) => t.length <= 280)).toBe(true);
  });
});

describe("scoreTwitterThreadQuality", () => {
  it("scores a structured thread without article SEO rows", () => {
    const body = `1/ Stop treating local SEO as marketing. Thread 🧵

2/ Founders need clarity on CAC and maps.

3/ Treat SEO like an engineering project.

4/ Prove local authority with deep pages.

5/ Automate competitor gap analysis.

6/ Speed and crawlability still win.

7/ Hyper-local service pages beat vanity GMB tweaks.

8/ Bookmark this framework and retweet if useful.`;
    const result = scoreTwitterThreadQuality(body);
    expect(result.tweetCount).toBeGreaterThanOrEqual(5);
    expect(result.breakdown.some((row) => /schema|meta|faq|serp/i.test(row.label))).toBe(false);
    expect(result.total).toBeGreaterThan(40);
  });
});
