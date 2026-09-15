/** CMS title is H1. Body outline should start at H2. */
export const BODY_HEADING_OUTLINE_PROMPT =
  "- The title is the H1. Body section headings start at ## (H2). Do not open the body with ###.";

/**
 * CMS title is H1. Body outline should start at H2.
 * ponytail: line-start ATX only, same as publish-readiness. No fence parse.
 */
export function shiftMarkdownHeadingsTowardH2(body: string): string {
  const opens = body.match(/^#{1,6}(?=\s)/gm);
  if (!opens) return body;
  const min = Math.min(...opens.map((h) => h.length));
  if (min <= 2) return body;
  const shift = min - 2;
  return body.replace(/^#{1,6}(?=\s)/gm, (h) => "#".repeat(h.length - shift));
}

export function shiftHtmlHeadingsTowardH2(html: string): string {
  const found = [...html.matchAll(/<h([1-6])\b/gi)].map((m) => Number(m[1]));
  if (found.length === 0) return html;
  const min = Math.min(...found);
  if (min <= 2) return html;
  const shift = min - 2;
  return html.replace(/<\/?h([1-6])\b/gi, (tag, n) =>
    tag.replace(String(n), String(Number(n) - shift)),
  );
}
