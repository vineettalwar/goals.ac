import { marked } from "marked";
import { downloadAndOptimizeImage } from "@workspace/media";
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

  const caption = `Photo by ${image.photographer} on ${image.provider === "unsplash" ? "Unsplash" : "Pexels"}`;

  if (pluginCreds) {
    const uploaded = await uploadGoalsAcPluginMedia(pluginCreds, {
      filename: optimized.filename,
      mimeType: optimized.mimeType,
      dataBase64: optimized.buffer.toString("base64"),
      alt: image.alt,
      title: image.title,
      caption,
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
    alt: image.alt,
    title: image.title,
    caption,
  });
  return { attachmentId: uploaded.id, sourceUrl: uploaded.sourceUrl };
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
  wpCreds?: WordPressCredentials | null;
  pluginCreds?: GoalsAcPluginCredentials | null;
}): Promise<PreparedWordPressImages> {
  const images = params.images ?? [];
  if (images.length === 0) {
    return { bodyMarkdown: params.bodyMarkdown };
  }

  const urlMap: ImageUploadMap = new Map();
  const updatedImages: PublishableImageRef[] = [];

  for (const image of images) {
    if (urlMap.has(image.remoteUrl)) {
      updatedImages.push({
        ...image,
        publishedUrl: urlMap.get(image.remoteUrl)!.sourceUrl,
      });
      continue;
    }

    const filenameBase = `${params.targetKeyword}-${image.role}`;
    const uploaded = await uploadOptimizedImage(
      image,
      filenameBase,
      params.wpCreds ?? null,
      params.pluginCreds ?? null,
    );
    urlMap.set(image.remoteUrl, uploaded);
    updatedImages.push({ ...image, publishedUrl: uploaded.sourceUrl });
  }

  const bodyMarkdown = rewriteMarkdownImageUrls(params.bodyMarkdown, urlMap);
  const featured = updatedImages.find((img) => img.role === "featured");
  const featuredUpload = featured ? urlMap.get(featured.remoteUrl) : undefined;

  return {
    bodyMarkdown,
    featuredImageId: featuredUpload?.attachmentId,
    featuredHostedUrl: featuredUpload?.sourceUrl ?? featured?.publishedUrl,
    updatedImages,
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
