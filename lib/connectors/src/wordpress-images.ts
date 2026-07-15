import { marked } from "marked";
import {
  downloadAndOptimizeImage,
  optimizeImageBuffer,
  type OptimizedImage,
} from "@workspace/media";
import type { WordPressCredentials } from "./wordpress";
import { uploadWordPressMedia } from "./wordpress";
import type { GoalsAcPluginCredentials } from "./goals-ac-plugin";
import { uploadGoalsAcPluginMedia } from "./goals-ac-plugin";

export type PublishableImageRef = {
  role: "featured" | "inline";
  provider: "unsplash" | "pexels";
  remoteId: string;
  remoteUrl: string;
  alt: string;
  title: string;
  searchQuery: string;
  rankScore: number;
  photographer: string;
  photographerUrl: string;
  sectionHeading?: string;
  publishedUrl?: string;
};

export type PreparedWordPressImages = {
  bodyMarkdown: string;
  featuredImageId?: number;
  featuredHostedUrl?: string;
  updatedImages?: PublishableImageRef[];
};

type ImageUploadMap = Map<string, { attachmentId: number; sourceUrl: string }>;

/** PNG/JPEG data URIs only — SVG and other schemes are ignored for CMS featured upload. */
const RASTER_DATA_URI_RE = /^data:image\/(png|jpeg|jpg);base64,([A-Za-z0-9+/=\s]+)$/i;
/** ~5MB decoded — featured fallbacks from enricher stay well under this. */
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

async function pushOptimizedMedia(
  optimized: OptimizedImage,
  meta: { alt: string; title: string; caption?: string },
  wpCreds: WordPressCredentials | null,
  pluginCreds: GoalsAcPluginCredentials | null,
): Promise<{ attachmentId: number; sourceUrl: string }> {
  if (pluginCreds) {
    const uploaded = await uploadGoalsAcPluginMedia(pluginCreds, {
      filename: optimized.filename,
      mimeType: optimized.mimeType,
      dataBase64: optimized.buffer.toString("base64"),
      alt: meta.alt,
      title: meta.title,
      caption: meta.caption,
    });
    return { attachmentId: uploaded.id, sourceUrl: uploaded.sourceUrl };
  }

  if (!wpCreds) {
    throw new Error("WordPress credentials required for media upload");
  }

  const uploaded = await uploadWordPressMedia(wpCreds, {
    buffer: optimized.buffer,
    filename: optimized.filename,
    mimeType: optimized.mimeType,
    alt: meta.alt,
    title: meta.title,
    caption: meta.caption,
  });
  return { attachmentId: uploaded.id, sourceUrl: uploaded.sourceUrl };
}

async function uploadOptimizedImage(
  image: PublishableImageRef,
  filenameBase: string,
  wpCreds: WordPressCredentials | null,
  pluginCreds: GoalsAcPluginCredentials | null,
): Promise<{ attachmentId: number; sourceUrl: string }> {
  const optimized = await downloadAndOptimizeImage(
    image.remoteUrl,
    filenameBase,
    { maxWidth: 1920, quality: 85 },
  );

  const sourceLabel = image.provider === "unsplash" ? "Unsplash" : "Pexels";
  const caption = `Photo by ${image.photographer} on ${sourceLabel}`;

  return pushOptimizedMedia(
    optimized,
    { alt: image.alt, title: image.title, caption },
    wpCreds,
    pluginCreds,
  );
}

async function uploadFeaturedDataUri(
  dataUri: string,
  filenameBase: string,
  wpCreds: WordPressCredentials | null,
  pluginCreds: GoalsAcPluginCredentials | null,
): Promise<{ attachmentId: number; sourceUrl: string } | null> {
  const decoded = decodeRasterFeaturedDataUri(dataUri);
  if (!decoded) return null;
  const optimized = await optimizeImageBuffer(decoded.buffer, filenameBase, {
    maxWidth: 1920,
    quality: 85,
  });
  return pushOptimizedMedia(
    optimized,
    { alt: "Featured image", title: filenameBase },
    wpCreds,
    pluginCreds,
  );
}

function rewriteMarkdownImageUrls(
  bodyMarkdown: string,
  urlMap: ImageUploadMap,
): string {
  let result = bodyMarkdown;
  for (const [remoteUrl, hosted] of urlMap) {
    const escaped = remoteUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(
      new RegExp(`!\\[([^\\]]*)\\]\\(${escaped}\\)`, "g"),
      `![$1](${hosted.sourceUrl})`,
    );
  }
  return result;
}

async function rewriteHtmlImageTags(
  html: string,
  images: PublishableImageRef[],
  urlMap: ImageUploadMap,
): Promise<string> {
  let result = html;
  for (const image of images) {
    const hosted = urlMap.get(image.remoteUrl);
    if (!hosted) continue;
    const escaped = image.remoteUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(
      new RegExp(`<img([^>]*?)src="${escaped}"([^>]*?)>`, "g"),
      `<img$1src="${hosted.sourceUrl}" alt="${image.alt.replace(/"/g, "&quot;")}" title="${image.title.replace(/"/g, "&quot;")}" class="wp-image-${hosted.attachmentId}"$2>`,
    );
  }
  return result;
}

export async function prepareWordPressImages(params: {
  bodyMarkdown: string;
  targetKeyword: string;
  images?: PublishableImageRef[];
  /** When set to a PNG/JPEG data URI and no stock featured uploaded, decode and upload as media. */
  featuredImageUrl?: string | null;
  wpCreds?: WordPressCredentials | null;
  pluginCreds?: GoalsAcPluginCredentials | null;
}): Promise<PreparedWordPressImages> {
  const images = params.images ?? [];
  const featuredDataUri =
    !images.some((img) => img.role === "featured") &&
    isRasterFeaturedDataUri(params.featuredImageUrl)
      ? params.featuredImageUrl!.trim()
      : null;

  if (images.length === 0 && !featuredDataUri) {
    return { bodyMarkdown: params.bodyMarkdown };
  }

  const urlMap: ImageUploadMap = new Map();
  const updatedImages: PublishableImageRef[] = [];
  const uniqueImages: PublishableImageRef[] = [];
  const seenUrls = new Set<string>();

  for (const image of images) {
    if (seenUrls.has(image.remoteUrl)) {
      continue;
    }
    seenUrls.add(image.remoteUrl);
    uniqueImages.push(image);
  }

  const concurrency = 3;
  let nextIndex = 0;
  const uploadWorker = async () => {
    while (nextIndex < uniqueImages.length) {
      const index = nextIndex++;
      const image = uniqueImages[index]!;
      const filenameBase = `${params.targetKeyword}-${image.role}`;
      const uploaded = await uploadOptimizedImage(
        image,
        filenameBase,
        params.wpCreds ?? null,
        params.pluginCreds ?? null,
      );
      urlMap.set(image.remoteUrl, uploaded);
    }
  };

  if (uniqueImages.length > 0) {
    await Promise.all(
      Array.from({ length: Math.min(concurrency, uniqueImages.length) }, () => uploadWorker()),
    );
  }

  for (const image of images) {
    const hosted = urlMap.get(image.remoteUrl);
    updatedImages.push({
      ...image,
      publishedUrl: hosted?.sourceUrl ?? image.publishedUrl,
    });
  }

  const bodyMarkdown = rewriteMarkdownImageUrls(params.bodyMarkdown, urlMap);
  const featured = updatedImages.find((img) => img.role === "featured");
  const featuredUpload = featured ? urlMap.get(featured.remoteUrl) : undefined;

  let featuredImageId = featuredUpload?.attachmentId;
  let featuredHostedUrl = featuredUpload?.sourceUrl ?? featured?.publishedUrl;

  if (!featuredImageId && featuredDataUri) {
    const fromDataUri = await uploadFeaturedDataUri(
      featuredDataUri,
      `${params.targetKeyword}-featured`,
      params.wpCreds ?? null,
      params.pluginCreds ?? null,
    );
    if (fromDataUri) {
      featuredImageId = fromDataUri.attachmentId;
      featuredHostedUrl = fromDataUri.sourceUrl;
    }
  }

  return {
    bodyMarkdown,
    featuredImageId,
    featuredHostedUrl,
    updatedImages: updatedImages.length > 0 ? updatedImages : undefined,
  };
}

export async function markdownToWordPressHtmlWithHostedImages(
  bodyMarkdown: string,
  images: PublishableImageRef[],
  urlMap: ImageUploadMap,
): Promise<string> {
  const rewritten = rewriteMarkdownImageUrls(bodyMarkdown, urlMap);
  const html = await marked(rewritten);
  return rewriteHtmlImageTags(html, images, urlMap);
}

export { uploadWordPressMedia } from "./wordpress";
