import { describe, expect, it } from "vitest";
import {
  decodeRasterFeaturedDataUri,
  isRasterFeaturedDataUri,
} from "./wordpress-images";

/** Mirrors resolveShopifyArticleImage input gate — https vs PNG/JPEG data URI. */
function acceptsShopifyFeaturedSource(url: string | null | undefined): boolean {
  const raw = url?.trim();
  if (!raw) return false;
  if (isRasterFeaturedDataUri(raw)) return decodeRasterFeaturedDataUri(raw) != null;
  return /^https?:\/\//i.test(raw);
}

describe("Shopify featured image source gate", () => {
  it("accepts https and raster data URIs only", () => {
    expect(acceptsShopifyFeaturedSource("https://cdn.example/a.png")).toBe(true);
    expect(acceptsShopifyFeaturedSource("http://cdn.example/a.jpg")).toBe(true);
    expect(acceptsShopifyFeaturedSource("data:image/png;base64,iVBORw0KGgo=")).toBe(true);
    expect(acceptsShopifyFeaturedSource("data:image/jpeg;base64,/9j/4AAQ=")).toBe(true);
    expect(acceptsShopifyFeaturedSource("data:image/svg+xml;base64,PHN2Zy8+")).toBe(false);
    expect(acceptsShopifyFeaturedSource("ftp://x/a.png")).toBe(false);
    expect(acceptsShopifyFeaturedSource(null)).toBe(false);
  });
});
