import { marked } from "marked";
import {
  shiftHtmlHeadingsTowardH2,
  shiftMarkdownHeadingsTowardH2,
} from "../content/heading-outline";

/** Convert markdown to semantic HTML with basic polish for CMS destinations. */
export async function markdownToHtml(markdown: string): Promise<string> {
  const html = await marked(shiftMarkdownHeadingsTowardH2(markdown));
  return shiftHtmlHeadingsTowardH2(
    html
      .replace(/<img /g, '<img loading="lazy" ')
      .replace(/<h1>/g, "<h2>")
      .replace(/<\/h1>/g, "</h2>"),
  );
}
