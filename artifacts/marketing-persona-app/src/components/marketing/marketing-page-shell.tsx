"use client";

import type { ReactNode } from "react";

type MarketingPageShellProps = {
  hero: ReactNode;
  children: ReactNode;
  overlap?: boolean;
};

export function MarketingPageShell({ hero, children, overlap = true }: MarketingPageShellProps) {
  return (
    <div className="min-h-screen bg-background tracking-[-0.02em]">
      {hero}
      <div className={`relative bg-background ${overlap ? "-mt-8 sm:-mt-12" : ""}`}>
        {children}
      </div>
    </div>
  );
}
