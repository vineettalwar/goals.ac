import type { ContentPieceImageRef, ContentFormatType } from "@workspace/db";
import { DEFAULT_IMAGE_SETTINGS, type ProjectImageSettings } from "@workspace/db/schema/website_projects";
import { isStockSearchAvailable, pickBestStockPhoto, type DecryptedStockCredentialContext } from "@workspace/stock-images";
import type { AiProviderClient } from "../support/ai/resolve-ai-client";
import { isSeoLongformFormat } from "../content/content-piece-seo";
import { isHumanizableSocialFormat } from "../content/humanize-eligibility";
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
    visualSummarySvg?: string;
    visualSummarySvgDataUri?: string;
    [key: string]: unknown;
  };
};

function isSvgDataUri(url?: string | null): boolean {
  return Boolean(url?.startsWith("data:image/svg+xml"));
}

/** Drop SVG data URIs from featured/og fields (CMS-incompatible). */
function nonSvgImageUrl(url?: string | null): string | undefined {
  if (!url || isSvgDataUri(url)) return undefined;
  return url;
}

function visualSummarySvgMarkup(meta: ImageEnrichablePiece["pieceMetadata"]): string | null {
  if (meta?.visualSummarySvg?.trim()) return meta.visualSummarySvg.trim();
  const dataUri = meta?.visualSummarySvgDataUri;
  if (!dataUri || !isSvgDataUri(dataUri)) return null;
  const comma = dataUri.indexOf(",");
  if (comma < 0) return null;
  const payload = dataUri.slice(comma + 1);
  try {
    if (dataUri.includes(";base64,")) {
      return Buffer.from(payload, "base64").toString("utf8");
    }
    return decodeURIComponent(payload);
  } catch {
    return null;
  }
}

/**
 * Rasterize visual-summary SVG → PNG data URI on Node (native sharp via @workspace/media).
 * No-op on Cloudflare Workers where sharp is stubbed.
 */
async function pngFeaturedFromVisualSummary(
  meta: ImageEnrichablePiece["pieceMetadata"],
): Promise<string | null> {
  const svg = visualSummarySvgMarkup(meta);
  if (!svg) return null;
  try {
    const { svgMarkupToPngDataUri } = await import("@workspace/media");
    return await svgMarkupToPngDataUri(svg);
  } catch (err) {
    logger.debug({ err }, "visualSummary SVG→PNG skipped (sharp unavailable)");
    return null;
  }
}

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
  const isSocial = isHumanizableSocialFormat(format);
  const stockCredentials = options?.stockCredentials;
  const shouldEnrich =
    isStockSearchAvailable(stockCredentials) &&
    settings.autoFeaturedImage !== false &&
    (isLongform || isSocial);

  const keyword = piece.target_keyword?.trim() || piece.title;
  const images: ContentPieceImageRef[] = [];
  let body = piece.body_markdown;
  const excludeIds = options?.excludeImageIds ?? [];

  if (shouldEnrich) {
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
  }

  const featuredImage = images.find((img) => img.role === "featured");
  // Prefer stock remote URLs for CMS. Never use SVG data URIs as featured/og.
  let featuredImageUrl =
    featuredImage?.remoteUrl ?? nonSvgImageUrl(piece.pieceMetadata?.featuredImageUrl);
  let ogImageUrl =
    featuredImage?.remoteUrl ?? nonSvgImageUrl(piece.pieceMetadata?.ogImageUrl);

  if (isLongform && !featuredImageUrl) {
    const pngDataUri = await pngFeaturedFromVisualSummary(piece.pieceMetadata);
    if (pngDataUri) {
      featuredImageUrl = pngDataUri;
      ogImageUrl = ogImageUrl ?? pngDataUri;
    }
  }

  // Prefer public HTTPS on platform content-media R2 when configured.
  if (featuredImageUrl?.startsWith("data:image/")) {
    try {
      const { hostRasterFeaturedDataUri } = await import("@workspace/media");
      const hosted = await hostRasterFeaturedDataUri(featuredImageUrl, {
        filenameBase: keyword || "featured",
      });
      if (hosted) {
        featuredImageUrl = hosted;
        if (ogImageUrl?.startsWith("data:image/")) ogImageUrl = hosted;
      }
    } catch (err) {
      logger.debug({ err }, "content-media R2 host skipped");
    }
  }

  const nextMeta: NonNullable<T["pieceMetadata"]> = {
    ...piece.pieceMetadata,
    ...(shouldEnrich ? { images } : {}),
  };
  if (featuredImageUrl) nextMeta.featuredImageUrl = featuredImageUrl;
  else delete nextMeta.featuredImageUrl;
  if (ogImageUrl) nextMeta.ogImageUrl = ogImageUrl;
  else delete nextMeta.ogImageUrl;

  return {
    ...piece,
    body_markdown: body,
    pieceMetadata: nextMeta,
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
  const metaFeatured = nonSvgImageUrl(piece.pieceMetadata?.featuredImageUrl);
  if (metaFeatured) return metaFeatured;
  const body = piece.bodyMarkdown ?? piece.body_markdown ?? "";
  const match = body.match(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/);
  return match?.[1];
}

export function featuredImageRefFromPiece(piece: {
  pieceMetadata?: { images?: ContentPieceImageRef[] } | null;
}): ContentPieceImageRef | undefined {
  return piece.pieceMetadata?.images?.find((img) => img.role === "featured");
}
