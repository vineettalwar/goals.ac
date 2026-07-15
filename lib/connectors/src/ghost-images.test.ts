import { describe, expect, it } from "vitest";
import {
  decodeRasterFeaturedDataUri,
  isRasterFeaturedDataUri,
} from "./wordpress-images";

/** Mirrors resolveGhostFeatureImage input gate — https vs PNG/JPEG data URI. */
function acceptsGhostFeaturedSource(url: string | null | undefined): boolean {
  const raw = url?.trim();
  if (!raw) return false;
  if (isRasterFeaturedDataUri(raw)) return decodeRasterFeaturedDataUri(raw) != null;
  return /^https?:\/\//i.test(raw);
}

describe("Ghost featured image source gate", () => {
  it("accepts https and raster data URIs only", () => {
    expect(acceptsGhostFeaturedSource("https://cdn.example/a.png")).toBe(true);
    expect(acceptsGhostFeaturedSource("http://cdn.example/a.jpg")).toBe(true);
    expect(acceptsGhostFeaturedSource("data:image/png;base64,iVBORw0KGgo=")).toBe(true);
    expect(acceptsGhostFeaturedSource("data:image/jpeg;base64,/9j/4AAQ=")).toBe(true);
    expect(acceptsGhostFeaturedSource("data:image/svg+xml;base64,PHN2Zy8+")).toBe(false);
    expect(acceptsGhostFeaturedSource("ftp://x/a.png")).toBe(false);
    expect(acceptsGhostFeaturedSource(null)).toBe(false);
  });
});
