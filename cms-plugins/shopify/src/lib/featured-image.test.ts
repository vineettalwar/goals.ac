import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  decodeRasterFeaturedDataUri,
  isRasterFeaturedDataUri,
} from "./featured-image.js";

describe("Shopify plugin featured image source gate", () => {
  it("accepts raster data URIs and rejects SVG / other schemes", () => {
    assert.equal(isRasterFeaturedDataUri("data:image/png;base64,iVBORw0KGgo="), true);
    assert.equal(isRasterFeaturedDataUri("data:image/jpeg;base64,/9j/4AAQ="), true);
    assert.equal(isRasterFeaturedDataUri("data:image/svg+xml;base64,PHN2Zy8+"), false);
    assert.equal(isRasterFeaturedDataUri("https://cdn.example/a.png"), false);
    assert.equal(isRasterFeaturedDataUri(null), false);
  });

  it("decodes PNG/JPEG data URIs and skips empty or oversized payloads", () => {
    const tiny = Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString("base64");
    const decoded = decodeRasterFeaturedDataUri(`data:image/png;base64,${tiny}`);
    assert.ok(decoded);
    assert.equal(decoded.mimeType, "image/png");
    assert.equal(decoded.filename, "featured.png");
    assert.equal(decoded.buffer.length, 4);

    assert.equal(decodeRasterFeaturedDataUri("data:image/png;base64,"), null);
    assert.equal(decodeRasterFeaturedDataUri("data:image/svg+xml;base64,PHN2Zy8+"), null);
  });
});
