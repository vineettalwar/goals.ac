import { describe, expect, it } from "vitest";
import { buildPipelineSlices, buildPublishActivitySeries } from "./dashboard-chart-data";
import type { DashboardCommandCenterRecentPublish, DashboardPiece } from "./types";

describe("buildPipelineSlices", () => {
  it("groups piece statuses", () => {
    const pieces: DashboardPiece[] = [
      { id: 1, title: "A", status: "draft", websiteProjectId: 1 },
      { id: 2, title: "B", status: "published", websiteProjectId: 1 },
      { id: 3, title: "C", status: "published", websiteProjectId: 1 },
      { id: 4, title: "D", status: "generating", websiteProjectId: 1 },
    ];
    const slices = buildPipelineSlices(pieces);
    expect(slices.find((s) => s.key === "published")?.value).toBe(2);
    expect(slices.find((s) => s.key === "draft")?.value).toBe(1);
    expect(slices.find((s) => s.key === "generating")?.value).toBe(1);
  });
});

describe("buildPublishActivitySeries", () => {
  it("counts successful publishes into the current month bucket", () => {
    const now = new Date();
    const publishes: DashboardCommandCenterRecentPublish[] = [
      {
        id: 1,
        contentPieceId: 2,
        provider: "wordpress",
        status: "published",
        pieceTitle: "B",
        remoteUrl: null,
        errorMessage: null,
        publishedAt: now.toISOString(),
        createdAt: now.toISOString(),
      },
      {
        id: 2,
        contentPieceId: 3,
        provider: "wordpress",
        status: "failed",
        pieceTitle: "C",
        remoteUrl: null,
        errorMessage: "boom",
        publishedAt: now.toISOString(),
        createdAt: now.toISOString(),
      },
    ];
    const series = buildPublishActivitySeries(publishes);
    expect(series).toHaveLength(6);
    expect(series[series.length - 1]?.publishes).toBe(1);
  });
});
