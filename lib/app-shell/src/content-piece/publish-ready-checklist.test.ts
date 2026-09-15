import { describe, expect, it } from "vitest";
import {
  buildPublishReadyChecklist,
  contentPieceCanPublish,
  nextContentPiecePublishAction,
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

  it("does not soft-block humanize when the draft has no AI tells", () => {
    const items = buildPublishReadyChecklist({
      humanized: false,
      slopScore: 0,
      editorialScore: 80,
      destinationHealthOk: true,
    });
    expect(items.find((i) => i.id === "humanize")?.ok).toBe(true);
    expect(publishReadyChecklistBlocks(items)).toBe(false);
  });
});

describe("nextContentPiecePublishAction", () => {
  it("asks for humanize before mark-ready on a sloppy draft", () => {
    expect(nextContentPiecePublishAction({ status: "draft", humanizeOk: false })).toBe(
      "humanize",
    );
  });

  it("asks to mark ready after humanize", () => {
    expect(nextContentPiecePublishAction({ status: "draft", humanizeOk: true })).toBe(
      "mark_ready",
    );
  });

  it("asks to publish once ready", () => {
    expect(nextContentPiecePublishAction({ status: "ready", humanizeOk: true })).toBe(
      "publish",
    );
  });
});

describe("contentPieceCanPublish", () => {
  it("allows draft and ready, not published", () => {
    expect(contentPieceCanPublish("draft")).toBe(true);
    expect(contentPieceCanPublish("ready")).toBe(true);
    expect(contentPieceCanPublish("published")).toBe(false);
    expect(contentPieceCanPublish("generating")).toBe(false);
  });
});
