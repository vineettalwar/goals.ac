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

  it("appends a credit line with real links after a newly inserted featured image", () => {
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

    expect(next.body_markdown).toContain(
      `*Photo by [Jane](https://unsplash.com/@jane?utm_source=goals-ac&utm_medium=referral) on [Unsplash](https://unsplash.com/?utm_source=goals-ac&utm_medium=referral)*`,
    );
    // Immediately follows the image line, not appended somewhere unrelated.
    expect(next.body_markdown).toMatch(
      /!\[Mountain trail\]\(https:\/\/images\.unsplash\.com\/photo-test\)\n\n\*Photo by/,
    );
  });

  it("appends a credit line after a newly inserted inline image", () => {
    const piece: ImageEnrichablePiece = {
      title: "Hiking guide",
      target_keyword: "day hikes",
      body_markdown: "# Hiking guide\n\nIntro.\n\n## Gear\n\nPack light.",
      formatType: "blog_post",
      pieceMetadata: { images: [] },
    };
    const next = applyStockPhotoToPiece(piece, photo, {
      role: "inline",
      sectionHeading: "Gear",
      alt: "Hiking gear",
    });

    expect(next.body_markdown).toMatch(
      /!\[Hiking gear\]\(https:\/\/images\.unsplash\.com\/photo-test\)\n\n\*Photo by \[Jane\]/,
    );
  });

  it("replaces the old credit line, not just the URL, when a featured image is swapped", () => {
    const piece: ImageEnrichablePiece = {
      title: "Hiking guide",
      target_keyword: "day hikes",
      body_markdown: "# Hiking guide\n\nIntro paragraph.\n\n## Gear\n\nPack light.",
      formatType: "blog_post",
      pieceMetadata: {},
    };
    const withFirstPhoto = applyStockPhotoToPiece(piece, photo, {
      role: "featured",
      searchQuery: "day hikes",
    });

    const secondPhoto = {
      provider: "pexels" as const,
      id: "xyz789",
      url: "https://images.pexels.com/photos/2/mountain.jpeg",
      photographer: "Alex",
      photographerUrl: "https://www.pexels.com/@alex",
      description: "Snowy peak",
    };
    const withSecondPhoto = applyStockPhotoToPiece(withFirstPhoto, secondPhoto, {
      role: "featured",
      searchQuery: "day hikes",
    });

    // The old photographer's credit and the old image are both gone —
    // leaving them would misattribute the new photo to the old photographer.
    expect(withSecondPhoto.body_markdown).not.toContain("Jane");
    expect(withSecondPhoto.body_markdown).not.toContain("images.unsplash.com/photo-test");
    // The new photo and its own credit are present, immediately adjacent.
    expect(withSecondPhoto.body_markdown).toMatch(
      /!\[Snowy peak\]\(https:\/\/images\.pexels\.com\/photos\/2\/mountain\.jpeg\)\n\n\*Photo by \[Alex\]\(https:\/\/www\.pexels\.com\/@alex\) on \[Pexels\]/,
    );
    // Exactly one credit line remains, not the old one left stale alongside the new one.
    expect(withSecondPhoto.body_markdown!.match(/\*Photo by/g)).toHaveLength(1);
  });

  it("fabricates no credit line for an unrecognized provider", () => {
    const piece: ImageEnrichablePiece = {
      title: "Hiking guide",
      target_keyword: "day hikes",
      body_markdown: "# Hiking guide\n\nIntro paragraph.\n\n## Gear\n\nPack light.",
      formatType: "blog_post",
      pieceMetadata: {},
    };
    const unrecognizedProviderPhoto = {
      // A real allowlisted CDN host (assertAllowedStockCdnUrl rejects
      // anything else — a separate, legitimate guard this test isn't about)
      // with a provider value neither "unsplash" nor "pexels" recognize, the
      // shape a future/custom source would have.
      provider: "custom-upload" as unknown as "unsplash",
      id: "custom-1",
      url: "https://images.unsplash.com/photo-unrecognized",
      photographer: "N/A",
      photographerUrl: "",
      description: "Custom upload",
    };
    const next = applyStockPhotoToPiece(piece, unrecognizedProviderPhoto, {
      role: "featured",
      searchQuery: "day hikes",
    });

    expect(next.body_markdown).toContain(
      "![Custom upload](https://images.unsplash.com/photo-unrecognized)",
    );
    expect(next.body_markdown).not.toContain("*Photo by");
  });
});
