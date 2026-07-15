/** PNG/JPEG data URIs only — SVG and other schemes are ignored for featured upload. */
const RASTER_DATA_URI_RE = /^data:image\/(png|jpeg|jpg);base64,([A-Za-z0-9+/=\s]+)$/i;
/** ~5MB decoded — visual-summary PNG fallbacks stay well under this. */
const MAX_FEATURED_DATA_URI_BYTES = 5 * 1024 * 1024;

export function isRasterFeaturedDataUri(url: string | null | undefined): boolean {
  if (!url?.startsWith("data:image/")) return false;
  return RASTER_DATA_URI_RE.test(url.trim());
}

/**
 * Decode a PNG/JPEG data URI for featured-image upload.
 * Returns null for SVG, other mime types, invalid base64, or oversized payloads.
 */
export function decodeRasterFeaturedDataUri(
  dataUri: string,
): { buffer: Buffer; mimeHint: "image/png" | "image/jpeg" } | null {
  const match = dataUri.trim().match(RASTER_DATA_URI_RE);
  if (!match) return null;
  const subtype = match[1]!.toLowerCase();
  const b64 = match[2]!.replace(/\s+/g, "");
  let buffer: Buffer;
  try {
    buffer = Buffer.from(b64, "base64");
  } catch {
    return null;
  }
  if (buffer.length === 0 || buffer.length > MAX_FEATURED_DATA_URI_BYTES) return null;
  return {
    buffer,
    mimeHint: subtype === "png" ? "image/png" : "image/jpeg",
  };
}
