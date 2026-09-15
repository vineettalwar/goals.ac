import { describe, expect, it } from "vitest";
import { computePlannedDate } from "./autopilot-orchestrator";
import {
  findNextDueFromRows,
  pickOpenOpportunityForRefill,
  plannedDayFromIso,
  shouldAttemptAutopilotRefill,
} from "./autopilot-refill";

describe("plannedDayFromIso", () => {
  it("caps day at 28 to match computePlannedDate", () => {
    expect(plannedDayFromIso("2026-09-30")).toEqual({ year: 2026, month: 9, day: 28 });
  });

  it("keeps mid-month days", () => {
    expect(plannedDayFromIso("2026-09-15")).toEqual({ year: 2026, month: 9, day: 15 });
  });
});

describe("shouldAttemptAutopilotRefill", () => {
  it("does not refill when a due draft already exists", () => {
    expect(shouldAttemptAutopilotRefill({ hasDueItem: true, autoQueueOpportunities: true })).toBe(false);
  });

  it("does not refill when auto-queue is off", () => {
    expect(shouldAttemptAutopilotRefill({ hasDueItem: false, autoQueueOpportunities: false })).toBe(false);
  });

  it("refills when the calendar is empty and auto-queue is on", () => {
    expect(shouldAttemptAutopilotRefill({ hasDueItem: false, autoQueueOpportunities: true })).toBe(true);
  });
});

describe("pickOpenOpportunityForRefill", () => {
  const rows = [
    { id: 1, opportunityScore: 80 },
    { id: 2, opportunityScore: 55 },
  ];

  it("picks the first row at or above the threshold", () => {
    expect(pickOpenOpportunityForRefill(rows, 70)?.id).toBe(1);
  });

  it("returns undefined when nothing meets the threshold", () => {
    expect(pickOpenOpportunityForRefill(rows, 90)).toBeUndefined();
  });
});

describe("findNextDueFromRows", () => {
  it("skips a day-29 item that is not due yet", () => {
    const next = findNextDueFromRows(
      [{ itemId: 1, strategyId: 2, year: 2026, month: 9, day: 29 }],
      "2026-09-15",
    );
    expect(next).toBeNull();
  });

  it("returns a today-dated item as due", () => {
    const { year, month, day } = plannedDayFromIso("2026-09-15");
    const planned = computePlannedDate(year, month, day);
    const next = findNextDueFromRows([{ itemId: 9, strategyId: 3, year, month, day }], planned);
    expect(next).toEqual({ itemId: 9, strategyId: 3 });
  });

  it("does not rewrite other drafts — selection is read-only", () => {
    const rows = [
      { itemId: 10, strategyId: 1, year: 2026, month: 10, day: 20 },
      { itemId: 11, strategyId: 1, year: 2026, month: 9, day: 1 },
    ];
    expect(findNextDueFromRows(rows, "2026-09-15")).toEqual({ itemId: 11, strategyId: 1 });
    expect(rows[0]).toEqual({ itemId: 10, strategyId: 1, year: 2026, month: 10, day: 20 });
  });
});
