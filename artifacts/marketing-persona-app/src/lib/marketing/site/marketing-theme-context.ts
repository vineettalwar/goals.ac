"use client";

import { createContext } from "react";
import type { MarketingSurface } from "./marketing-surfaces";

export type MarketingTone = "dark";

export type MarketingTheme = {
  tone: MarketingTone;
  surface: MarketingSurface;
};

export const defaultMarketingTheme: MarketingTheme = {
  tone: "dark",
  surface: "glass",
};

export const MarketingThemeContext = createContext<MarketingTheme>(defaultMarketingTheme);
