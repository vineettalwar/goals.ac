import { describe, expect, it } from "vitest";
import { isQueuedGscSync } from "./gsc-sync-result";

describe("isQueuedGscSync", () => {
  it("treats CF 202 accepted payloads as queued", () => {
    expect(isQueuedGscSync({ accepted: true, status: "queued" })).toBe(true);
    expect(isQueuedGscSync({ queued: true })).toBe(true);
  });

  it("does not treat a finished sync as queued", () => {
    expect(isQueuedGscSync({ rowsUpserted: 0, opportunitiesInserted: 0 })).toBe(false);
    expect(isQueuedGscSync({ rowsUpserted: 12 })).toBe(false);
  });
});
