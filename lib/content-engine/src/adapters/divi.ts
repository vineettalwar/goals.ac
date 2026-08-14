import { parseMarkdownBlocks, type MarkdownBlock } from "./markdown-blocks";
import { escapeHtml, inlineToHtml } from "./markdown-inline";

/**
 * Escape text going into a Divi/WordPress shortcode attribute.
 *
 * WordPress's shortcode parser splits an attribute's value on the next `"`,
 * so a heading or alt text containing one (`The "Best" Plugins`) would
 * truncate the shortcode there and leave the rest as stray text on the page.
 * Entity-encoding the quote (and the ampersand, so entities themselves don't
 * get double-encoded) keeps the attribute a single well-formed string.
 */
function escapeShortcodeAttr(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function listHtml(items: string[], ordered: boolean): string {
  const tag = ordered ? "ol" : "ul";
  const inner = items.map((item) => `<li>${inlineToHtml(item)}</li>`).join("");
  return `<${tag}>${inner}</${tag}>`;
}

/**
 * Serialize one markdown block into a Divi shortcode module.
 *
 * Headings and images use Divi's dedicated native modules
 * (`et_pb_heading`, `et_pb_image`); everything else renders as real HTML
 * inside `et_pb_text`, since core Divi has no separate list or code module.
 */
function blockToModule(block: MarkdownBlock): string {
  switch (block.type) {
    case "heading":
      return `[et_pb_heading title="${escapeShortcodeAttr(block.text)}" /]`;
    case "list":
      return `[et_pb_text]${listHtml(block.items, block.ordered)}[/et_pb_text]`;
    case "code":
      return `[et_pb_text]<pre><code>${escapeHtml(block.code)}</code></pre>[/et_pb_text]`;
    case "image":
      return `[et_pb_image src="${escapeShortcodeAttr(block.src)}" alt="${escapeShortcodeAttr(block.alt)}" /]`;
    case "paragraph":
    default:
      return `[et_pb_text]<p>${inlineToHtml(block.text)}</p>[/et_pb_text]`;
  }
}

/**
 * Convert markdown into real Divi shortcode modules: one section/row/column
 * wrapper containing one native module per block, instead of the entire
 * article dropped into a single `et_pb_text`. A founder opening the post in
 * Divi's builder gets discrete, selectable modules per heading/paragraph/
 * list/image.
 */
export async function markdownToDiviShortcodes(markdown: string): Promise<string> {
  const blocks = parseMarkdownBlocks(markdown);
  const modules = blocks.length > 0 ? blocks.map(blockToModule).join("") : "[et_pb_text][/et_pb_text]";

  return `[et_pb_section][et_pb_row][et_pb_column type="4_4"]${modules}[/et_pb_column][/et_pb_row][/et_pb_section]`;
}
