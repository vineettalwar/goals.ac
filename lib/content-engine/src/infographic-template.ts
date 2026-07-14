import type { ContentFormatType } from "@workspace/db";

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
    .filter((h) => !/faq|summary|conclusion/i.test(h))
    .slice(0, max);
  return headings.map((h) => h);
}

function extractStatHook(body: string, keyword: string): string {
  const statMatch = body.match(/\d{1,3}(?:,\d{3})*(?:\.\d+)?%|\d{1,3}(?:,\d{3})+\+?/);
  if (statMatch) return `Key data point: ${statMatch[0]} — relevant to ${keyword}.`;
  return `Visual summary of ${keyword} — shareable on social and in sales decks.`;
}

/**
 * Injects a markdown "infographic" block (structured table + callout) into long-form SEO content.
 * Renders as a scannable visual section in CMS — no separate image asset required.
 */
export function injectInfographicMarkdownBlock(
  body: string,
  options: { title: string; keyword: string; brandName?: string },
): string {
  if (body.includes("<!-- goals-ac-infographic -->")) return body;

  const points = extractKeyPoints(body);
  if (points.length < 2) return body;

  const rows = points
    .slice(0, 4)
    .map((p, i) => {
      const [label, ...rest] = p.split(/[:—-]/);
      const detail = rest.join(":").trim() || p;
      return `| ${i + 1} | ${label?.trim() ?? `Point ${i + 1}`} | ${detail.slice(0, 120)} |`;
    })
    .join("\n");

  const hook = extractStatHook(body, options.keyword);
  const block = `
<!-- goals-ac-infographic -->

### At a glance: ${options.title.replace(/#+\s*/, "").slice(0, 60)}

| # | Topic | Insight |
| --- | --- | --- |
${rows}

> **${options.brandName ? `${options.brandName} · ` : ""}Visual summary:** ${hook}

<!-- /goals-ac-infographic -->
`;

  const firstH2 = body.search(/^## /m);
  if (firstH2 > 0) {
    return `${body.slice(0, firstH2)}${block}\n${body.slice(firstH2)}`;
  }

  const introEnd = body.indexOf("\n\n", body.indexOf("\n\n") + 1);
  if (introEnd > 0) {
    return `${body.slice(0, introEnd)}\n${block}${body.slice(introEnd)}`;
  }

  return `${body}\n${block}`;
}

export function shouldInjectInfographic(format: ContentFormatType): boolean {
  return format === "blog_post" || format === "guide" || format === "pillar_page" || format === "tutorial";
}
