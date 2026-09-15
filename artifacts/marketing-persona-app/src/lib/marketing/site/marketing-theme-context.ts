"use client";

import { createContext } from "react";
import type { MarketingSurface } from "./marketing-surfaces";

export type MarketingTone = "light" | "dark";

export type MarketingTheme = {
  tone: MarketingTone;
  surface: MarketingSurface;
};

export const defaultMarketingTheme: MarketingTheme = {
  tone: "light",
  surface: "paper",
};

export const MarketingThemeContext = createContext<MarketingTheme>(defaultMarketingTheme);
