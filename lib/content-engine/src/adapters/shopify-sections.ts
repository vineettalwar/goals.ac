import { markdownToHtml } from "./markdown-html";
import type { ShopifySectionBlock } from "./types";

const IMAGE_RE = /^!\[([^\]]*)\]\(([^)]+)\)$/;
const HEADING_RE = /^(#{2,3})\s+(.+)$/;

/**
 * Convert markdown into theme-agnostic Shopify section blocks.
 * Maps headings and paragraphs to `rich-text`, standalone images to `image-with-text`.
 */
export async function markdownToShopifySections(markdown: string): Promise<ShopifySectionBlock[]> {
  const sections: ShopifySectionBlock[] = [];
  const lines = markdown.split("\n");
  let paragraphLines: string[] = [];
  let currentHeading: string | undefined;

  const flushRichText = async () => {
    const text = paragraphLines.join("\n").trim();
    paragraphLines = [];
    if (!text && !currentHeading) return;
    const html = text ? await markdownToHtml(text) : "";
    sections.push({
      type: "rich-text",
      settings: {
        ...(currentHeading ? { heading: currentHeading } : {}),
        text: html || "<p></p>",
      },
    });
    currentHeading = undefined;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      await flushRichText();
      continue;
    }

    const headingMatch = trimmed.match(HEADING_RE);
    if (headingMatch) {
      await flushRichText();
      currentHeading = headingMatch[2].trim();
      continue;
    }

    const imageMatch = trimmed.match(IMAGE_RE);
    if (imageMatch) {
      await flushRichText();
      const alt = imageMatch[1].trim();
      const url = imageMatch[2].trim();
      sections.push({
        type: "image-with-text",
        settings: {
          image: url,
          ...(alt ? { heading: alt } : {}),
        },
      });
      continue;
    }

    paragraphLines.push(line);
  }

  await flushRichText();

  if (sections.length === 0) {
    const html = await markdownToHtml(markdown);
    sections.push({
      type: "rich-text",
      settings: { text: html },
    });
  }

  return sections;
}

export function shopifyHandleFromTitle(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 255) || "page"
  );
}

/** OS 2.0 page template shape from a flat sections array. */
export function sectionsToPageTemplate(sections: ShopifySectionBlock[]): {
  sections: Record<string, { type: string; settings: Record<string, unknown> }>;
  order: string[];
} {
  const templateSections: Record<string, { type: string; settings: Record<string, unknown> }> = {};
  const order: string[] = [];
  sections.forEach((section, index) => {
    const id = `goals_ac_section_${index}`;
    templateSections[id] = { type: section.type, settings: section.settings };
    order.push(id);
  });
  return { sections: templateSections, order };
}
