import { parse } from "node-html-parser";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import { extractLocs } from "../sitemap-crawl";
import { fetchPublicText } from "../safe-fetch";
import { originOf } from "./origin";
import { discoverSitemapCandidates } from "./sitemap";

export type LlmsTxtPage = { url: string; title: string };

export type LlmsTxtCheck = {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
};

export type LlmsTxtResult = {
  url: string;
  content: string;
  pageCount: number;
  title: string;
  description: string;
  existingFound: boolean;
  existingUrl: string;
  existingContent: string | null;
  pageSource: "sitemap" | "homepage-links";
  checks: LlmsTxtCheck[];
};

const SKIP_PATH =
  /\/(wp-admin|wp-login|cart|checkout|account|login|signup|cdn-cgi|feed|xmlrpc)(\/|$)/i;
const SKIP_EXT = /\.(css|js|png|jpe?g|gif|svg|webp|ico|pdf|zip|woff2?|map)(\?|$)/i;
const LOW_VALUE_PATH =
  /\/(legal|privacy|terms|cookies?|policy|policies|ssa|gdpr|dpa|tos|eula|careers|jobs|complaints|code-of-conduct|anti-modern-slavery|covid|bfcm|contact)(\/|$)/i;
const HIGH_VALUE_PATH =
  /\/(pricing|product|products|features|docs|documentation|blog|about|company|solutions|platform|customers|integrations|api|guides?|billing|connect|atlas|capital|climate|apps)(\/|$)/i;
const MAX_LLMS_PAGES = 16;
const MAX_HUB_PAGES = 12;
const MAX_DEEP_PAGES = 4;

/** Turn a path segment into a readable label for markdown links. */
export function titleFromUrlPath(pageUrl: string): string {
  try {
    const path = new URL(pageUrl).pathname.replace(/\/+$/, "");
    if (!path || path === "/") return "Home";
    const last = path.split("/").filter(Boolean).pop() ?? "Page";
    return decodeURIComponent(last)
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return "Page";
  }
}

function isUsefulPageUrl(href: string, origin: string): boolean {
  try {
    const u = new URL(href, origin);
    if (u.origin !== origin) return false;
    if (u.hash && u.pathname === "/") return false;
    if (SKIP_EXT.test(u.pathname) || SKIP_PATH.test(u.pathname)) return false;
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return true;
  } catch {
    return false;
  }
}

/** Lower is better — shallow + product paths first, legal/policy last. */
export function pagePriority(pageUrl: string): number {
  try {
    const path = new URL(pageUrl).pathname.replace(/\/+$/, "") || "/";
    if (path === "/") return -20;
    const depth = path.split("/").filter(Boolean).length;
    let score = depth;
    // Boost top-level product/docs hubs, not every nested blog post
    if (depth <= 2 && HIGH_VALUE_PATH.test(path)) score -= 10;
    if (LOW_VALUE_PATH.test(path)) score += 20;
    return score;
  } catch {
    return 100;
  }
}

function pickPriorityPages(urls: string[]): LlmsTxtPage[] {
  return rankPages(
    [...urls]
      .filter((u, i, arr) => arr.indexOf(u) === i)
      .map((u) => ({ url: u, title: titleFromUrlPath(u) })),
  );
}

/** Top-level hubs + a few product subpaths — not every blog/guide URL. */
function isHubUrl(pageUrl: string): boolean {
  try {
    const path = new URL(pageUrl).pathname.replace(/\/+$/, "") || "/";
    const parts = path.split("/").filter(Boolean);
    if (parts.length === 0) return true;
    if (parts.length === 1) return !LOW_VALUE_PATH.test(`/${parts[0]}`);
    if (parts.length === 2) {
      const [section, leaf] = parts;
      // /blog/post, /guides/slug, /customers/name are content leaves — not hubs
      if (/^(blog|customers|guides|docs|documentation|news|resources)$/i.test(section!)) {
        return false;
      }
      return (
        HIGH_VALUE_PATH.test(`/${section}`) &&
        /^(pricing|features|overview|docs|api)$/i.test(leaf!)
      );
    }
    return false;
  } catch {
    return false;
  }
}

function rankPages(pages: LlmsTxtPage[]): LlmsTxtPage[] {
  const ranked = [...pages]
    .filter((p, i, arr) => arr.findIndex((x) => x.url === p.url) === i)
    .sort((a, b) => pagePriority(a.url) - pagePriority(b.url) || a.url.localeCompare(b.url));

  const hubs = ranked.filter((p) => isHubUrl(p.url)).slice(0, MAX_HUB_PAGES);
  const deepBudget = Math.min(MAX_DEEP_PAGES, Math.max(0, MAX_LLMS_PAGES - hubs.length));
  const deep = ranked.filter((p) => !isHubUrl(p.url)).slice(0, deepBudget);
  return [...hubs, ...deep];
}

/** Pure builder — exported for tests. */
export function buildLlmsTxtContent(input: {
  title: string;
  description: string;
  pages: LlmsTxtPage[];
  origin: string;
}): string {
  const pages = input.pages.slice(0, MAX_LLMS_PAGES);
  const lines = [
    `# ${input.title}`,
    "",
    input.description ? `> ${input.description}` : null,
    input.description ? "" : null,
    "## Pages",
    ...pages.map((p) => `- [${p.title}](${p.url})`),
    "",
    "## Optional",
    `- [Sitemap](${input.origin}/sitemap.xml)`,
    `- [Contact](${input.origin}/contact)`,
  ].filter((line): line is string => line !== null);

  return lines.join("\n");
}

export function scoreLlmsTxtDraft(input: {
  title: string;
  description: string;
  pageCount: number;
  existingFound: boolean;
  pageSource: "sitemap" | "homepage-links";
}): LlmsTxtCheck[] {
  return [
    {
      id: "title",
      label: "Site title",
      ok: input.title.trim().length > 0,
      detail: input.title.trim() || "Missing",
    },
    {
      id: "description",
      label: "Site summary",
      ok: input.description.trim().length >= 40,
      detail: input.description.trim()
        ? `${input.description.trim().length} characters`
        : "Add a one-sentence summary of what the site does",
    },
    {
      id: "pages",
      label: "Priority pages",
      ok: input.pageCount >= 3,
      detail:
        input.pageCount === 0
          ? "No crawlable pages found — add key URLs by hand"
          : `${input.pageCount} page${input.pageCount === 1 ? "" : "s"} from ${
              input.pageSource === "sitemap" ? "sitemap" : "homepage links"
            }`,
    },
    {
      id: "existing",
      label: "Existing /llms.txt",
      ok: input.existingFound,
      detail: input.existingFound
        ? "Found at site root — compare before overwriting"
        : "Not found — publish the template at your domain root",
    },
  ];
}

async function fetchExistingLlmsTxt(
  origin: string,
): Promise<{ found: boolean; content: string | null; url: string }> {
  const existingUrl = `${origin}/llms.txt`;
  try {
    const content = await fetchPublicText(existingUrl, {
      accept: "text/plain,*/*;q=0.8",
    });
    const trimmed = content.trim();
    if (!trimmed || trimmed.length < 8) {
      return { found: false, content: null, url: existingUrl };
    }
    // HTML error pages masquerading as text
    if (/^\s*<(!doctype|html|head|body)/i.test(trimmed)) {
      return { found: false, content: null, url: existingUrl };
    }
    return { found: true, content: trimmed, url: existingUrl };
  } catch {
    return { found: false, content: null, url: existingUrl };
  }
}

async function pagesFromSitemap(origin: string): Promise<LlmsTxtPage[]> {
  const candidates = await discoverSitemapCandidates(origin);
  for (const candidate of candidates.slice(0, 3)) {
    try {
      await assertPublicUrl(candidate);
      const xml = await fetchPublicText(candidate, {
        accept: "application/xml,text/xml,*/*;q=0.8",
      });
      let locs: string[] = [];
      if (/<sitemapindex[\s>]/i.test(xml)) {
        for (const child of extractLocs(xml).slice(0, 3)) {
          try {
            await assertPublicUrl(child);
            const childXml = await fetchPublicText(child, {
              accept: "application/xml,text/xml,*/*;q=0.8",
            });
            if (/<urlset[\s>]/i.test(childXml)) locs.push(...extractLocs(childXml));
          } catch {
            // skip child
          }
        }
      } else if (/<urlset[\s>]/i.test(xml)) {
        locs = extractLocs(xml);
      }
      const pages = pickPriorityPages(locs.filter((u) => isUsefulPageUrl(u, origin)));
      if (pages.length >= 3) return pages;
    } catch {
      // try next candidate
    }
  }
  return [];
}

function pagesFromHomepage(html: string, origin: string): LlmsTxtPage[] {
  const root = parse(html);
  const seen = new Set<string>();
  const pages: LlmsTxtPage[] = [];

  for (const a of root.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href") ?? "";
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      continue;
    }
    let absolute: string;
    try {
      absolute = new URL(href, origin).toString().replace(/#.*$/, "");
    } catch {
      continue;
    }
    if (!isUsefulPageUrl(absolute, origin)) continue;
    if (seen.has(absolute)) continue;
    seen.add(absolute);

    const label = a.text.replace(/\s+/g, " ").trim();
    pages.push({
      url: absolute,
      title: label && label.length <= 80 ? label : titleFromUrlPath(absolute),
    });
    if (pages.length >= 80) break;
  }
  return rankPages(pages);
}

export async function generateLlmsTxt(siteUrl: string): Promise<LlmsTxtResult> {
  const origin = originOf(siteUrl);
  const [html, existing] = await Promise.all([
    fetchPublicText(siteUrl),
    fetchExistingLlmsTxt(origin),
  ]);
  const root = parse(html);
  const title =
    root.querySelector("title")?.text?.replace(/\s+/g, " ").trim() || new URL(siteUrl).hostname;
  const description =
    root.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ?? "";

  let pages = await pagesFromSitemap(origin);
  let pageSource: "sitemap" | "homepage-links" = "sitemap";
  if (pages.length < 3) {
    pages = pagesFromHomepage(html, origin);
    pageSource = "homepage-links";
  }

  // Always include the audited URL first when missing
  if (!pages.some((p) => p.url.replace(/\/$/, "") === siteUrl.replace(/\/$/, ""))) {
    pages = [{ url: siteUrl, title: titleFromUrlPath(siteUrl) || "Home" }, ...pages].slice(
      0,
      MAX_LLMS_PAGES,
    );
  }

  const content = buildLlmsTxtContent({ title, description, pages, origin });
  const checks = scoreLlmsTxtDraft({
    title,
    description,
    pageCount: pages.length,
    existingFound: existing.found,
    pageSource,
  });

  return {
    url: siteUrl,
    content,
    pageCount: pages.length,
    title,
    description,
    existingFound: existing.found,
    existingUrl: existing.url,
    existingContent: existing.content,
    pageSource,
    checks,
  };
}
