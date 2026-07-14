import type { Typo3ContentElement } from "./types";

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

function headerElement(text: string, layout: number, sorting: number): Typo3ContentElement {
  return {
    ctype: "header",
    fields: {
      header: text,
      header_layout: layout,
    },
    sorting,
  };
}

function textElement(bodytext: string, sorting: number): Typo3ContentElement {
  return {
    ctype: "text",
    fields: { bodytext },
    sorting,
  };
}

function textmediaElement(url: string, alt: string, sorting: number): Typo3ContentElement {
  return {
    ctype: "textmedia",
    fields: {
      image: url,
      imagealt: alt,
      bodytext: "",
    },
    sorting,
  };
}

/**
 * Convert markdown into TYPO3 content elements (header, text, textmedia).
 */
export function markdownToTypo3ContentElements(markdown: string): Typo3ContentElement[] {
  const lines = markdown.split("\n");
  const elements: Typo3ContentElement[] = [];
  let sorting = 256;
  let inCode = false;
  let codeLines: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];

  const push = (element: Typo3ContentElement) => {
    elements.push(element);
    sorting += 256;
  };

  const flushList = () => {
    if (!listType || listItems.length === 0) return;
    const tag = listType === "ul" ? "ul" : "ol";
    const inner = listItems.map((item) => `<li>${inlineToHtml(item)}</li>`).join("");
    push(textElement(`<${tag}>${inner}</${tag}>`, sorting));
    listType = null;
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith("```")) {
      flushList();
      if (inCode) {
        push(
          textElement(
            `<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`,
            sorting,
          ),
        );
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

    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      if (level === 2 || level === 3) {
        push(headerElement(text, level, sorting));
      } else {
        const tag = `h${Math.min(level, 6)}`;
        push(textElement(`<${tag}>${inlineToHtml(text)}</${tag}>`, sorting));
      }
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

    const imageMatch = /^!\[([^\]]*)\]\(([^)]+)\)/.exec(line);
    if (imageMatch) {
      flushList();
      push(textmediaElement(imageMatch[2].trim(), imageMatch[1].trim(), sorting));
      continue;
    }

    flushList();
    push(textElement(`<p>${inlineToHtml(line)}</p>`, sorting));
  }

  flushList();

  if (elements.length === 0) {
    return [textElement("<p></p>", 256)];
  }

  return elements;
}
