import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  insertValues: [] as Record<string, unknown>[],
  onConflictSets: [] as Record<string, unknown>[],
  shouldThrow: false,
  loggerErrorMock: vi.fn(),
}));

vi.mock("@workspace/db", () => ({
  db: {
    insert: vi.fn(() => ({
      values: (values: Record<string, unknown>) => {
        state.insertValues.push(values);
        return {
          onConflictDoUpdate: (args: { set: Record<string, unknown> }) => {
            state.onConflictSets.push(args.set);
            if (state.shouldThrow) throw new Error("connection reset");
            return Promise.resolve(undefined);
          },
        };
      },
    })),
  },
  contentPiecesTable: {},
  publishRecordsTable: {},
}));

vi.mock("@workspace/db/schema", () => ({
  contentPiecesTable: {},
  publishRecordsTable: { idempotencyKey: "idempotency_key" },
}));

vi.mock("../../core/logger", () => ({
  logger: { error: state.loggerErrorMock, warn: vi.fn(), info: vi.fn() },
}));

import { recordReadinessAssessment, buildPublishIdempotencyKey } from "./publish-records";

beforeEach(() => {
  state.insertValues = [];
  state.onConflictSets = [];
  state.shouldThrow = false;
  state.loggerErrorMock.mockClear();
});

describe("recordReadinessAssessment", () => {
  it("records qualityScore and blocker/warning codes for a non-blocked attempt", async () => {
    await recordReadinessAssessment({
      contentPieceId: 1,
      websiteProjectId: 10,
      provider: "wordpress",
      qualityScore: 82,
      blockerCodes: [],
      warningCodes: ["weak_alt_text"],
      blocked: false,
    });

    expect(state.insertValues).toHaveLength(1);
    const [values] = state.insertValues;
    expect(values!.status).toBe("pending");
    expect(values!.qualityScore).toBe(82);
    expect(values!.readinessBlockers).toEqual([]);
    expect(values!.readinessWarnings).toEqual(["weak_alt_text"]);
    expect(values!.idempotencyKey).toBe(buildPublishIdempotencyKey(1, "wordpress"));
    expect(state.loggerErrorMock).not.toHaveBeenCalled();
  });

  it("records a blocked attempt with status blocked and its blocker codes", async () => {
    await recordReadinessAssessment({
      contentPieceId: 2,
      websiteProjectId: 10,
      provider: "wordpress",
      qualityScore: 41,
      blockerCodes: ["thin_content", "no_faq"],
      warningCodes: [],
      blocked: true,
    });

    const [values] = state.insertValues;
    expect(values!.status).toBe("blocked");
    expect(values!.qualityScore).toBe(41);
    expect(values!.readinessBlockers).toEqual(["thin_content", "no_faq"]);
    const [set] = state.onConflictSets;
    expect(set!.status).toBe("blocked");
  });

  it("swallows a write failure and logs it instead of throwing", async () => {
    state.shouldThrow = true;

    await expect(
      recordReadinessAssessment({
        contentPieceId: 3,
        websiteProjectId: 10,
        provider: "wordpress",
        qualityScore: 60,
        blockerCodes: [],
        warningCodes: [],
        blocked: false,
      }),
    ).resolves.toBeUndefined();

    expect(state.loggerErrorMock).toHaveBeenCalledOnce();
  });
});
