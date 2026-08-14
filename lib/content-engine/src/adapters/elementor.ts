import { parseMarkdownBlocks, type MarkdownBlock } from "./markdown-blocks";
import { escapeHtml, inlineToHtml } from "./markdown-inline";
import { markdownToHtml } from "./markdown-html";

type ElementorWidget = {
  id: string;
  elType: "widget";
  widgetType: string;
  settings: Record<string, unknown>;
};

/**
 * One Elementor ID per call. Real Elementor IDs are 7-char hex; any unique
 * string works since Elementor only requires uniqueness within the document,
 * not a particular shape. Two Math.random() draws give ~96 bits of entropy —
 * more than enough for however many blocks a single article produces.
 */
function widgetId(): string {
  return Math.random().toString(16).slice(2, 10) + Math.random().toString(16).slice(2, 10);
}

function listHtml(items: string[], ordered: boolean): string {
  const tag = ordered ? "ol" : "ul";
  const inner = items.map((item) => `<li>${inlineToHtml(item)}</li>`).join("");
  return `<${tag}>${inner}</${tag}>`;
}

/**
 * Serialize one markdown block into an Elementor widget.
 *
 * Core Elementor ships no native list or code widget, so both render as real
 * `<ul>/<ol>` or `<pre><code>` markup inside a text-editor widget — the same
 * approach a real Elementor site uses when HTML is pasted into that widget.
 * Headings and images use their actual native widget types, which is the
 * difference between something a founder can select and restyle per element
 * versus one undifferentiated blob.
 */
function blockToWidget(block: MarkdownBlock): ElementorWidget {
  const id = widgetId();

  switch (block.type) {
    case "heading":
      return {
        id,
        elType: "widget",
        widgetType: "heading",
        settings: { title: block.text, header_size: `h${block.level}` },
      };
    case "list":
      return {
        id,
        elType: "widget",
        widgetType: "text-editor",
        settings: { editor: listHtml(block.items, block.ordered) },
      };
    case "code":
      return {
        id,
        elType: "widget",
        widgetType: "text-editor",
        settings: { editor: `<pre><code>${escapeHtml(block.code)}</code></pre>` },
      };
    case "image":
      return {
        id,
        elType: "widget",
        widgetType: "image",
        settings: { image: { url: block.src, alt: block.alt } },
      };
    case "paragraph":
    default:
      return {
        id,
        elType: "widget",
        widgetType: "text-editor",
        settings: { editor: `<p>${inlineToHtml(block.text)}</p>` },
      };
  }
}

/**
 * Convert markdown into a real Elementor widget tree: one section, one
 * column, one widget per block — so a founder opening the post in Elementor
 * finds discrete, selectable, movable elements per heading/paragraph/list/
 * image, matching what Gutenberg mode already produces.
 *
 * `content` is a plaintext HTML fallback for the non-builder `post_content`
 * column; the structured tree that Elementor actually renders lives entirely
 * in `elementorData`, written to `_elementor_data` post meta.
 */
export async function markdownToElementorData(
  markdown: string,
  title: string,
): Promise<{ content: string; elementorData: string }> {
  const blocks = parseMarkdownBlocks(markdown);
  const widgets: ElementorWidget[] =
    blocks.length > 0
      ? blocks.map(blockToWidget)
      : [
          {
            id: widgetId(),
            elType: "widget",
            widgetType: "text-editor",
            settings: { editor: "<p></p>", title },
          },
        ];

  const elementorData = JSON.stringify([
    {
      id: widgetId(),
      elType: "section",
      settings: {},
      elements: [
        {
          id: widgetId(),
          elType: "column",
          settings: { _column_size: 100 },
          elements: widgets,
        },
      ],
    },
  ]);

  const content = await markdownToHtml(markdown);
  return { content, elementorData };
}
