"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { MarketingSurface } from "./marketing-surfaces";

export type MarketingTone = "dark";

export type MarketingTheme = {
  tone: MarketingTone;
  surface: MarketingSurface;
};

const defaultTheme: MarketingTheme = {
  tone: "dark",
  surface: "glass",
};

const MarketingThemeContext = createContext<MarketingTheme>(defaultTheme);

export function MarketingThemeProvider({ children }: { children: ReactNode }) {
  return (
    <MarketingThemeContext.Provider value={defaultTheme}>
      {children}
    </MarketingThemeContext.Provider>
  );
}

export function useMarketingTheme(): MarketingTheme {
  return useContext(MarketingThemeContext);
}

export function useMarketingSurface(override?: MarketingSurface): MarketingSurface {
  const { surface } = useMarketingTheme();
  return override ?? surface;
}
