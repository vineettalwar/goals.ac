import { createHash } from "node:crypto";
import { parse } from "node-html-parser";
import type { CrawledPage, PageLink } from "./types";

const MAX_LINKS = 500;
const MAX_IMAGES = 500;

function normalizeUrl(href: string, base: string): string | null {
  try {
    const u = new URL(href, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    return u.href;
  } catch {
    return null;
  }
}

function sameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

function isIndexable(robotsMeta: string | null, xRobots: string | null): boolean {
  const combined = `${robotsMeta ?? ""} ${xRobots ?? ""}`.toLowerCase();
  return !/\bnoindex\b/.test(combined);
}

function parseLinkHeaderCanonical(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/<([^>]+)>\s*;\s*rel="?canonical"?/i);
  return match?.[1] ?? null;
}

export type AnalyzeHtmlInput = {
  html: string;
  pageUrl: string;
  statusCode: number;
  responseTimeMs: number;
  redirectUrl: string | null;
  xRobotsTag: string | null;
  linkHeader: string | null;
  crawlDepth: number | null;
  fromSitemap: boolean;
  pageId: string;
  fetchClass?: CrawledPage["fetchClass"];
};

/** Extract SEO fields from HTML using node-html-parser (already a package dep). */
export function analyzeHtml(input: AnalyzeHtmlInput): CrawledPage {
  const root = parse(input.html);
  const title = root.querySelector("title")?.text?.trim() || null;
  const metaDescription =
    root.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() || null;
  const robotsMeta =
    root.querySelector('meta[name="robots"]')?.getAttribute("content")?.trim() || null;
  const canonicalUrl =
    normalizeUrl(
      root.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "",
      input.pageUrl,
    ) || null;
  const headerCanonicalUrl =
    normalizeUrl(parseLinkHeaderCanonical(input.linkHeader) ?? "", input.pageUrl) || null;

  const headingOrder: number[] = [];
  const h1s: string[] = [];
  for (const el of root.querySelectorAll("h1,h2,h3,h4,h5,h6")) {
    const level = Number(el.tagName.replace(/\D/g, ""));
    if (!level) continue;
    headingOrder.push(level);
    if (level === 1) h1s.push(el.text.trim());
  }

  const images = root.querySelectorAll("img").slice(0, MAX_IMAGES);
  let imagesMissingAlt = 0;
  for (const img of images) {
    if (!img.hasAttribute("alt")) imagesMissingAlt += 1;
  }

  const linksByTarget = new Map<string, PageLink>();
  for (const a of root.querySelectorAll("a[href]")) {
    if (linksByTarget.size >= MAX_LINKS) break;
    const href = a.getAttribute("href") ?? "";
    if (/^(javascript:|mailto:|tel:|#)/i.test(href)) continue;
    const resolved = normalizeUrl(href, input.pageUrl);
    if (!resolved || linksByTarget.has(resolved)) continue;
    linksByTarget.set(resolved, {
      href: resolved,
      internal: sameOrigin(resolved, input.pageUrl),
      rel: a.getAttribute("rel") ?? "",
      anchor: a.text.replace(/\s+/g, " ").trim().slice(0, 200),
    });
  }

  const body = root.querySelector("body") ?? root;
  const text = body.text.replace(/\s+/g, " ").trim();
  const wordCount = text ? text.split(" ").filter(Boolean).length : 0;
  const contentHash =
    wordCount > 0 ? createHash("sha256").update(text).digest("hex").slice(0, 16) : null;

  return {
    id: input.pageId,
    url: input.pageUrl,
    statusCode: input.statusCode,
    fetchClass: input.fetchClass ?? "ok",
    responseTimeMs: input.responseTimeMs,
    redirectUrl: input.redirectUrl,
    isHtml: true,
    title,
    metaDescription,
    canonicalUrl,
    headerCanonicalUrl,
    robotsMeta,
    xRobotsTag: input.xRobotsTag,
    isIndexable: isIndexable(robotsMeta, input.xRobotsTag),
    h1Count: h1s.length,
    headingOrder,
    wordCount,
    contentHash,
    imagesTotal: images.length,
    imagesMissingAlt,
    links: [...linksByTarget.values()],
    crawlDepth: input.crawlDepth,
    fromSitemap: input.fromSitemap,
  };
}

export function emptyPage(partial: {
  id: string;
  url: string;
  statusCode: number | null;
  fetchClass: CrawledPage["fetchClass"];
  responseTimeMs: number;
  redirectUrl?: string | null;
  crawlDepth?: number | null;
  fromSitemap?: boolean;
  xRobotsTag?: string | null;
}): CrawledPage {
  return {
    id: partial.id,
    url: partial.url,
    statusCode: partial.statusCode,
    fetchClass: partial.fetchClass,
    responseTimeMs: partial.responseTimeMs,
    redirectUrl: partial.redirectUrl ?? null,
    isHtml: false,
    title: null,
    metaDescription: null,
    canonicalUrl: null,
    headerCanonicalUrl: null,
    robotsMeta: null,
    xRobotsTag: partial.xRobotsTag ?? null,
    isIndexable: true,
    h1Count: 0,
    headingOrder: [],
    wordCount: 0,
    contentHash: null,
    imagesTotal: 0,
    imagesMissingAlt: 0,
    links: [],
    crawlDepth: partial.crawlDepth ?? null,
    fromSitemap: partial.fromSitemap ?? false,
  };
}
