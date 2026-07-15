import { describe, expect, it } from "vitest";
import {
  decodeRasterFeaturedDataUri,
  isRasterFeaturedDataUri,
} from "./wordpress-images";

describe("featured data URI helpers", () => {
  const png = "data:image/png;base64,iVBORw0KGgo=";
  const jpeg = "data:image/jpeg;base64,/9j/4AAQ=";
  const svg = "data:image/svg+xml;base64,PHN2Zy8+";

  it("accepts PNG and JPEG data URIs only", () => {
    expect(isRasterFeaturedDataUri(png)).toBe(true);
    expect(isRasterFeaturedDataUri(jpeg)).toBe(true);
    expect(isRasterFeaturedDataUri(svg)).toBe(false);
    expect(isRasterFeaturedDataUri("https://cdn.example/a.png")).toBe(false);
  });

  it("decodes PNG/JPEG bytes and skips SVG", () => {
    const decodedPng = decodeRasterFeaturedDataUri(png);
    expect(decodedPng?.mimeHint).toBe("image/png");
    expect(decodedPng?.buffer.length).toBeGreaterThan(0);

    const decodedJpeg = decodeRasterFeaturedDataUri(jpeg);
    expect(decodedJpeg?.mimeHint).toBe("image/jpeg");

    expect(decodeRasterFeaturedDataUri(svg)).toBeNull();
  });
});
