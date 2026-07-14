import type { ContentPieceImageRef, ContentFormatType } from "@workspace/db";
import { DEFAULT_IMAGE_SETTINGS, type ProjectImageSettings } from "@workspace/db/schema/website_projects";
import { isStockSearchAvailable, pickBestStockPhoto, type DecryptedStockCredentialContext } from "@workspace/stock-images";
import type { AiProviderClient } from "../support/ai/resolve-ai-client";
import { isSeoLongformFormat } from "../content/content-piece-seo";
import { logger } from "../core/logger";

export type ImageEnrichablePiece = {
  title: string;
  target_keyword: string;
  body_markdown: string;
  formatType?: ContentFormatType;
  pieceMetadata?: {
    images?: ContentPieceImageRef[];
    featuredImageUrl?: string;
    ogImageUrl?: string;
    [key: string]: unknown;
  };
};

export function parseImageSettings(
  contentStyle?: { imageSettings?: ProjectImageSettings } | null,
): ProjectImageSettings {
  return {
    ...DEFAULT_IMAGE_SETTINGS,
    ...contentStyle?.imageSettings,
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractH2Headings(body: string): string[] {
  return (body.match(/^## (.+)$/gm) ?? []).map((line) => line.replace(/^## /, "").trim());
}

function injectImageAfterHeading(
  body: string,
  heading: string,
  alt: string,
  url: string,
): string {
  const pattern = new RegExp(`^(##\\s+${escapeRegExp(heading)}\\s*)$`, "m");
  if (!pattern.test(body)) return body;
  const imageMd = `\n\n![${alt}](${url})\n`;
  return body.replace(pattern, `$1${imageMd}`);
}

function injectHeroAfterIntro(body: string, alt: string, url: string): string {
  const paragraphs = body.split(/\n\n+/);
  if (paragraphs.length === 0) return `![${alt}](${url})\n\n${body}`;
  const imageMd = `![${alt}](${url})`;
  if (paragraphs[0].startsWith("#")) {
    paragraphs.splice(1, 0, imageMd);
  } else {
    paragraphs.splice(1, 0, imageMd);
  }
  return paragraphs.join("\n\n");
}

async function generateImageAltTitle(
  ai: AiProviderClient | undefined,
  keyword: string,
  title: string,
  photoDescription?: string,
): Promise<{ alt: string; title: string }> {
  const fallbackAlt = `${keyword} illustration`.slice(0, 125);
  const fallbackTitle = title.slice(0, 100);

  if (!ai) {
    return { alt: fallbackAlt, title: fallbackTitle };
  }

  try {
    const response = await ai.generate({
      prompt: `Write SEO image metadata for a stock photo used in an article.
Target keyword: "${keyword}"
Article title: "${title}"
Photo context: ${photoDescription ?? "professional stock photo"}

Respond ONLY with JSON: { "alt": "<max 125 chars, include keyword naturally>", "title": "<max 100 chars>" }`,
      responseMimeType: "application/json",
      maxOutputTokens: 256,
    });

    const raw = response.text?.trim();
    if (!raw) return { alt: fallbackAlt, title: fallbackTitle };
    const parsed = JSON.parse(raw) as { alt?: string; title?: string };
    return {
      alt: (parsed.alt ?? fallbackAlt).slice(0, 125),
      title: (parsed.title ?? fallbackTitle).slice(0, 100),
    };
  } catch (err) {
    logger.warn({ err, keyword }, "Image alt/title generation failed, using fallback");
    return { alt: fallbackAlt, title: fallbackTitle };
  }
}

export async function enrichContentPieceImages<T extends ImageEnrichablePiece>(
  piece: T,
  options?: {
    imageSettings?: ProjectImageSettings;
    ai?: AiProviderClient;
    brandName?: string;
    excludeImageIds?: string[];
    stockCredentials?: DecryptedStockCredentialContext;
  },
): Promise<T & { pieceMetadata: NonNullable<T["pieceMetadata"]> }> {
  const settings = { ...DEFAULT_IMAGE_SETTINGS, ...options?.imageSettings };
  const format = piece.formatType ?? "blog_post";
  const isLongform = isSeoLongformFormat(format);
  const isLinkedIn = format === "linkedin_post";
  const stockCredentials = options?.stockCredentials;
  const shouldEnrich =
    isStockSearchAvailable(stockCredentials) &&
    settings.autoFeaturedImage !== false &&
    (isLongform || isLinkedIn);

  if (!shouldEnrich) {
    return {
      ...piece,
      pieceMetadata: piece.pieceMetadata ?? {},
    };
  }

  const keyword = piece.target_keyword?.trim() || piece.title;
  const images: ContentPieceImageRef[] = [];
  let body = piece.body_markdown;
  const excludeIds = options?.excludeImageIds ?? [];

  const featured = await pickBestStockPhoto(keyword, {
    provider: settings.stockProvider ?? "auto",
    orientation: "landscape",
    excludeIds,
    fallbackQueries: options?.brandName ? [`${keyword} ${options.brandName}`] : undefined,
    credentials: stockCredentials,
  });

  if (featured) {
    const meta = await generateImageAltTitle(
      options?.ai,
      keyword,
      piece.title,
      featured.description,
    );
    const ref: ContentPieceImageRef = {
      role: "featured",
      provider: featured.provider,
      remoteId: featured.id,
      remoteUrl: featured.url,
      alt: meta.alt,
      title: meta.title,
      searchQuery: keyword,
      rankScore: featured.rankScore,
      photographer: featured.photographer,
      photographerUrl: featured.photographerUrl,
    };
    images.push(ref);

    if (isLongform && !body.includes(featured.url)) {
      body = injectHeroAfterIntro(body, ref.alt, featured.url);
    }
  }

  if (isLongform && settings.autoInlineImages !== false) {
    const maxInline = settings.maxInlineImages ?? 2;
    const headings = extractH2Headings(body).slice(0, maxInline);
    const usedIds = images.map((img) => `${img.provider}:${img.remoteId}`);

    for (const heading of headings) {
      const inlineQuery = `${keyword} ${heading}`.trim();
      const inline = await pickBestStockPhoto(inlineQuery, {
        provider: settings.stockProvider ?? "auto",
        orientation: "landscape",
        excludeIds: [...excludeIds, ...usedIds],
        credentials: stockCredentials,
      });
      if (!inline) continue;

      const meta = await generateImageAltTitle(
        options?.ai,
        keyword,
        heading,
        inline.description,
      );
      const ref: ContentPieceImageRef = {
        role: "inline",
        provider: inline.provider,
        remoteId: inline.id,
        remoteUrl: inline.url,
        alt: meta.alt,
        title: meta.title,
        searchQuery: inlineQuery,
        rankScore: inline.rankScore,
        photographer: inline.photographer,
        photographerUrl: inline.photographerUrl,
        sectionHeading: heading,
      };
      images.push(ref);
      usedIds.push(`${inline.provider}:${inline.id}`);
      if (!body.includes(inline.url)) {
        body = injectImageAfterHeading(body, heading, ref.alt, inline.url);
      }
    }
  }

  const featuredImage = images.find((img) => img.role === "featured");

  return {
    ...piece,
    body_markdown: body,
    pieceMetadata: {
      ...piece.pieceMetadata,
      images,
      featuredImageUrl: featuredImage?.remoteUrl ?? piece.pieceMetadata?.featuredImageUrl,
      ogImageUrl: featuredImage?.remoteUrl ?? piece.pieceMetadata?.ogImageUrl,
    },
  };
}

export function featuredImageFromMetadata(piece: {
  bodyMarkdown?: string;
  body_markdown?: string;
  pieceMetadata?: { featuredImageUrl?: string; images?: ContentPieceImageRef[] } | null;
}): string | undefined {
  const featured = piece.pieceMetadata?.images?.find((img) => img.role === "featured");
  if (featured?.publishedUrl) return featured.publishedUrl;
  if (featured?.remoteUrl) return featured.remoteUrl;
  if (piece.pieceMetadata?.featuredImageUrl) return piece.pieceMetadata.featuredImageUrl;
  const body = piece.bodyMarkdown ?? piece.body_markdown ?? "";
  const match = body.match(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/);
  return match?.[1];
}

export function featuredImageRefFromPiece(piece: {
  pieceMetadata?: { images?: ContentPieceImageRef[] } | null;
}): ContentPieceImageRef | undefined {
  return piece.pieceMetadata?.images?.find((img) => img.role === "featured");
}
