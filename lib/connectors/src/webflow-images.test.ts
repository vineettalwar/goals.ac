import { describe, expect, it } from "vitest";
import { webflowFeaturedImageUrl } from "./webflow";

describe("Webflow featured image source gate", () => {
  it("accepts https:// only", () => {
    expect(webflowFeaturedImageUrl("https://cdn.example/a.png")).toBe(
      "https://cdn.example/a.png",
    );
    expect(webflowFeaturedImageUrl("  https://cdn.example/a.png  ")).toBe(
      "https://cdn.example/a.png",
    );
    expect(webflowFeaturedImageUrl("http://cdn.example/a.jpg")).toBeUndefined();
    expect(webflowFeaturedImageUrl("data:image/png;base64,iVBORw0KGgo=")).toBeUndefined();
    expect(webflowFeaturedImageUrl("ftp://x/a.png")).toBeUndefined();
    expect(webflowFeaturedImageUrl(null)).toBeUndefined();
    expect(webflowFeaturedImageUrl(undefined)).toBeUndefined();
  });
});
