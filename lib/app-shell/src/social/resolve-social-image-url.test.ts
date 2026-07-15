import { describe, expect, it } from "vitest";
import {
  isPublicHttpImageUrl,
  resolveSocialPieceImageUrl,
  resolveSocialPiecePublicImageUrl,
} from "./types";

describe("resolveSocialPiecePublicImageUrl", () => {
  it("keeps data: PNG for preview but not for Instagram public gate", () => {
    const piece = {
      pieceMetadata: {
        featuredImageUrl: "data:image/png;base64,abc",
      },
    };
    expect(resolveSocialPieceImageUrl(piece)).toBe("data:image/png;base64,abc");
    expect(resolveSocialPiecePublicImageUrl(piece)).toBeUndefined();
  });

  it("prefers stock HTTPS over visual-summary data: featured", () => {
    const piece = {
      pieceMetadata: {
        featuredImageUrl: "data:image/png;base64,abc",
        images: [{ role: "featured", remoteUrl: "https://images.unsplash.com/photo-1" }],
      },
    };
    expect(resolveSocialPiecePublicImageUrl(piece)).toBe(
      "https://images.unsplash.com/photo-1",
    );
  });

  it("isPublicHttpImageUrl rejects data URIs", () => {
    expect(isPublicHttpImageUrl("https://cdn.example.com/a.jpg")).toBe(true);
    expect(isPublicHttpImageUrl("data:image/png;base64,x")).toBe(false);
  });
});
