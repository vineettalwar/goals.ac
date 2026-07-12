"use client";

import dynamic from "next/dynamic";

const ReactMarkdown = dynamic(() => import("react-markdown"), {
  loading: () => <div className="animate-pulse space-y-2">{Array.from({ length: 8 }).map((_, i) => (
    <div key={i} className="h-4 rounded bg-secondary/60" style={{ width: `${70 + (i % 3) * 10}%` }} />
  ))}</div>,
});

export function ContentMarkdown({ children }: { children: string }) {
  return <ReactMarkdown>{children}</ReactMarkdown>;
}
