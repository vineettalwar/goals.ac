import { hostRasterFeaturedDataUri } from "@workspace/media";
import { logger } from "../../core/logger";

/**
 * If featured is still a raster data URI, upload to content-media R2 when
 * configured and return HTTPS. Otherwise return the input unchanged.
 */
export async function hostFeaturedImageForPublish(
  featuredImageUrl: string | null | undefined,
  options?: { scope?: string; filenameBase?: string },
): Promise<string | undefined> {
  const raw = featuredImageUrl?.trim();
  if (!raw) return undefined;
  if (/^https:\/\//i.test(raw)) return raw;
  if (!raw.startsWith("data:image/")) return raw;

  try {
    const hosted = await hostRasterFeaturedDataUri(raw, {
      scope: options?.scope,
      filenameBase: options?.filenameBase ?? "featured",
    });
    if (hosted) return hosted;
  } catch (err) {
    logger.warn({ err }, "content-media R2 publish host failed; keeping data URI");
  }
  return raw;
}
