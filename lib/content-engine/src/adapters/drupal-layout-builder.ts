import crypto from "crypto";
import { markdownToHtml } from "./markdown-html";
import type { DrupalLayoutSection } from "./types";

interface MarkdownSection {
  title?: string;
  markdown: string;
}

/** Split markdown into sections at each H2 heading. */
function splitMarkdownByH2(markdown: string): MarkdownSection[] {
  const parts = markdown.split(/^##\s+/m);
  if (parts.length <= 1) {
    const trimmed = markdown.trim();
    return trimmed ? [{ markdown: trimmed }] : [];
  }

  const sections: MarkdownSection[] = [];
  const intro = parts[0]?.trim();
  if (intro) {
    sections.push({ markdown: intro });
  }

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i] ?? "";
    const newlineIdx = part.indexOf("\n");
    const title = newlineIdx === -1 ? part.trim() : part.slice(0, newlineIdx).trim();
    const body = newlineIdx === -1 ? "" : part.slice(newlineIdx + 1).trim();
    const sectionMarkdown = body ? `## ${title}\n\n${body}` : `## ${title}`;
    sections.push({ title, markdown: sectionMarkdown });
  }

  return sections;
}

function textComponent(label: string, html: string): DrupalLayoutSection["components"][number] {
  return {
    type: "inline_block:text",
    uuid: crypto.randomUUID(),
    region: "content",
    configuration: {
      id: "inline_block:text",
      label,
      provider: "layout_builder",
      view_mode: "full",
      block_revision_id: null,
      block_serialized: null,
    },
    additional: {
      body: { value: html, format: "basic_html" },
    },
  };
}

/**
 * Convert markdown into Drupal Layout Builder sections — one layout_onecol per H2 block.
 */
export async function markdownToDrupalLayoutSections(markdown: string): Promise<DrupalLayoutSection[]> {
  const sections = splitMarkdownByH2(markdown);
  const layoutSections: DrupalLayoutSection[] = [];

  for (const section of sections) {
    const html = await markdownToHtml(section.markdown);
    layoutSections.push({
      layout_id: "layout_onecol",
      layout_settings: { label: "" },
      components: [textComponent(section.title ?? "Section", html)],
    });
  }

  return layoutSections;
}
