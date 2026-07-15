import type { ReactNode } from "react";
import { cn } from "../cn";

type ContentMarkdownProps = {
  children: string;
  className?: string;
};

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
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

export function ContentMarkdown({ children, className }: ContentMarkdownProps) {
  const lines = children.replace(/\r\n/g, "\n").split("\n");
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

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
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

    if (/^[-*]\s+/.test(trimmed)) {
      listItems.push(
        <li key={key++} className="leading-relaxed text-foreground/90">
          {renderInline(trimmed.replace(/^[-*]\s+/, ""))}
        </li>,
      );
      continue;
    }

    flushList();
    blocks.push(
      <p key={key++} className="my-3 leading-relaxed text-foreground/90">
        {renderInline(trimmed)}
      </p>,
    );
  }

  flushList();

  return (
    <article className={cn("max-w-none text-sm", className)}>
      {blocks.length > 0 ? blocks : <p className="text-muted-foreground">Empty preview.</p>}
    </article>
  );
}
