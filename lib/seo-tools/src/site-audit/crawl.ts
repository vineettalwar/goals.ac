/**
 * BFS site-audit crawler. Uses assertPublicUrl on every URL (including
 * redirect hops) and redirect: "manual" so private IPs cannot be reached
 * via open redirects.
 */
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import { fetchSitemapInfo } from "../sitemap-crawl";
import { AUDIT_USER_AGENT } from "./issue-types";
import { analyzeHtml, emptyPage } from "./page-analyzer";
import {
  findBrokenInternalLinks,
  findDuplicates,
  findOrphans,
  findRedirectChainsAndLoops,
} from "./multipage-checks";
import { runPageReporters } from "./page-reporters";
import type { CrawledPage, SiteAuditResult } from "./types";

const DEFAULT_MAX_PAGES = 50;
const FETCH_TIMEOUT_MS = 12_000;
const MAX_REDIRECT_HOPS = 5;

export type SiteAuditCrawlOptions = {
  startUrl: string;
  maxPages?: number;
  /** Inject for tests */
  fetchImpl?: typeof fetch;
};

type QueueItem = { url: string; depth: number; fromSitemap: boolean };

function originOf(url: string): string {
  return new URL(url).origin;
}

function normalizeSeed(url: string): string {
  const u = new URL(url);
  u.hash = "";
  if (!u.pathname.endsWith("/") && !u.pathname.includes(".")) {
    // keep as-is; do not force trailing slash
  }
  return u.href;
}

function classifyBlocked(status: number, bodySnippet: string, headers: Headers): boolean {
  if (status === 403 || status === 429 || status === 503) {
    const cf = headers.get("cf-mitigated") || headers.get("cf-ray");
    if (cf) return true;
    if (status === 403 || status === 429) return true;
  }
  const lower = bodySnippet.toLowerCase();
  return (
    lower.includes("cf-browser-verification") ||
    lower.includes("challenge-platform") ||
    lower.includes("attention required") ||
    lower.includes("access denied")
  );
}

async function loadRobotsAllow(
  origin: string,
  fetchImpl: typeof fetch,
): Promise<(url: string) => boolean> {
  try {
    await assertPublicUrl(`${origin}/robots.txt`);
    const res = await fetchImpl(`${origin}/robots.txt`, {
      headers: { "User-Agent": AUDIT_USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return () => true;
    const text = (await res.text()).slice(0, 500_000);
    // Minimal: collect Disallow paths under User-agent: * / GoalsAc
    const disallows: string[] = [];
    let inStar = false;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.split("#")[0]!.trim();
      if (!line) continue;
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      const field = line.slice(0, idx).trim().toLowerCase();
      const value = line.slice(idx + 1).trim();
      if (field === "user-agent") {
        const agent = value.toLowerCase();
        inStar = agent === "*" || agent.includes("goalsac");
        continue;
      }
      if (!inStar) continue;
      if (field === "disallow" && value) disallows.push(value);
    }
    return (url: string) => {
      try {
        const path = new URL(url).pathname;
        return !disallows.some((d) => d !== "" && (path === d || path.startsWith(d)));
      } catch {
        return false;
      }
    };
  } catch {
    return () => true;
  }
}

async function fetchPage(
  url: string,
  fetchImpl: typeof fetch,
): Promise<{
  finalUrl: string;
  statusCode: number;
  fetchClass: CrawledPage["fetchClass"];
  responseTimeMs: number;
  redirectUrl: string | null;
  html: string | null;
  contentType: string | null;
  xRobotsTag: string | null;
  linkHeader: string | null;
}> {
  const started = Date.now();
  let current = url;
  let redirectUrl: string | null = null;

  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
    await assertPublicUrl(current);
    const res = await fetchImpl(current, {
      method: "GET",
      redirect: "manual",
      headers: {
        "User-Agent": AUDIT_USER_AGENT,
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    const responseTimeMs = Date.now() - started;
    const loc = res.headers.get("location");

    if (res.status >= 300 && res.status < 400 && loc) {
      const next = new URL(loc, current).href;
      redirectUrl = redirectUrl ?? next;
      if (hop === MAX_REDIRECT_HOPS) {
        return {
          finalUrl: current,
          statusCode: res.status,
          fetchClass: "ok",
          responseTimeMs,
          redirectUrl: next,
          html: null,
          contentType: res.headers.get("content-type"),
          xRobotsTag: res.headers.get("x-robots-tag"),
          linkHeader: res.headers.get("link"),
        };
      }
      current = next;
      continue;
    }

    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf).slice(0, 512);
    const snippet = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    const html =
      res.status < 400
        ? new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(buf))
        : snippet;

    if (classifyBlocked(res.status, snippet, res.headers)) {
      return {
        finalUrl: current,
        statusCode: res.status,
        fetchClass: "blocked",
        responseTimeMs,
        redirectUrl,
        html: null,
        contentType: res.headers.get("content-type"),
        xRobotsTag: res.headers.get("x-robots-tag"),
        linkHeader: res.headers.get("link"),
      };
    }

    return {
      finalUrl: current,
      statusCode: res.status,
      fetchClass: "ok",
      responseTimeMs,
      redirectUrl,
      html,
      contentType: res.headers.get("content-type"),
      xRobotsTag: res.headers.get("x-robots-tag"),
      linkHeader: res.headers.get("link"),
    };
  }

  throw new Error("Redirect hop budget exceeded");
}

export async function runSiteAuditCrawl(
  options: SiteAuditCrawlOptions,
): Promise<SiteAuditResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const startUrl = normalizeSeed(options.startUrl);
  await assertPublicUrl(startUrl);
  const maxPages = Math.min(Math.max(options.maxPages ?? DEFAULT_MAX_PAGES, 1), 200);
  const origin = originOf(startUrl);
  const isAllowed = await loadRobotsAllow(origin, fetchImpl);

  const queue: QueueItem[] = [{ url: startUrl, depth: 0, fromSitemap: false }];
  const seen = new Set<string>([startUrl]);
  const pages: CrawledPage[] = [];
  let pageSeq = 0;

  // Seed from sitemap (after start URL) so link discovery gets budget first.
  try {
    const base = origin;
    const info = await fetchSitemapInfo(base);
    for (const loc of info.crawlData?.pageUrls.slice(0, maxPages) ?? []) {
      try {
        await assertPublicUrl(loc);
      } catch {
        continue;
      }
      if (originOf(loc) !== origin) continue;
      if (!isAllowed(loc)) continue;
      if (seen.has(loc)) continue;
      seen.add(loc);
      queue.push({ url: loc, depth: 1, fromSitemap: true });
    }
  } catch {
    // sitemap optional
  }

  while (queue.length > 0 && pages.length < maxPages) {
    const item = queue.shift()!;
    if (!isAllowed(item.url)) continue;

    let fetched;
    try {
      fetched = await fetchPage(item.url, fetchImpl);
    } catch {
      pages.push(
        emptyPage({
          id: `p${++pageSeq}`,
          url: item.url,
          statusCode: null,
          fetchClass: "error",
          responseTimeMs: 0,
          crawlDepth: item.depth,
          fromSitemap: item.fromSitemap,
        }),
      );
      continue;
    }

    const pageId = `p${++pageSeq}`;
    const isHtml = (fetched.contentType ?? "").includes("html") || Boolean(fetched.html?.includes("<html"));

    let page: CrawledPage;
    if (fetched.fetchClass === "blocked") {
      page = emptyPage({
        id: pageId,
        url: item.url,
        statusCode: fetched.statusCode,
        fetchClass: "blocked",
        responseTimeMs: fetched.responseTimeMs,
        redirectUrl: fetched.redirectUrl,
        crawlDepth: item.depth,
        fromSitemap: item.fromSitemap,
        xRobotsTag: fetched.xRobotsTag,
      });
    } else if (
      fetched.statusCode >= 300 &&
      fetched.statusCode < 400 &&
      fetched.redirectUrl
    ) {
      page = emptyPage({
        id: pageId,
        url: item.url,
        statusCode: fetched.statusCode,
        fetchClass: "ok",
        responseTimeMs: fetched.responseTimeMs,
        redirectUrl: fetched.redirectUrl,
        crawlDepth: item.depth,
        fromSitemap: item.fromSitemap,
      });
      if (
        fetched.redirectUrl &&
        originOf(fetched.redirectUrl) === origin &&
        !seen.has(fetched.redirectUrl) &&
        pages.length + queue.length < maxPages
      ) {
        seen.add(fetched.redirectUrl);
        queue.push({
          url: fetched.redirectUrl,
          depth: item.depth,
          fromSitemap: item.fromSitemap,
        });
      }
    } else if (fetched.html && isHtml && fetched.statusCode < 400) {
      page = analyzeHtml({
        html: fetched.html,
        pageUrl: fetched.finalUrl !== item.url ? item.url : item.url,
        statusCode: fetched.statusCode,
        responseTimeMs: fetched.responseTimeMs,
        redirectUrl: fetched.redirectUrl,
        xRobotsTag: fetched.xRobotsTag,
        linkHeader: fetched.linkHeader,
        crawlDepth: item.depth,
        fromSitemap: item.fromSitemap,
        pageId,
      });
      // Prefer recording the requested URL for link-graph consistency
      page = { ...page, url: item.url };

      for (const link of page.links) {
        if (!link.internal) continue;
        if (originOf(link.href) !== origin) continue;
        if (!isAllowed(link.href)) continue;
        if (seen.has(link.href)) continue;
        if (pages.length + queue.length >= maxPages) break;
        seen.add(link.href);
        queue.push({ url: link.href, depth: item.depth + 1, fromSitemap: false });
      }
    } else {
      page = emptyPage({
        id: pageId,
        url: item.url,
        statusCode: fetched.statusCode,
        fetchClass: "ok",
        responseTimeMs: fetched.responseTimeMs,
        redirectUrl: fetched.redirectUrl,
        crawlDepth: item.depth,
        fromSitemap: item.fromSitemap,
        xRobotsTag: fetched.xRobotsTag,
      });
    }

    pages.push(page);
  }

  const crawlComplete = queue.length === 0 && pages.length < maxPages;
  const issues = [
    ...pages.flatMap(runPageReporters),
    ...findDuplicates(pages),
    ...findRedirectChainsAndLoops(pages),
    ...findBrokenInternalLinks(pages),
    ...findOrphans(pages, crawlComplete),
  ];

  return {
    startUrl,
    maxPages,
    pagesCrawled: pages.length,
    crawlComplete,
    pages,
    issues,
  };
}
