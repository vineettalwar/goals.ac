import { assertAllowedStockCdnUrl, isAllowedStockCdnHost } from "@workspace/stock-images";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import {
  optimizeImageBuffer,
  slugifyForFilename,
  svgMarkupToPngDataUri,
  type OptimizeImageOptions,
  type OptimizedImage,
  type SvgToPngOptions,
} from "./optimize";

export type { OptimizeImageOptions, OptimizedImage, SvgToPngOptions };
export { optimizeImageBuffer, slugifyForFilename, svgMarkupToPngDataUri };
export {
  decodeRasterFeaturedDataUri,
  isRasterFeaturedDataUri,
} from "./raster-data-uri";
export {
  getContentMediaR2Binding,
  setContentMediaR2Binding,
  type ContentMediaR2Binding,
} from "./r2-binding";
export {
  hostRasterFeaturedDataUri,
  isContentMediaHostConfigured,
  resolveHostedFeaturedImageUrl,
  type HostContentMediaOptions,
} from "./content-media-host";

export async function downloadImageBuffer(url: string): Promise<Buffer> {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    throw new Error("Invalid image URL");
  }

  if (isAllowedStockCdnHost(hostname)) {
    assertAllowedStockCdnUrl(url);
  } else {
    await assertPublicUrl(url);
  }

  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Failed to download image: HTTP ${res.status}`);
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    throw new Error(`URL did not return an image (content-type: ${contentType || "unknown"})`);
  }
  return Buffer.from(await res.arrayBuffer());
}

export async function downloadAndOptimizeImage(
  url: string,
  filenameBase: string,
  options?: OptimizeImageOptions,
): Promise<OptimizedImage> {
  const raw = await downloadImageBuffer(url);
  return optimizeImageBuffer(raw, filenameBase, options);
}
