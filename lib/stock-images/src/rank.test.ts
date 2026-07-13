import { describe, expect, it } from "vitest";
import { rankStockPhotos } from "./rank";
import type { StockPhoto } from "./types";

const basePhoto = (overrides: Partial<StockPhoto> & { id: string }): StockPhoto => ({
  provider: "unsplash",
  id: overrides.id,
  url: `https://images.unsplash.com/${overrides.id}`,
  previewUrl: `https://images.unsplash.com/${overrides.id}-sm`,
  width: overrides.width ?? 1600,
  height: overrides.height ?? 900,
  photographer: "Test Photographer",
  photographerUrl: "https://unsplash.com/@test",
  tags: overrides.tags,
  description: overrides.description,
  likes: overrides.likes,
});

describe("rankStockPhotos", () => {
  it("prefers photos with stronger keyword overlap", () => {
    const ranked = rankStockPhotos("local seo", [
      basePhoto({ id: "a", description: "office workspace", tags: ["business"] }),
      basePhoto({ id: "b", description: "local seo map pack rankings", tags: ["local", "seo"] }),
    ]);
    expect(ranked[0]?.id).toBe("b");
    expect(ranked[0]?.rankScore).toBeGreaterThan(ranked[1]?.rankScore ?? 0);
  });

  it("excludes photo ids in excludeIds", () => {
    const ranked = rankStockPhotos(
      "marketing",
      [basePhoto({ id: "a" }), basePhoto({ id: "b" })],
      { excludeIds: ["unsplash:a"] },
    );
    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.id).toBe("b");
  });
});
