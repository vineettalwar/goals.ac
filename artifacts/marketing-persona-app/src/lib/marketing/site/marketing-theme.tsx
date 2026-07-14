"use client";

import { MarketingThemeContext, defaultMarketingTheme } from "./marketing-theme-context";

export function MarketingThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <MarketingThemeContext.Provider value={defaultMarketingTheme}>
      {children}
    </MarketingThemeContext.Provider>
  );
}
