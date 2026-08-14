/**
 * Shared markdown block recognizer for Elementor and Divi.
 *
 * Recognition mirrors gutenberg.ts's walker (same heading/list/code-fence/
 * image patterns) so behavior is consistent across every WordPress builder,
 * but this is a fresh, standalone implementation rather than an extraction —
 * gutenberg.ts already ships with its own test coverage from a recent fix and
 * has no reason to be touched again here. Unifying it onto this parser later
 * is a reasonable cleanup, not required for Elementor/Divi to be structured.
 *
 * This module only recognizes structure. It returns plain text per block —
 * no HTML escaping, no inline bold/italic conversion — because each platform
 * serializes that block into different native markup (a widget, a shortcode
 * module, a block comment) and escaping is a serialization concern, not a
 * parsing one.
 */

export type MarkdownBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "code"; lang: string; code: string }
  | { type: "image"; src: string; alt: string };

const IMAGE_RE = /^!\[([^\]]*)\]\(([^)]+)\)/;

export function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.split("\n");
  const blocks: MarkdownBlock[] = [];

  let inCode = false;
  let codeLines: string[] = [];
  let codeLang = "plain text";
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];

  const flushList = () => {
    if (!listType || listItems.length === 0) return;
    blocks.push({ type: "list", ordered: listType === "ol", items: listItems });
    listType = null;
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith("```")) {
      flushList();
      if (inCode) {
        blocks.push({ type: "code", lang: codeLang, code: codeLines.join("\n") });
        codeLines = [];
        inCode = false;
      } else {
        inCode = true;
        codeLang = line.slice(3).trim() || "plain text";
      }
      continue;
    }

    if (inCode) {
      codeLines.push(rawLine);
      continue;
    }

    if (!line.trim()) {
      flushList();
      continue;
    }

    if (/^#{1,6}\s/.test(line)) {
      flushList();
      const level = /^#+/.exec(line)![0].length;
      const text = line.replace(/^#+\s+/, "");
      blocks.push({ type: "heading", level: Math.min(level, 6), text });
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      if (listType && listType !== "ul") flushList();
      listType = "ul";
      listItems.push(line.replace(/^[-*]\s+/, ""));
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      if (listType && listType !== "ol") flushList();
      listType = "ol";
      listItems.push(line.replace(/^\d+\.\s+/, ""));
      continue;
    }

    if (IMAGE_RE.test(line)) {
      flushList();
      const imgMatch = IMAGE_RE.exec(line);
      if (imgMatch) {
        blocks.push({ type: "image", src: imgMatch[2]!, alt: imgMatch[1]! });
      }
      continue;
    }

    flushList();
    blocks.push({ type: "paragraph", text: line });
  }

  flushList();
  return blocks;
}
