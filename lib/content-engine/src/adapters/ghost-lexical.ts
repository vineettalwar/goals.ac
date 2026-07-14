/** Ghost 5 Lexical JSON — native Admin API editor state. */

const FORMAT_BOLD = 1;
const FORMAT_ITALIC = 2;
const FORMAT_CODE = 16;

type LexicalDirection = "ltr" | null;

interface LexicalTextNode {
  detail: 0;
  format: number;
  mode: "normal";
  style: "";
  text: string;
  type: "extended-text";
  version: 1;
}

interface LexicalLinkNode {
  type: "link";
  url: string;
  rel: null;
  target: null;
  title: null;
  children: LexicalTextNode[];
  direction: LexicalDirection;
  format: "";
  indent: 0;
  version: 1;
}

type LexicalInlineNode = LexicalTextNode | LexicalLinkNode;

interface LexicalElementNode {
  children: LexicalInlineNode[] | LexicalBlockNode[];
  direction: LexicalDirection;
  format: "";
  indent: 0;
  type: string;
  version: 1;
  tag?: string;
  listType?: "bullet" | "number";
  start?: number;
}

type LexicalBlockNode = LexicalElementNode | { type: "horizontalrule"; version: 1 };

export interface GhostLexicalDocument {
  root: LexicalElementNode & { type: "root" };
}

function textNode(text: string, format = 0): LexicalTextNode {
  return {
    detail: 0,
    format,
    mode: "normal",
    style: "",
    text,
    type: "extended-text",
    version: 1,
  };
}

function elementNode(
  type: string,
  children: LexicalInlineNode[] | LexicalBlockNode[],
  extra: Record<string, unknown> = {},
): LexicalElementNode {
  return {
    children,
    direction: children.length > 0 ? "ltr" : null,
    format: "",
    indent: 0,
    type,
    version: 1,
    ...extra,
  } as LexicalElementNode;
}

function paragraphFromText(text: string): LexicalElementNode {
  const inline = parseInline(text);
  return elementNode("paragraph", inline.length > 0 ? inline : [textNode("")]);
}

function headingNode(level: number, text: string): LexicalElementNode {
  const tag = level <= 1 ? "h2" : "h3";
  return elementNode("extended-heading", parseInline(text), { tag });
}

function quoteNode(text: string): LexicalElementNode {
  return elementNode("extended-quote", parseInline(text));
}

function horizontalRuleNode(): { type: "horizontalrule"; version: 1 } {
  return { type: "horizontalrule", version: 1 };
}

function imageNode(src: string, alt: string): LexicalBlockNode {
  return {
    type: "image",
    version: 1,
    src,
    altText: alt,
    title: alt,
    caption: "",
    width: null,
    height: null,
    showCaption: false,
    cardWidth: "full",
  } as LexicalBlockNode;
}

function listNode(listType: "bullet" | "number", items: string[]): LexicalElementNode {
  const listItems = items.map((item, index) =>
    elementNode("listitem", parseInline(item), listType === "number" ? { value: index + 1 } : {}),
  );
  return elementNode("list", listItems, {
    listType,
    start: 1,
    tag: listType === "bullet" ? "ul" : "ol",
  });
}

function parseInline(input: string): LexicalInlineNode[] {
  const nodes: LexicalInlineNode[] = [];
  const pattern =
    /(\[([^\]]+)\]\(([^)]+)\)|\*\*(.+?)\*\*|__(.+?)__|\*(.+?)\*|_(.+?)_|`([^`]+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(input)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(textNode(input.slice(lastIndex, match.index)));
    }

    if (match[2] && match[3]) {
      nodes.push({
        type: "link",
        url: match[3],
        rel: null,
        target: null,
        title: null,
        children: [textNode(match[2])],
        direction: "ltr",
        format: "",
        indent: 0,
        version: 1,
      });
    } else if (match[4] || match[5]) {
      nodes.push(textNode(match[4] ?? match[5]!, FORMAT_BOLD));
    } else if (match[6] || match[7]) {
      nodes.push(textNode(match[6] ?? match[7]!, FORMAT_ITALIC));
    } else if (match[8]) {
      nodes.push(textNode(match[8], FORMAT_CODE));
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < input.length) {
    nodes.push(textNode(input.slice(lastIndex)));
  }

  return nodes.length > 0 ? nodes : [textNode("")];
}

/**
 * Convert markdown to a Ghost 5 Lexical document tree for the Admin API `lexical` field.
 */
export function markdownToGhostLexical(markdown: string): GhostLexicalDocument {
  const lines = markdown.split("\n");
  const children: LexicalBlockNode[] = [];
  let listType: "bullet" | "number" | null = null;
  let listItems: string[] = [];
  let inCode = false;
  let codeLines: string[] = [];

  const flushList = () => {
    if (!listType || listItems.length === 0) return;
    children.push(listNode(listType, listItems));
    listType = null;
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith("```")) {
      flushList();
      if (inCode) {
        children.push(paragraphFromText(codeLines.join("\n")));
        codeLines = [];
        inCode = false;
      } else {
        inCode = true;
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
      children.push(headingNode(level, text));
      continue;
    }

    if (/^>\s?/.test(line)) {
      flushList();
      children.push(quoteNode(line.replace(/^>\s?/, "")));
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      if (listType && listType !== "bullet") flushList();
      listType = "bullet";
      listItems.push(line.replace(/^[-*]\s+/, ""));
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      if (listType && listType !== "number") flushList();
      listType = "number";
      listItems.push(line.replace(/^\d+\.\s+/, ""));
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushList();
      children.push(horizontalRuleNode());
      continue;
    }

    if (/^!\[([^\]]*)\]\(([^)]+)\)/.test(line.trim())) {
      flushList();
      const imageMatch = /^!\[([^\]]*)\]\(([^)]+)\)/.exec(line.trim());
      if (imageMatch) {
        children.push(imageNode(imageMatch[2].trim(), imageMatch[1].trim()));
      }
      continue;
    }

    flushList();
    children.push(paragraphFromText(line));
  }

  flushList();

  if (children.length === 0) {
    children.push(elementNode("paragraph", []));
  }

  return {
    root: elementNode("root", children, {}) as GhostLexicalDocument["root"],
  };
}

/** Stringify Lexical document for Ghost Admin API POST body. */
export function markdownToGhostLexicalJson(markdown: string): string {
  return JSON.stringify(markdownToGhostLexical(markdown));
}
