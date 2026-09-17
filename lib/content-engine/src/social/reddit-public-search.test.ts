import { describe, expect, it } from "vitest";
import { isFreshRedditThread, parseRedditThreadJson, redditJsonUrl } from "./reddit-public-search";

describe("reddit thread grounding", () => {
  it("builds a .json permalink", () => {
    expect(redditJsonUrl("https://www.reddit.com/r/seo/comments/abc/title/")).toBe(
      "https://www.reddit.com/r/seo/comments/abc/title.json",
    );
  });

  it("reads selftext and top comments", () => {
    const ctx = parseRedditThreadJson([
      { data: { children: [{ data: { selftext: "How do you ship WP drafts?" } }] } },
      {
        data: {
          children: [
            { data: { body: "Use the REST API." } },
            { data: { body: "[deleted]" } },
            { data: { body: "Plugin path is better." } },
          ],
        },
      },
    ]);
    expect(ctx.selftext).toMatch(/WP drafts/);
    expect(ctx.comments).toEqual(["Use the REST API.", "Plugin path is better."]);
  });

  it("drops threads older than 90 days", () => {
    const now = 1_800_000_000;
    expect(isFreshRedditThread(now - 10 * 86400, now)).toBe(true);
    expect(isFreshRedditThread(now - 100 * 86400, now)).toBe(false);
  });
});
