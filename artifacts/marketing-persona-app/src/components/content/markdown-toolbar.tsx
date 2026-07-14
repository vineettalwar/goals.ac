"use client";

import { type RefObject } from "react";
import { Bold, Italic, Heading2, Heading3, Link2, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MarkdownToolbarProps = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
  className?: string;
};

function wrapSelection(
  textarea: HTMLTextAreaElement,
  value: string,
  before: string,
  after: string,
  placeholder: string,
): string {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.slice(start, end) || placeholder;
  const next = value.slice(0, start) + before + selected + after + value.slice(end);
  queueMicrotask(() => {
    textarea.focus();
    const cursor = start + before.length + selected.length + after.length;
    textarea.setSelectionRange(cursor, cursor);
  });
  return next;
}

function prefixLines(
  textarea: HTMLTextAreaElement,
  value: string,
  prefix: string,
  placeholder: string,
): string {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const block = value.slice(start, end) || placeholder;
  const lines = block.split("\n").map((line) => `${prefix}${line}`);
  const next = value.slice(0, start) + lines.join("\n") + value.slice(end);
  queueMicrotask(() => textarea.focus());
  return next;
}

export function MarkdownToolbar({ textareaRef, value, onChange, className }: MarkdownToolbarProps) {
  function withTextarea(action: (el: HTMLTextAreaElement) => string) {
    const el = textareaRef.current;
    if (!el) return;
    onChange(action(el));
  }

  const tools = [
    {
      label: "Bold",
      icon: Bold,
      action: () =>
        withTextarea((el) => wrapSelection(el, value, "**", "**", "bold text")),
    },
    {
      label: "Italic",
      icon: Italic,
      action: () =>
        withTextarea((el) => wrapSelection(el, value, "*", "*", "italic text")),
    },
    {
      label: "Heading 2",
      icon: Heading2,
      action: () =>
        withTextarea((el) => prefixLines(el, value, "## ", "Section heading")),
    },
    {
      label: "Heading 3",
      icon: Heading3,
      action: () =>
        withTextarea((el) => prefixLines(el, value, "### ", "Subheading")),
    },
    {
      label: "Link",
      icon: Link2,
      action: () =>
        withTextarea((el) =>
          wrapSelection(el, value, "[", "](https://)", "link text"),
        ),
    },
    {
      label: "Bullet list",
      icon: List,
      action: () =>
        withTextarea((el) => prefixLines(el, value, "- ", "List item")),
    },
  ];

  return (
    <div className={cn("flex flex-wrap items-center gap-0.5", className)}>
      {tools.map(({ label, icon: Icon, action }) => (
        <Button
          key={label}
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title={label}
          onClick={action}
        >
          <Icon className="h-3.5 w-3.5" />
        </Button>
      ))}
    </div>
  );
}
