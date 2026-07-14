"use client";

import type { ReactNode } from "react";
import { MarketingThemeProvider } from "@/lib/marketing/marketing-theme";

type MarketingPageShellProps = {
  hero: ReactNode;
  children?: ReactNode;
  overlap?: boolean;
};

export function MarketingPageShell({ hero, children, overlap = true }: MarketingPageShellProps) {
  return (
    <MarketingThemeProvider>
      <div className="min-h-screen bg-black tracking-[-0.02em]">
        {hero}
        <div className={`relative bg-black ${overlap ? "-mt-8 sm:-mt-12" : ""}`}>
          {children}
        </div>
      </div>
    </MarketingThemeProvider>
  );
}
