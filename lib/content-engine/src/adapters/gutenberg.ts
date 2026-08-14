import { markdownToHtml } from "./markdown-html";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineToHtml(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/`([^`]+?)`/g, "<code>$1</code>");
}

/**
 * Serialize a Gutenberg block.
 *
 * WordPress runs `json_decode` over the attribute object in the block comment,
 * so it must be strict JSON: quoted keys, and numbers as numbers. Emitting
 * `{level:"2"}` parses as null and the editor flags the block as containing
 * unexpected content, which is what a founder opening the post would see.
 */
function block(
  type: string,
  innerHtml: string,
  attrs: Record<string, string | number | boolean> = {},
): string {
  const hasAttrs = Object.keys(attrs).length > 0;
  const open = hasAttrs
    ? `<!-- wp:${type} ${JSON.stringify(attrs)} -->`
    : `<!-- wp:${type} -->`;
  return `${open}\n${innerHtml}\n<!-- /wp:${type} -->`;
}

/**
 * Convert markdown to Gutenberg block comment markup for WordPress post_content.
 */
export function markdownToGutenbergBlocks(markdown: string): string {
  const lines = markdown.split("\n");
  const blocks: string[] = [];
  let inCode = false;
  let codeLines: string[] = [];
  let codeLang = "plain text";
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];

  const flushList = () => {
    if (!listType || listItems.length === 0) return;
    const tag = listType === "ul" ? "ul" : "ol";
    const inner = listItems.map((item) => `<li>${inlineToHtml(item)}</li>`).join("");
    // Without the ordered attribute Gutenberg treats an <ol> as a bullet list
    // in the editor, so numbering disappears the moment anyone edits the post.
    blocks.push(
      block("list", `<${tag}>${inner}</${tag}>`, listType === "ol" ? { ordered: true } : {}),
    );
    listType = null;
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith("```")) {
      flushList();
      if (inCode) {
        blocks.push(
          block(
            "code",
            `<pre class="wp-block-code"><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`,
            { language: codeLang },
          ),
        );
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
      const tag = `h${Math.min(level, 6)}`;
      blocks.push(block("heading", `<${tag}>${inlineToHtml(text)}</${tag}>`, { level }));
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

    if (/^!\[([^\]]*)\]\(([^)]+)\)/.test(line)) {
      flushList();
      const imgMatch = /^!\[([^\]]*)\]\(([^)]+)\)/.exec(line);
      if (imgMatch) {
        blocks.push(
          block(
            "image",
            `<figure class="wp-block-image"><img src="${escapeHtml(imgMatch[2])}" alt="${escapeHtml(imgMatch[1])}"/></figure>`,
          ),
        );
      }
      continue;
    }

    flushList();
    blocks.push(block("paragraph", `<p>${inlineToHtml(line)}</p>`));
  }

  flushList();

  if (blocks.length === 0) {
    return block("paragraph", "<p></p>");
  }

  return blocks.join("\n\n");
}

/** Fallback: wrap classic HTML as a freeform block when Gutenberg conversion fails. */
export async function markdownToGutenbergFallback(markdown: string): Promise<string> {
  const html = await markdownToHtml(markdown);
  return block("html", html);
}
