export type MarketingSurface = "paper" | "glass";

export function cardSurfaceClass(_surface: MarketingSurface, hover = true): string {
  return hover ? "hairline-panel paper-card-hover" : "hairline-panel";
}
