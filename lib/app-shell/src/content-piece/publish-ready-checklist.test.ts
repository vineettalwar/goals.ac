import { describe, expect, it } from "vitest";
import {
  buildPublishReadyChecklist,
  publishReadyChecklistBlocks,
} from "./types";

describe("buildPublishReadyChecklist", () => {
  it("soft-blocks when humanize is missing", () => {
    const items = buildPublishReadyChecklist({
      humanized: false,
      editorialScore: 80,
      destinationHealthOk: true,
    });
    expect(items.find((i) => i.id === "humanize")?.ok).toBe(false);
    expect(publishReadyChecklistBlocks(items)).toBe(true);
  });

  it("passes when humanized and destination healthy", () => {
    const items = buildPublishReadyChecklist({
      humanized: true,
      editorialScore: 70,
      destinationHealthOk: true,
      needsFeaturedImage: false,
    });
    expect(publishReadyChecklistBlocks(items)).toBe(false);
  });

  it("treats skipped humanize as ok", () => {
    const items = buildPublishReadyChecklist({
      humanizeSkippedReason: "no brand voice sample",
      destinationHealthOk: null,
    });
    expect(items.find((i) => i.id === "humanize")?.ok).toBe(true);
  });
});
