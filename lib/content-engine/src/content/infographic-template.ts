import type { ContentFormatType } from "@workspace/db";
import type { ContentPieceMetadata } from "./content-piece-seo";

const INFOGRAPHIC_START = "<!-- goals-ac-infographic -->";
const INFOGRAPHIC_END = "<!-- /goals-ac-infographic -->";

/** goals.ac paper / forest tokens (DESIGN.md) */
const PAPER_BG = "#FAFAF8";
const FOREST = "#2D3B2D";
const FOREST_MUTED = "#5A6B5A";
const RULE = "#D8DDD4";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Extract bullet or table rows for infographic template. */
export function extractKeyPoints(body: string, max = 5): string[] {
  const points: string[] = [];
  const bullets = body.match(/^[-*] \*\*(.+?)\*\*[:—-]?\s*(.+)$/gm) ?? [];
  for (const line of bullets.slice(0, max)) {
    const m = line.match(/^[-*] \*\*(.+?)\*\*[:—-]?\s*(.+)$/);
    if (m) {
      const label = m[1].replace(/[:—-]\s*$/, "").trim();
      const detail = m[2].trim().slice(0, 80);
      points.push(detail ? `${label}: ${detail}` : label);
    }
  }
  if (points.length >= 2) return points;

  const headings = (body.match(/^## (.+)$/gm) ?? [])
    .map((h) => h.replace(/^## /, "").trim())
    .filter((h) => !/faq|summary|conclusion|visual summary|at a glance/i.test(h))
    .slice(0, max);
  return headings;
}

function extractStatHook(body: string, keyword: string): string {
  const statMatch = body.match(/\d{1,3}(?:,\d{3})*(?:\.\d+)?%|\d{1,3}(?:,\d{3})+\+?/);
  if (statMatch) return `Key data point: ${statMatch[0]} — relevant to ${keyword}.`;
  return `Scannable summary of ${keyword} — shareable in decks and social posts.`;
}

function formatBulletLines(points: string[]): string[] {
  return points.slice(0, 5).map((p) => {
    const split = p.match(/^([^:—-]+?)\s*[:—-]\s*(.+)$/);
    if (split) {
      const topic = split[1]!.trim().slice(0, 48);
      const detail = split[2]!.trim().slice(0, 72);
      return `${topic} — ${detail}`;
    }
    return p.slice(0, 96);
  });
}

/**
 * Pure SVG “At a glance” card — paper background, forest accent.
 * No external assets; safe for data URIs and CMS markdown.
 */
export function buildAtAGlanceSvg(
  points: string[],
  options: { title: string; brandName?: string },
): string | null {
  const lines = formatBulletLines(points);
  if (lines.length < 2) return null;

  const title = options.title.replace(/#+\s*/g, "").slice(0, 56);
  const brand = options.brandName?.trim().slice(0, 40) ?? "";
  const rowH = 28;
  const headerH = 64;
  const footerH = brand ? 28 : 16;
  const padX = 20;
  const width = 480;
  const height = headerH + lines.length * rowH + footerH + 8;

  const bulletEls = lines
    .map((line, i) => {
      const y = headerH + 6 + i * rowH;
      const cy = y + 8;
      return `
      <circle cx="${padX + 6}" cy="${cy}" r="3.5" fill="${FOREST}"/>
      <text x="${padX + 18}" y="${cy + 4}" font-family="Georgia, 'Times New Roman', serif" font-size="13" fill="${FOREST}">${escapeXml(line)}</text>`;
    })
    .join("");

  const brandEl = brand
    ? `<text x="${padX}" y="${height - 12}" font-family="system-ui, sans-serif" font-size="11" fill="${FOREST_MUTED}">${escapeXml(brand)}</text>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="At a glance">
  <rect width="${width}" height="${height}" rx="12" fill="${PAPER_BG}" stroke="${RULE}" stroke-width="1"/>
  <rect x="0" y="0" width="6" height="${height}" rx="3" fill="${FOREST}"/>
  <text x="${padX}" y="28" font-family="system-ui, sans-serif" font-size="11" font-weight="600" letter-spacing="0.06em" fill="${FOREST_MUTED}">AT A GLANCE</text>
  <text x="${padX}" y="50" font-family="Georgia, 'Times New Roman', serif" font-size="16" font-weight="700" fill="${FOREST}">${escapeXml(title)}</text>
  <line x1="${padX}" y1="58" x2="${width - padX}" y2="58" stroke="${RULE}" stroke-width="1"/>
  ${bulletEls}
  ${brandEl}
</svg>`.trim();
}

/** Encode SVG as a publishable data URI for markdown `![](...)` / `<img src>`. */
export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Callout + optional SVG image that renders in ContentMarkdown / CMS.
 * Tables omitted (need remark-gfm); bullets work everywhere.
 */
export function buildInfographicMarkdownBlock(
  body: string,
  options: { title: string; keyword: string; brandName?: string; svgDataUri?: string | null },
): string | null {
  const points = extractKeyPoints(body);
  if (points.length < 2) return null;

  const bullets = points
    .slice(0, 4)
    .map((p) => {
      const split = p.match(/^([^:—-]+?)\s*[:—-]\s*(.+)$/);
      if (split) {
        const topic = split[1]!.trim().slice(0, 80);
        const detail = split[2]!.trim().slice(0, 120);
        return `- **${topic}** — ${detail}`;
      }
      return `- **${p.slice(0, 80)}**`;
    })
    .join("\n");

  const title = options.title.replace(/#+\s*/, "").slice(0, 60);
  const brandPrefix = options.brandName ? `${options.brandName} · ` : "";
  const hook = extractStatHook(body, options.keyword);

  const imageLine = options.svgDataUri
    ? `\n\n![At a glance](${options.svgDataUri})\n`
    : "\n";

  return `${INFOGRAPHIC_START}

### At a glance

> **${title}**
>
> ${bullets.split("\n").join("\n> ")}
>
> **${brandPrefix}Visual summary:** ${hook}
${imageLine}
${INFOGRAPHIC_END}`;
}

/** Pull the injected block (including markers) out of article body. */
export function extractInfographicMarkdown(body: string): string | null {
  const start = body.indexOf(INFOGRAPHIC_START);
  if (start < 0) return null;
  const end = body.indexOf(INFOGRAPHIC_END, start);
  if (end < 0) return body.slice(start).trim();
  return body.slice(start, end + INFOGRAPHIC_END.length).trim();
}

export type InfographicInjectionResult = {
  body: string;
  /** Present when the block exists or was newly injected — for pieceMetadata.visualSummaryMarkdown */
  visualSummaryMarkdown: string | null;
  /** Raw SVG markup for pieceMetadata.visualSummarySvg */
  visualSummarySvg: string | null;
  /** data:image/svg+xml URI for aside `<img>` / markdown image */
  visualSummarySvgDataUri: string | null;
  injected: boolean;
};

function buildVisualSummaryAssets(
  body: string,
  options: { title: string; keyword: string; brandName?: string },
): {
  /** Body injection: callout + markdown image data URI */
  block: string;
  /** Metadata: callout only (aside uses visualSummarySvgDataUri for the graphic) */
  visualSummaryMarkdown: string;
  visualSummarySvg: string;
  visualSummarySvgDataUri: string;
} | null {
  const points = extractKeyPoints(body);
  const svg = buildAtAGlanceSvg(points, {
    title: options.title,
    brandName: options.brandName,
  });
  if (!svg) return null;
  const dataUri = svgToDataUri(svg);
  const block = buildInfographicMarkdownBlock(body, {
    ...options,
    svgDataUri: dataUri,
  });
  const visualSummaryMarkdown = buildInfographicMarkdownBlock(body, {
    ...options,
    svgDataUri: null,
  });
  if (!block || !visualSummaryMarkdown) return null;
  return {
    block,
    visualSummaryMarkdown,
    visualSummarySvg: svg,
    visualSummarySvgDataUri: dataUri,
  };
}

/**
 * Injects a markdown "infographic" callout (+ SVG image) into long-form SEO content.
 * SVG is also returned for pieceMetadata — no external image service.
 */
export function injectInfographicMarkdownBlock(
  body: string,
  options: { title: string; keyword: string; brandName?: string },
): InfographicInjectionResult {
  const assets = buildVisualSummaryAssets(body, options);
  if (!assets) {
    const existing = extractInfographicMarkdown(body);
    return {
      body,
      visualSummaryMarkdown: existing,
      visualSummarySvg: null,
      visualSummarySvgDataUri: null,
      injected: false,
    };
  }

  const existing = extractInfographicMarkdown(body);
  if (existing) {
    // Refresh SVG + callout metadata; leave an existing body block untouched.
    return {
      body,
      visualSummaryMarkdown: assets.visualSummaryMarkdown,
      visualSummarySvg: assets.visualSummarySvg,
      visualSummarySvgDataUri: assets.visualSummarySvgDataUri,
      injected: false,
    };
  }

  const { block } = assets;
  const firstH2 = body.search(/^## /m);
  let nextBody: string;
  if (firstH2 > 0) {
    nextBody = `${body.slice(0, firstH2)}${block}\n\n${body.slice(firstH2)}`;
  } else {
    const introEnd = body.indexOf("\n\n", body.indexOf("\n\n") + 1);
    if (introEnd > 0) {
      nextBody = `${body.slice(0, introEnd)}\n\n${block}${body.slice(introEnd)}`;
    } else {
      nextBody = `${body.trim()}\n\n${block}`;
    }
  }

  return {
    body: nextBody,
    visualSummaryMarkdown: assets.visualSummaryMarkdown,
    visualSummarySvg: assets.visualSummarySvg,
    visualSummarySvgDataUri: assets.visualSummarySvgDataUri,
    injected: true,
  };
}

export function shouldInjectInfographic(format: ContentFormatType): boolean {
  return format === "blog_post" || format === "guide" || format === "pillar_page" || format === "tutorial";
}

/**
 * Apply infographic injection + set visual summary markdown/SVG on pieceMetadata.
 *
 * `visualSummarySvg` / `visualSummarySvgDataUri` are for in-app/aside preview and
 * the body markdown image. Do not set `featuredImageUrl` / `ogImageUrl` to SVG data
 * URIs — many CMS featured-image APIs reject SVG. Stock photos remain preferred for
 * CMS publish; on Node workers, `enrichContentPieceImages` may rasterize the SVG to
 * a PNG data URI via sharp when no stock featured exists.
 */
export function applyInfographicToContentPiece<
  T extends {
    title: string;
    target_keyword: string;
    body_markdown: string;
    pieceMetadata?: ContentPieceMetadata;
  },
>(result: T, format: ContentFormatType, brandName?: string): T {
  if (!shouldInjectInfographic(format)) return result;

  const { body, visualSummaryMarkdown, visualSummarySvg, visualSummarySvgDataUri } =
    injectInfographicMarkdownBlock(result.body_markdown, {
      title: result.title,
      keyword: result.target_keyword,
      brandName,
    });

  if (!visualSummaryMarkdown && !visualSummarySvg) return result;

  return {
    ...result,
    body_markdown: body,
    pieceMetadata: {
      ...result.pieceMetadata,
      hasInfographicBlock: Boolean(visualSummaryMarkdown),
      ...(visualSummaryMarkdown ? { visualSummaryMarkdown } : {}),
      ...(visualSummarySvg ? { visualSummarySvg } : {}),
      ...(visualSummarySvgDataUri ? { visualSummarySvgDataUri } : {}),
    },
  };
}
