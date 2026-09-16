import { describe, expect, it } from "vitest";
import { PublishBrandIcon } from "./brand-logos";

const REQUIRED = [
  "stripe",
  "resend",
  "unsplash",
  "pexels",
  "linkedin",
  "twitter",
  "meta",
  "bluesky",
  "bing",
  "dataforseo",
  "google",
  "mastodon",
  "bedrock",
  "google",
  "google_search_console",
  "gemini",
  "openai",
  "anthropic",
  "openrouter",
  "groq",
  "nvidia",
  "wordpress",
] as const;

describe("PublishBrandIcon", () => {
  it("renders a real mark for every platform tile we show", () => {
    for (const id of REQUIRED) {
      const node = PublishBrandIcon({ id, className: "h-8 w-8" });
      expect(node, id).not.toBeNull();
      expect(node?.type === "svg" || typeof node?.type === "function", id).toBe(true);
    }
  });

  it("does not invent an unknown brand", () => {
    expect(PublishBrandIcon({ id: "not-a-brand" as never })).toBeNull();
  });
});
