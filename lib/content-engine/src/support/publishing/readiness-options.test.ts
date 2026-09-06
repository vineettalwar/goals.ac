import { describe, expect, it, vi, beforeEach } from "vitest";

const selectMock = vi.fn();
const fromMock = vi.fn(() => ({ where: whereMock }));
const whereMock = vi.fn(() => ({ orderBy: orderByMock }));
const orderByMock = vi.fn(() => ({ limit: limitMock }));
const limitMock = vi.fn();

vi.mock("@workspace/db", () => ({
  db: {
    select: () => {
      selectMock();
      return { from: fromMock };
    },
  },
}));

vi.mock("@workspace/db/schema", () => ({
  contentPiecesTable: {
    id: "id",
    websiteProjectId: "website_project_id",
    status: "status",
    title: "title",
    updatedAt: "updated_at",
  },
}));

import { buildPublishReadinessOptions } from "./readiness-options";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildPublishReadinessOptions", () => {
  it("returns unattended + checkUnattributedClaims + targetKeyword", async () => {
    limitMock.mockResolvedValue([{ title: "Existing Post" }]);

    const result = await buildPublishReadinessOptions(
      { id: 42, websiteProjectId: 7, targetKeyword: "seo tools" },
      { unattended: true },
    );

    expect(result.targetKeyword).toBe("seo tools");
    expect(result.checkUnattributedClaims).toBe(true);
    expect(result.unattended).toBe(true);
    expect(result.existingTitles).toEqual(["Existing Post"]);
  });

  it("omits unattended when false", async () => {
    limitMock.mockResolvedValue([]);

    const result = await buildPublishReadinessOptions(
      { id: 1, websiteProjectId: 2 },
      { unattended: false },
    );

    expect(result.unattended).toBeUndefined();
    expect(result.checkUnattributedClaims).toBe(true);
    expect(result.targetKeyword).toBeUndefined();
    expect(result.existingTitles).toEqual([]);
  });

  it("returns undefined existingTitles when DB query throws", async () => {
    limitMock.mockRejectedValue(new Error("db down"));

    const result = await buildPublishReadinessOptions(
      { id: 1, websiteProjectId: 2, targetKeyword: "k" },
      { unattended: true },
    );

    expect(result.existingTitles).toBeUndefined();
    expect(result.targetKeyword).toBe("k");
  });
});
