export type MarketingSurface = "paper" | "glass";

export function cardSurfaceClass(surface: MarketingSurface, hover = true): string {
  if (surface === "glass") {
    return hover ? "glass-card glass-card-hover rounded-2xl" : "glass-card rounded-2xl";
  }
  return hover ? "paper-card paper-card-hover rounded-2xl" : "paper-card rounded-2xl";
}
