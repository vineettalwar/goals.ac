import type { ContentFormatType } from "@workspace/db";
import type { ContentPieceMetadata } from "./content-piece-seo";

const INFOGRAPHIC_START = "<!-- goals-ac-infographic -->";
const INFOGRAPHIC_END = "<!-- /goals-ac-infographic -->";

/** Extract bullet or table rows for infographic template. */
function extractKeyPoints(body: string, max = 4): string[] {
  const points: string[] = [];
  const bullets = body.match(/^[-*] \*\*(.+?)\*\*[:—-]?\s*(.+)$/gm) ?? [];
  for (const line of bullets.slice(0, max)) {
    const m = line.match(/^[-*] \*\*(.+?)\*\*[:—-]?\s*(.+)$/);
    if (m) points.push(`${m[1]}: ${m[2].slice(0, 80)}`);
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

/**
 * Callout + bullet layout that renders cleanly in ContentMarkdown / react-markdown
 * without GFM tables (tables need remark-gfm).
 */
export function buildInfographicMarkdownBlock(
  body: string,
  options: { title: string; keyword: string; brandName?: string },
): string | null {
  const points = extractKeyPoints(body);
  if (points.length < 2) return null;

  const bullets = points
    .slice(0, 4)
    .map((p) => {
      const [label, ...rest] = p.split(/[:—-]/);
      const detail = rest.join(":").trim();
      const topic = (label?.trim() || p).slice(0, 80);
      if (detail) return `- **${topic}** — ${detail.slice(0, 120)}`;
      return `- **${topic}**`;
    })
    .join("\n");

  const title = options.title.replace(/#+\s*/, "").slice(0, 60);
  const brandPrefix = options.brandName ? `${options.brandName} · ` : "";
  const hook = extractStatHook(body, options.keyword);

  return `${INFOGRAPHIC_START}

### At a glance

> **${title}**
>
> ${bullets.split("\n").join("\n> ")}
>
> **${brandPrefix}Visual summary:** ${hook}

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
  injected: boolean;
};

/**
 * Injects a markdown "infographic" callout into long-form SEO content.
 * Renders as a scannable visual section in preview/CMS — no image asset.
 */
export function injectInfographicMarkdownBlock(
  body: string,
  options: { title: string; keyword: string; brandName?: string },
): InfographicInjectionResult {
  const existing = extractInfographicMarkdown(body);
  if (existing) {
    return { body, visualSummaryMarkdown: existing, injected: false };
  }

  const block = buildInfographicMarkdownBlock(body, options);
  if (!block) {
    return { body, visualSummaryMarkdown: null, injected: false };
  }

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

  return { body: nextBody, visualSummaryMarkdown: block, injected: true };
}

export function shouldInjectInfographic(format: ContentFormatType): boolean {
  return format === "blog_post" || format === "guide" || format === "pillar_page" || format === "tutorial";
}

/** Apply infographic injection + set pieceMetadata.visualSummaryMarkdown when available. */
export function applyInfographicToContentPiece<
  T extends {
    title: string;
    target_keyword: string;
    body_markdown: string;
    pieceMetadata?: ContentPieceMetadata;
  },
>(result: T, format: ContentFormatType, brandName?: string): T {
  if (!shouldInjectInfographic(format)) return result;

  const { body, visualSummaryMarkdown, injected } = injectInfographicMarkdownBlock(
    result.body_markdown,
    {
      title: result.title,
      keyword: result.target_keyword,
      brandName,
    },
  );

  if (!visualSummaryMarkdown) return result;

  return {
    ...result,
    body_markdown: body,
    pieceMetadata: {
      ...result.pieceMetadata,
      hasInfographicBlock: true,
      visualSummaryMarkdown,
    },
  };
}
