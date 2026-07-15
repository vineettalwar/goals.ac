import { describe, expect, it } from "vitest";
import { decodeRasterFeaturedDataUri, isRasterFeaturedDataUri } from "./raster-data-uri";
import { hostRasterFeaturedDataUri, isContentMediaHostConfigured } from "./content-media-host";

describe("content media host", () => {
  it("skips when R2 / public base URL are not configured", async () => {
    expect(isContentMediaHostConfigured()).toBe(false);
    const url = await hostRasterFeaturedDataUri("data:image/png;base64,iVBORw0KGgo=");
    expect(url).toBeNull();
  });

  it("accepts raster data URIs only", () => {
    expect(isRasterFeaturedDataUri("data:image/png;base64,iVBORw0KGgo=")).toBe(true);
    expect(isRasterFeaturedDataUri("data:image/svg+xml;base64,PHN2Zy8+")).toBe(false);
    const decoded = decodeRasterFeaturedDataUri(
      `data:image/png;base64,${Buffer.from([1, 2, 3, 4]).toString("base64")}`,
    );
    expect(decoded?.mimeHint).toBe("image/png");
  });
});
