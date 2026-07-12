import { parse } from "node-html-parser";

export type LlmsTxtResult = {
  url: string;
  content: string;
  pageCount: number;
};

export type RobotsTxtResult = {
  url: string;
  content: string;
  allowsAll: boolean;
  disallows: string[];
  sitemapUrls: string[];
};

export type SitemapResult = {
  url: string;
  urlCount: number;
  urls: string[];
  errors: string[];
};

async function fetchText(url: string, timeoutMs = 10000): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; goals.ac-tools/1.0)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

function originOf(url: string): string {
  return new URL(url).origin;
}

export async function generateLlmsTxt(siteUrl: string): Promise<LlmsTxtResult> {
  const origin = originOf(siteUrl);
  const html = await fetchText(siteUrl);
  const root = parse(html);
  const title = root.querySelector("title")?.text?.trim() ?? new URL(siteUrl).hostname;
  const metaDesc =
    root.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ?? "";

  const links = root
    .querySelectorAll("a[href]")
    .map((a) => a.getAttribute("href") ?? "")
    .filter((href) => href.startsWith("/") || href.startsWith(origin))
    .map((href) => (href.startsWith("/") ? `${origin}${href}` : href))
    .filter((href, i, arr) => arr.indexOf(href) === i)
    .slice(0, 20);

  const lines = [
    `# ${title}`,
    "",
    metaDesc ? `> ${metaDesc}` : "",
    "",
    "## Pages",
    ...links.map((l) => `- ${l}`),
    "",
    "## Optional",
    `- Contact: ${origin}/contact`,
    `- Sitemap: ${origin}/sitemap.xml`,
  ].filter(Boolean);

  return {
    url: siteUrl,
    content: lines.join("\n"),
    pageCount: links.length,
  };
}

export async function checkRobotsTxt(siteUrl: string): Promise<RobotsTxtResult> {
  const origin = originOf(siteUrl);
  const robotsUrl = `${origin}/robots.txt`;
  let content: string;
  try {
    content = await fetchText(robotsUrl);
  } catch {
    return {
      url: robotsUrl,
      content: "",
      allowsAll: true,
      disallows: [],
      sitemapUrls: [],
    };
  }

  const disallows: string[] = [];
  const sitemapUrls: string[] = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().startsWith("disallow:")) {
      disallows.push(trimmed.slice(9).trim());
    }
    if (trimmed.toLowerCase().startsWith("sitemap:")) {
      sitemapUrls.push(trimmed.slice(8).trim());
    }
  }

  const blocksAll = disallows.some((d) => d === "/" || d === "/*");
  return {
    url: robotsUrl,
    content,
    allowsAll: !blocksAll,
    disallows,
    sitemapUrls,
  };
}

export async function checkSitemap(siteUrl: string): Promise<SitemapResult> {
  const origin = originOf(siteUrl);
  const sitemapUrl = `${origin}/sitemap.xml`;
  const errors: string[] = [];
  let xml: string;
  try {
    xml = await fetchText(sitemapUrl);
  } catch (err) {
    return {
      url: sitemapUrl,
      urlCount: 0,
      urls: [],
      errors: [err instanceof Error ? err.message : "Could not fetch sitemap"],
    };
  }

  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1]?.trim()).filter(Boolean) as string[];
  if (urls.length === 0) errors.push("No <loc> entries found in sitemap");

  return { url: sitemapUrl, urlCount: urls.length, urls: urls.slice(0, 50), errors };
}

export function scoreMetaTags(title: string | null, description: string | null) {
  const titleLen = title?.length ?? 0;
  const descLen = description?.length ?? 0;
  const issues: string[] = [];
  let score = 100;

  if (!title) {
    score -= 40;
    issues.push("Missing page title");
  } else if (titleLen < 30 || titleLen > 60) {
    score -= 15;
    issues.push(`Title length ${titleLen} (ideal 30–60)`);
  }

  if (!description) {
    score -= 40;
    issues.push("Missing meta description");
  } else if (descLen < 50 || descLen > 160) {
    score -= 15;
    issues.push(`Description length ${descLen} (ideal 50–160)`);
  }

  return { score: Math.max(0, score), issues, titleLen, descLen };
}
