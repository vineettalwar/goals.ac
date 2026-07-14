import { marked } from "marked";

/** Convert markdown to semantic HTML with basic polish for CMS destinations. */
export async function markdownToHtml(markdown: string): Promise<string> {
  const html = await marked(markdown);
  return html
    .replace(/<img /g, '<img loading="lazy" ')
    .replace(/<h1>/g, "<h2>")
    .replace(/<\/h1>/g, "</h2>");
}
