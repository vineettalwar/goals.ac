import { describe, expect, it } from "vitest";
import { applyStockPhotoToPiece, type ImageEnrichablePiece } from "./article-image-enricher";

const photo = {
  provider: "unsplash" as const,
  id: "abc123",
  url: "https://images.unsplash.com/photo-test",
  photographer: "Jane",
  photographerUrl: "https://unsplash.com/@jane",
  description: "Mountain trail",
};

describe("applyStockPhotoToPiece", () => {
  it("stores featured source CDN URL only", () => {
    const piece: ImageEnrichablePiece = {
      title: "Hiking guide",
      target_keyword: "day hikes",
      body_markdown: "# Hiking guide\n\nIntro paragraph.\n\n## Gear\n\nPack light.",
      formatType: "blog_post",
      pieceMetadata: {},
    };
    const next = applyStockPhotoToPiece(piece, photo, {
      role: "featured",
      searchQuery: "day hikes",
    });

    expect(next.pieceMetadata?.featuredImageUrl).toBe(photo.url);
    expect(next.pieceMetadata?.ogImageUrl).toBe(photo.url);
    expect(next.pieceMetadata?.images?.[0]?.remoteUrl).toBe(photo.url);
    expect(next.pieceMetadata?.images?.[0]?.role).toBe("featured");
    expect(next.body_markdown).toMatch(
      /!\[Mountain trail\]\(https:\/\/images\.unsplash\.com\/photo-test\)/,
    );
  });

  it("appends inline markdown with source URL", () => {
    const piece: ImageEnrichablePiece = {
      title: "Hiking guide",
      target_keyword: "day hikes",
      body_markdown: "# Hiking guide\n\nIntro.\n\n## Gear\n\nPack light.",
      formatType: "blog_post",
      pieceMetadata: { images: [] },
    };
    const next = applyStockPhotoToPiece(
      piece,
      { ...photo, url: "https://images.pexels.com/photos/1/test.jpeg" },
      { role: "inline", sectionHeading: "Gear", alt: "Hiking gear" },
    );

    expect(next.pieceMetadata?.images?.[0]?.role).toBe("inline");
    expect(next.body_markdown).toMatch(
      /## Gear\n+\n!\[Hiking gear\]\(https:\/\/images\.pexels\.com\/photos\/1\/test\.jpeg\)/,
    );
  });
});
