"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  AlertCircle,
  BookOpen,
  Lightbulb,
  ListOrdered,
  Send,
  Settings,
} from "lucide-react";
import type { ReactNode } from "react";

type HelpBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "ordered-list"; items: string[] }
  | { type: "unordered-list"; items: string[] }
  | { type: "code"; text: string };

function parseHelpBody(body: string): HelpBlock[] {
  const blocks: HelpBlock[] = [];

  for (const block of body.split("\n\n")) {
    if (!block.trim()) continue;

    if (block.startsWith("```")) {
      blocks.push({
        type: "code",
        text: block.replace(/^```\n?/, "").replace(/\n?```$/, ""),
      });
      continue;
    }

    const lines = block.split("\n");
    const trimmedFirst = lines[0]?.trim() ?? "";

    if (lines.length === 1 && /^\*\*[^*]+\*\*$/.test(trimmedFirst)) {
      blocks.push({ type: "heading", text: trimmedFirst.slice(2, -2) });
      continue;
    }

    if (lines.length > 0 && lines.every((line) => /^\d+\.\s/.test(line.trim()))) {
      blocks.push({
        type: "ordered-list",
        items: lines.map((line) => line.replace(/^\d+\.\s*/, "")),
      });
      continue;
    }

    if (lines.length > 0 && lines.every((line) => /^-\s/.test(line.trim()))) {
      blocks.push({
        type: "unordered-list",
        items: lines.map((line) => line.replace(/^-\s*/, "")),
      });
      continue;
    }

    blocks.push({ type: "paragraph", text: block });
  }

  return blocks;
}

function renderBold(text: string, keyPrefix: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${keyPrefix}-b-${j}`} className="text-foreground font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={`${keyPrefix}-p-${j}`}>{part}</span>
    ),
  );
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let partIndex = 0;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(...renderBold(text.slice(lastIndex, match.index), `${keyPrefix}-t-${partIndex++}`));
    }
    const href = match[2]!;
    const isExternal = href.startsWith("http");
    parts.push(
      isExternal ? (
        <a
          key={`${keyPrefix}-l-${partIndex++}`}
          href={href}
          className="text-primary font-medium hover:underline underline-offset-2"
          target="_blank"
          rel="noopener noreferrer"
        >
          {match[1]}
        </a>
      ) : (
        <Link
          key={`${keyPrefix}-l-${partIndex++}`}
          href={href}
          className="text-primary font-medium hover:underline underline-offset-2"
        >
          {match[1]}
        </Link>
      ),
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(...renderBold(text.slice(lastIndex), `${keyPrefix}-t-${partIndex++}`));
  }

  return parts;
}

function sectionIcon(heading: string): LucideIcon {
  const h = heading.toLowerCase();
  if (h.includes("step") || h.includes("prerequisite")) return ListOrdered;
  if (h.includes("publish")) return Send;
  if (h.includes("note") || h.includes("limitation") || h.includes("self-hosted note")) return Lightbulb;
  if (h.includes("troubleshoot") || h.includes("error") || h.includes("fail")) return AlertCircle;
  if (h.includes("env") || h.includes("config") || h.includes("oauth")) return Settings;
  return BookOpen;
}

function isNotesSection(heading: string): boolean {
  const h = heading.toLowerCase();
  return h.includes("note") || h.includes("limitation") || h.includes("restriction");
}

function HelpSectionHeading({ text }: { text: string }) {
  const Icon = sectionIcon(text);
  const notes = isNotesSection(text);

  return (
    <div className={`flex items-center gap-3 ${notes ? "mb-4" : "mb-5 mt-2"}`}>
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          notes ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-primary/10 text-primary"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <h2 className="text-xl font-bold tracking-tight text-foreground">{text}</h2>
    </div>
  );
}

function OrderedSteps({ items }: { items: string[] }) {
  return (
    <ol className="space-y-3 mb-8">
      {items.map((item) => (
        <li
          key={item}
          className="flex gap-4 rounded-xl border border-border/60 bg-muted/30 px-4 py-3.5 transition-colors hover:bg-muted/50"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {i + 1}
          </span>
          <p className="text-[15px] leading-relaxed text-foreground/90 pt-0.5">{renderInline(item, `step-${i}`)}</p>
        </li>
      ))}
    </ol>
  );
}

function BulletList({ items, variant = "default" }: { items: string[]; variant?: "default" | "notes" }) {
  const isNotes = variant === "notes";

  return (
    <ul
      className={`space-y-2.5 mb-8 ${
        isNotes
          ? "rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4"
          : "pl-1"
      }`}
    >
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-[15px] leading-relaxed text-foreground/90">
          <span
            className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${
              isNotes ? "bg-amber-500" : "bg-primary"
            }`}
          />
          <span>{renderInline(item, `bullet-${i}`)}</span>
        </li>
      ))}
    </ul>
  );
}

export function HelpArticleBody({ body }: { body: string }) {
  const blocks = parseHelpBody(body);
  let sectionHeading: string | null = null;

  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          sectionHeading = block.text;
          return <HelpSectionHeading key={`heading-${block.text}`} text={block.text} />;
        }

        if (block.type === "paragraph") {
          const isLead = i === 0;
          return (
            <p
              key={`paragraph-${block.text.slice(0, 48)}`}
              className={`leading-relaxed whitespace-pre-wrap ${
                isLead
                  ? "text-lg text-foreground/90 mb-8 pb-8 border-b border-border/60"
                  : "text-[15px] text-foreground/85 mb-6"
              }`}
            >
              {renderInline(block.text, `p-${i}`)}
            </p>
          );
        }

        if (block.type === "ordered-list") {
          return <OrderedSteps key={`ordered-${block.items.join("|").slice(0, 48)}`} items={block.items} />;
        }

        if (block.type === "unordered-list") {
          return (
            <BulletList
              key={`unordered-${block.items.join("|").slice(0, 48)}`}
              items={block.items}
              variant={sectionHeading && isNotesSection(sectionHeading) ? "notes" : "default"}
            />
          );
        }

        return (
          <pre
            key={`code-${block.text.slice(0, 48)}`}
            className="mb-8 overflow-x-auto rounded-xl border border-border/60 bg-muted/50 p-4 font-mono text-sm text-foreground"
          >
            {block.text}
          </pre>
        );
      })}
    </div>
  );
}
