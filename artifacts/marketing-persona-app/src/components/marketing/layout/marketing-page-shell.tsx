"use client";

import type { ReactNode } from "react";
import { MarketingThemeProvider } from "@/lib/marketing/site/marketing-theme";

type MarketingPageShellProps = {
  hero: ReactNode;
  children?: ReactNode;
  overlap?: boolean;
};

export function MarketingPageShell({ hero, children }: MarketingPageShellProps) {
  return (
    <MarketingThemeProvider>
      <div className="min-h-screen bg-background text-foreground">
        {hero}
        <div className="relative bg-background">{children}</div>
      </div>
    </MarketingThemeProvider>
  );
}
