"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const ReactMarkdown = dynamic(() => import("react-markdown"), {
  loading: () => (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded bg-secondary/60"
          style={{ width: `${70 + (i % 3) * 10}%` }}
        />
      ))}
    </div>
  ),
});

type ContentMarkdownProps = {
  children: string;
  className?: string;
};

export function ContentMarkdown({ children, className }: ContentMarkdownProps) {
  const source = children.replace(/<!--[\s\S]*?-->/g, "").trim();
  return (
    <article
      className={cn(
        "prose prose-neutral max-w-none overflow-x-hidden",
        "prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground",
        "prose-p:break-words prose-p:text-foreground/90 prose-p:leading-relaxed",
        "prose-li:text-foreground/90 prose-strong:text-foreground",
        "prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline",
        "prose-h2:mt-10 prose-h2:mb-4 prose-h3:mt-6 prose-h3:mb-3",
        // Visual summary / infographic callouts
        "prose-blockquote:not-italic prose-blockquote:border-l-primary prose-blockquote:bg-secondary/50",
        "prose-blockquote:rounded-r-lg prose-blockquote:px-4 prose-blockquote:py-3 prose-blockquote:my-4",
        "prose-blockquote:text-foreground/90",
        className,
      )}
    >
      <ReactMarkdown>{source}</ReactMarkdown>
    </article>
  );
}
