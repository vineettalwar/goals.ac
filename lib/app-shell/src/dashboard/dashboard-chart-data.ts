import { countByStatus, type DashboardCommandCenter, type DashboardPiece } from "./types";

export type ActivityPoint = { label: string; publishes: number };

/** Last 6 months of successful CMS publishes from command-center history. */
export function buildPublishActivitySeries(
  recentPublishes: NonNullable<DashboardCommandCenter["recentPublishes"]>,
): ActivityPoint[] {
  const now = new Date();
  const months: ActivityPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push({
      label: d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
      publishes: 0,
    });
  }

  for (const record of recentPublishes) {
    if (record.status !== "published") continue;
    const raw = record.publishedAt ?? record.createdAt;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) continue;
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
    const idx = months.findIndex((_, i) => {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - i), 1));
      return `${d.getUTCFullYear()}-${d.getUTCMonth()}` === key;
    });
    if (idx >= 0) months[idx]!.publishes += 1;
  }

  return months;
}

export type PipelineSlice = { key: string; name: string; value: number; color: string };

const PIPELINE_COLORS: Record<string, string> = {
  published: "#2D3B2D",
  ready: "#047857",
  draft: "#6B6560",
  generating: "#B45309",
  pending: "#A8A29E",
  failed: "#C0392B",
};

export function buildPipelineSlices(pieces: DashboardPiece[]): PipelineSlice[] {
  const counts = countByStatus(pieces);
  const order = ["published", "ready", "draft", "generating", "pending", "failed"] as const;
  const slices: PipelineSlice[] = [];
  for (const key of order) {
    const value = counts[key] ?? 0;
    if (value <= 0) continue;
    slices.push({
      key,
      name: key === "ready" ? "Ready" : key.charAt(0).toUpperCase() + key.slice(1),
      value,
      color: PIPELINE_COLORS[key] ?? "#6B6560",
    });
  }
  const known = new Set<string>(order);
  for (const [key, value] of Object.entries(counts)) {
    if (known.has(key) || value <= 0) continue;
    slices.push({
      key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value,
      color: "#6B6560",
    });
  }
  return slices;
}
