import type { MarketingSectionVariant } from "./marketing-section";

export function marketingSectionSurface(variant: MarketingSectionVariant): "paper" | "glass" {
  return variant === "paper" ? "paper" : "glass";
}
