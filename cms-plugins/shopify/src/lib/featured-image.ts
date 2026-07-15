import { graphqlRequest, type ArticleImageInput } from "./shopify-graphql.js";

/** PNG/JPEG data URIs only — SVG and other schemes are ignored. */
const RASTER_DATA_URI_RE = /^data:image\/(png|jpeg|jpg);base64,([A-Za-z0-9+/=\s]+)$/i;
/** ~5MB decoded — visual-summary PNG fallbacks stay well under this. */
const MAX_FEATURED_DATA_URI_BYTES = 5 * 1024 * 1024;

type StagedTarget = {
  url: string;
  resourceUrl: string;
  parameters: { name: string; value: string }[];
};

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
): { buffer: Buffer; mimeType: "image/png" | "image/jpeg"; filename: string } | null {
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
  const mimeType = subtype === "png" ? "image/png" : "image/jpeg";
  const filename = subtype === "png" ? "featured.png" : "featured.jpg";
  return { buffer, mimeType, filename };
}

/**
 * Staged upload → Shopify temp resource URL for ArticleCreateInput.image.
 * resource: FILE — works with write_content blog apps without a separate fileCreate.
 */
export async function uploadShopifyStagedImage(params: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}): Promise<string> {
  const data = await graphqlRequest<{
    stagedUploadsCreate: {
      stagedTargets?: StagedTarget[];
      userErrors?: { message: string }[];
    };
  }>(
    `
      mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
          stagedTargets {
            url
            resourceUrl
            parameters {
              name
              value
            }
          }
          userErrors {
            message
          }
        }
      }
    `,
    {
      input: [
        {
          filename: params.filename,
          mimeType: params.mimeType,
          resource: "FILE",
          httpMethod: "POST",
          fileSize: String(params.buffer.byteLength),
        },
      ],
    },
  );

  const errors = data.stagedUploadsCreate.userErrors;
  if (errors?.length) {
    throw new Error(`Shopify stagedUploadsCreate error: ${errors[0].message}`);
  }
  const target = data.stagedUploadsCreate.stagedTargets?.[0];
  if (!target?.url || !target.resourceUrl) {
    throw new Error("Shopify stagedUploadsCreate returned no target.");
  }

  const form = new FormData();
  for (const param of target.parameters) {
    form.append(param.name, param.value);
  }
  const blob = new Blob([new Uint8Array(params.buffer)], { type: params.mimeType });
  form.append("file", blob, params.filename);

  const uploadRes = await fetch(target.url, { method: "POST", body: form });
  if (!uploadRes.ok) {
    const text = await uploadRes.text().catch(() => "");
    throw new Error(`Shopify staged file upload failed: ${uploadRes.status} ${text}`);
  }

  return target.resourceUrl;
}

/**
 * Resolve featured image for ArticleCreateInput.image.
 * - https/http → pass-through (Shopify fetches the public URL)
 * - PNG/JPEG data URI → staged upload → resourceUrl
 * - SVG / other schemes → skipped
 */
export async function resolveArticleImageFromFeaturedUrl(
  featuredImageUrl: string | null | undefined,
  altText?: string,
): Promise<ArticleImageInput | undefined> {
  const raw = featuredImageUrl?.trim();
  if (!raw) return undefined;

  const withAlt = (url: string): ArticleImageInput =>
    altText?.trim() ? { url, altText: altText.trim() } : { url };

  if (isRasterFeaturedDataUri(raw)) {
    const decoded = decodeRasterFeaturedDataUri(raw);
    if (!decoded) return undefined;
    try {
      const resourceUrl = await uploadShopifyStagedImage({
        buffer: decoded.buffer,
        filename: decoded.filename,
        mimeType: decoded.mimeType,
      });
      return withAlt(resourceUrl);
    } catch {
      // No https fallback for data URIs — skip image rather than fail the article.
      return undefined;
    }
  }

  if (/^https?:\/\//i.test(raw)) {
    return withAlt(raw);
  }

  return undefined;
}
