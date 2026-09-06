import { fetchPage, stripHtmlStructured } from "../brand/brand-scraper";

const MIN_WORDS = 50;
const MAX_BODY_CHARS = 80_000;

export type PageExtractOk = {
  ok: true;
  title: string;
  bodyMarkdown: string;
  canonicalUrl: string | null;
  wordCount: number;
  truncated: boolean;
};

export type PageExtractFail = {
  ok: false;
  error: string;
  pasteFallback: true;
};

export type PageExtractResult = PageExtractOk | PageExtractFail;

export function wordCountFromMarkdown(markdown: string): number {
  return markdown.trim().split(/\s+/).filter(Boolean).length;
}

export function extractTitleFromHtml(html: string): string {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
  if (og?.[1]?.trim()) return decodeHtmlEntities(og[1].trim());

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (title?.[1]?.trim()) return decodeHtmlEntities(title[1].replace(/\s+/g, " ").trim());

  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1?.[1]) {
    const text = h1[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text) return decodeHtmlEntities(text);
  }
  return "Untitled page";
}

export function extractCanonicalUrl(html: string, baseUrl: string): string | null {
  const match =
    html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) ??
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  if (!match?.[1]) return null;
  try {
    return new URL(match[1], baseUrl).href;
  } catch {
    return null;
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Convert fetched HTML into markdown-ish body for the Studio editor.
 * Uses structured strip (headings/lists survive) then prefixes an H1 when missing.
 */
export function htmlToRefreshMarkdown(
  html: string,
  title: string,
  maxChars = MAX_BODY_CHARS,
): { markdown: string; truncated: boolean } {
  const structured = stripHtmlStructured(html, maxChars + 2_000);
  const truncated = structured.length >= maxChars || stripHtmlStructured(html, maxChars + 2_001).length > maxChars;
  let body = structured.slice(0, maxChars).trim();
  if (!/^#\s/m.test(body) && title) {
    body = `# ${title}\n\n${body}`;
  }
  return { markdown: body, truncated };
}

export function extractFromPaste(bodyMarkdown: string, titleHint?: string): PageExtractResult {
  const trimmed = bodyMarkdown.trim();
  const wordCount = wordCountFromMarkdown(trimmed);
  if (wordCount < MIN_WORDS) {
    return {
      ok: false,
      error: `Paste at least ${MIN_WORDS} words (got ${wordCount}).`,
      pasteFallback: true,
    };
  }
  const titleMatch = trimmed.match(/^#\s+(.+)$/m);
  const title = titleHint?.trim() || titleMatch?.[1]?.trim() || "Untitled page";
  return {
    ok: true,
    title,
    bodyMarkdown: trimmed,
    canonicalUrl: null,
    wordCount,
    truncated: false,
  };
}

export async function importPageFromUrl(
  url: string,
  opts: {
    websiteProjectId?: number;
    /** Skip fetch — use pasted markdown instead. */
    bodyMarkdown?: string;
    titleHint?: string;
  } = {},
): Promise<PageExtractResult> {
  if (opts.bodyMarkdown?.trim()) {
    return extractFromPaste(opts.bodyMarkdown, opts.titleHint);
  }

  const html = await fetchPage(url, {
    websiteProjectId: opts.websiteProjectId,
    refresh: true,
  });
  if (!html) {
    return {
      ok: false,
      error: "Could not fetch that page. Paste the article markdown instead.",
      pasteFallback: true,
    };
  }

  const title = opts.titleHint?.trim() || extractTitleFromHtml(html);
  const canonicalUrl = extractCanonicalUrl(html, url);
  const { markdown, truncated } = htmlToRefreshMarkdown(html, title);
  const wordCount = wordCountFromMarkdown(markdown);
  if (wordCount < MIN_WORDS) {
    return {
      ok: false,
      error:
        "Page body looks empty or JavaScript-rendered. Paste the article markdown instead.",
      pasteFallback: true,
    };
  }

  return {
    ok: true,
    title,
    bodyMarkdown: markdown,
    canonicalUrl,
    wordCount,
    truncated,
  };
}
