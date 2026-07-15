import { describe, expect, it } from "vitest";
import {
  buildEngagementSlotBias,
  scoreSocialEngagement,
  type EngagementPostedSample,
} from "./social-metrics-service";
import { applyEngagementBiasToScheduleConfig } from "../support/social/social-queue-service";
import { DEFAULT_SOCIAL_PLATFORM_SCHEDULE } from "@workspace/db/schema";

function sample(
  iso: string,
  metrics: Partial<Omit<EngagementPostedSample, "postedAt">>,
): EngagementPostedSample {
  return {
    postedAt: new Date(iso),
    likes: null,
    comments: null,
    shares: null,
    clicks: null,
    impressions: null,
    ...metrics,
  };
}

describe("scoreSocialEngagement", () => {
  it("weights shares and comments above likes", () => {
    expect(
      scoreSocialEngagement(
        sample("2026-01-01T12:00:00Z", { likes: 10, comments: 1, shares: 1, clicks: 0 }),
      ),
    ).toBe(10 + 2 + 3);
  });
});

describe("buildEngagementSlotBias", () => {
  it("returns null when no metric rows exist", () => {
    expect(buildEngagementSlotBias([], "UTC")).toBeNull();
  });

  it("marks sparse samples as insufficient", () => {
    const bias = buildEngagementSlotBias(
      [
        sample("2026-06-02T14:00:00Z", { likes: 50 }), // Tuesday 14:00 UTC
        sample("2026-06-09T14:00:00Z", { likes: 40 }),
      ],
      "UTC",
      { minSamples: 3 },
    );
    expect(bias?.sufficient).toBe(false);
    expect(bias?.sampleSize).toBe(2);
  });

  it("biases toward stronger local hours and weekdays when samples are enough", () => {
    const bias = buildEngagementSlotBias(
      [
        sample("2026-06-02T14:00:00Z", { likes: 100, shares: 5 }), // Tue 14
        sample("2026-06-09T14:00:00Z", { likes: 90, shares: 4 }),
        sample("2026-06-16T14:00:00Z", { likes: 80, shares: 3 }),
        sample("2026-06-03T09:00:00Z", { likes: 5 }), // Wed 09
        sample("2026-06-10T09:00:00Z", { likes: 4 }),
        sample("2026-06-04T11:00:00Z", { likes: 8 }), // Thu 11
      ],
      "UTC",
      { minSamples: 3 },
    );
    expect(bias?.sufficient).toBe(true);
    expect(bias?.preferredHours[0]).toBe(14);
    expect(bias?.preferredDays[0]).toBe(2); // Tuesday
  });
});

describe("applyEngagementBiasToScheduleConfig", () => {
  it("keeps config unchanged when bias is insufficient", () => {
    const config = { ...DEFAULT_SOCIAL_PLATFORM_SCHEDULE };
    const next = applyEngagementBiasToScheduleConfig(config, {
      preferredHours: [14],
      preferredDays: [2],
      sufficient: false,
    });
    expect(next).toEqual(config);
  });

  it("prefers analytics hours and overlaps preferred days", () => {
    const config = {
      ...DEFAULT_SOCIAL_PLATFORM_SCHEDULE,
      preferredDays: [1, 3, 5],
      preferredTimes: ["09:00"],
    };
    const next = applyEngagementBiasToScheduleConfig(config, {
      preferredHours: [14, 11],
      preferredDays: [3, 2, 4],
      sufficient: true,
    });
    expect(next.preferredTimes[0]).toBe("14:00");
    expect(next.preferredDays[0]).toBe(3); // Wednesday overlap first
    expect(next.preferredDays).toContain(2);
  });
});
