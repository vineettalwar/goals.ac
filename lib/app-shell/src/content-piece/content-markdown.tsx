import type { ReactNode } from "react";
import { cn } from "../cn";

type ContentMarkdownProps = {
  children: string;
  className?: string;
};

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      nodes.push(
        <code key={key++} className="rounded bg-secondary px-1 py-0.5 text-[0.9em]">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("*")) {
      nodes.push(<em key={key++}>{token.slice(1, -1)}</em>);
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        nodes.push(
          <a
            key={key++}
            href={linkMatch[2]}
            className="font-medium text-primary hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            {linkMatch[1]}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function stripBlockquotePrefix(line: string): string {
  return line.replace(/^>\s?/, "");
}

function isTableRow(line: string): boolean {
  const t = line.trim();
  return t.startsWith("|") && t.includes("|", 1);
}

function isTableSeparator(line: string): boolean {
  const t = line.trim();
  if (!t.includes("|") || !t.includes("-")) return false;
  return /^[\s|:-]+$/.test(t);
}

function splitTableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

export function ContentMarkdown({ children, className }: ContentMarkdownProps) {
  // Strip HTML comment markers (infographic fences) before parse — never show raw `<!-- … -->`.
  const source = children.replace(/<!--[\s\S]*?-->/g, "").replace(/\r\n/g, "\n");
  const lines = source.split("\n");
  const blocks: ReactNode[] = [];
  let listItems: ReactNode[] = [];
  let key = 0;

  function flushList() {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={key++} className="my-3 list-disc space-y-1 pl-5">
        {listItems}
      </ul>,
    );
    listItems = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim();
    if (!trimmed) {
      flushList();
      continue;
    }

    // Skip leftover HTML comment fragments (also stripped up-front)
    if (trimmed.startsWith("<!--") || trimmed.endsWith("-->")) {
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushList();
      blocks.push(
        <h3 key={key++} className="mb-2 mt-6 text-base font-semibold tracking-tight">
          {renderInline(trimmed.slice(4))}
        </h3>,
      );
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushList();
      blocks.push(
        <h2 key={key++} className="mb-3 mt-8 text-lg font-semibold tracking-tight">
          {renderInline(trimmed.slice(3))}
        </h2>,
      );
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushList();
      blocks.push(
        <h1 key={key++} className="mb-4 text-xl font-bold tracking-tight">
          {renderInline(trimmed.slice(2))}
        </h1>,
      );
      continue;
    }

    if (isTableRow(trimmed) && i + 1 < lines.length && isTableSeparator(lines[i + 1]!)) {
      flushList();
      const headerCells = splitTableCells(trimmed);
      i += 2; // skip header + separator
      const bodyRows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i]!)) {
        bodyRows.push(splitTableCells(lines[i]!));
        i += 1;
      }
      i -= 1;
      blocks.push(
        <div key={key++} className="my-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                {headerCells.map((cell, ci) => (
                  <th key={ci} className="px-3 py-2 font-semibold text-foreground">
                    {renderInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri} className="border-b border-border/60">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-foreground/90">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (trimmed.startsWith(">")) {
      flushList();
      const quoteInner: string[] = [];
      while (i < lines.length) {
        const q = lines[i]!.trim();
        if (!q.startsWith(">") && q !== "") break;
        if (q.startsWith(">")) {
          quoteInner.push(stripBlockquotePrefix(q));
        } else {
          // blank quote continuation — preserve as separator
          quoteInner.push("");
        }
        i += 1;
      }
      i -= 1;

      const quoteChildren: ReactNode[] = [];
      let quoteList: ReactNode[] = [];
      const flushQuoteList = () => {
        if (quoteList.length === 0) return;
        quoteChildren.push(
          <ul key={key++} className="my-2 list-disc space-y-1 pl-5">
            {quoteList}
          </ul>,
        );
        quoteList = [];
      };

      for (const qLine of quoteInner) {
        if (!qLine) {
          flushQuoteList();
          continue;
        }
        if (/^[-*]\s+/.test(qLine)) {
          quoteList.push(
            <li key={key++} className="leading-relaxed">
              {renderInline(qLine.replace(/^[-*]\s+/, ""))}
            </li>,
          );
          continue;
        }
        flushQuoteList();
        quoteChildren.push(
          <p key={key++} className="my-1 leading-relaxed">
            {renderInline(qLine)}
          </p>,
        );
      }
      flushQuoteList();

      blocks.push(
        <blockquote
          key={key++}
          className="my-4 rounded-r-lg border-l-2 border-primary bg-secondary/50 px-4 py-3 not-italic text-foreground/90"
        >
          {quoteChildren}
        </blockquote>,
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      listItems.push(
        <li key={key++} className="leading-relaxed text-foreground/90">
          {renderInline(trimmed.replace(/^[-*]\s+/, ""))}
        </li>,
      );
      continue;
    }

    // Allow data: URIs (SVG may encode chars); take everything between first ( and last ).
    const imageMatch = trimmed.match(/^!\[([^\]]*)\]\((.+)\)$/);
    if (imageMatch) {
      flushList();
      const alt = imageMatch[1] ?? "";
      const src = imageMatch[2] ?? "";
      const safeSrc =
        src.startsWith("data:image/") ||
        src.startsWith("https://") ||
        src.startsWith("http://")
          ? src
          : null;
      if (safeSrc) {
        blocks.push(
          <img
            key={key++}
            src={safeSrc}
            alt={alt}
            className="my-4 w-full max-w-full rounded-lg border border-border/60 bg-[#FAFAF8]"
          />,
        );
        continue;
      }
    }

    flushList();
    blocks.push(
      <p key={key++} className="my-3 break-words leading-relaxed text-foreground/90">
        {renderInline(trimmed)}
      </p>,
    );
  }

  flushList();

  return (
    <article className={cn("max-w-none overflow-x-hidden text-sm", className)}>
      {blocks.length > 0 ? blocks : <p className="text-muted-foreground">Empty preview.</p>}
    </article>
  );
}
