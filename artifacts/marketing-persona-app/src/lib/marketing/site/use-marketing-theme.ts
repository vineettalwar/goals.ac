"use client";

import { useContext } from "react";
import type { MarketingSurface } from "./marketing-surfaces";
import { MarketingThemeContext, type MarketingTheme } from "./marketing-theme-context";

export function useMarketingTheme(): MarketingTheme {
  return useContext(MarketingThemeContext);
}

export function useMarketingSurface(override?: MarketingSurface): MarketingSurface {
  const { surface } = useMarketingTheme();
  return override ?? surface;
}
