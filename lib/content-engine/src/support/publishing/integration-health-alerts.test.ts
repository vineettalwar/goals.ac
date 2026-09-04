import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  nextId: 1,
  loggerErrorMock: vi.fn(),
}));

vi.mock("@workspace/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => {
            // The service only ever selects the existing-open-alert check with
            // this shape; find any matching row well enough for the test.
            return Promise.resolve(state.rows.filter((r) => r.status === "open").slice(0, 1));
          },
        }),
      }),
    }),
    insert: () => ({
      values: (values: Record<string, unknown>) => {
        const row = { id: state.nextId++, status: "open", ...values };
        state.rows.push(row);
        return Promise.resolve(undefined);
      },
    }),
    update: () => ({
      set: (patch: Record<string, unknown>) => ({
        where: () => {
          for (const row of state.rows) {
            if (row.status === "open") Object.assign(row, patch);
          }
          return Promise.resolve(undefined);
        },
      }),
    }),
  },
  integrationHealthAlertsTable: {},
}));

vi.mock("@workspace/db/schema", () => ({
  integrationHealthAlertsTable: {
    id: "id",
    websiteProjectId: "website_project_id",
    platform: "platform",
    status: "status",
    createdAt: "created_at",
  },
}));

vi.mock("../../core/logger", () => ({
  logger: { error: state.loggerErrorMock, warn: vi.fn(), info: vi.fn() },
}));

import {
  applyIntegrationHealthTransition,
  classifyIntegrationAlertType,
  detectHealthTransition,
} from "./integration-health-alerts";

beforeEach(() => {
  state.rows = [];
  state.nextId = 1;
  state.loggerErrorMock.mockClear();
});

describe("detectHealthTransition", () => {
  it("flags ok -> failing as flipped_to_failing", () => {
    expect(detectHealthTransition(true, false)).toBe("flipped_to_failing");
  });

  it("flags unknown -> failing as flipped_to_failing", () => {
    expect(detectHealthTransition(null, false)).toBe("flipped_to_failing");
    expect(detectHealthTransition(undefined, false)).toBe("flipped_to_failing");
  });

  it("does not flag failing -> failing as a transition", () => {
    expect(detectHealthTransition(false, false)).toBe("no_change");
  });

  it("flags failing -> ok as flipped_to_healthy", () => {
    expect(detectHealthTransition(false, true)).toBe("flipped_to_healthy");
  });

  it("does not flag ok -> ok as a transition", () => {
    expect(detectHealthTransition(true, true)).toBe("no_change");
  });

  it("ignores a currently-untestable result", () => {
    expect(detectHealthTransition(true, null)).toBe("no_change");
  });
});

describe("classifyIntegrationAlertType", () => {
  it("classifies 401/unauthorized-shaped errors as reauth_required", () => {
    expect(classifyIntegrationAlertType("Notion API 401")).toBe("reauth_required");
    expect(classifyIntegrationAlertType("Invalid integration token")).toBe("reauth_required");
  });

  it("classifies other errors as connection_failing", () => {
    expect(classifyIntegrationAlertType("Database not found or not shared")).toBe("connection_failing");
    expect(classifyIntegrationAlertType(undefined)).toBe("connection_failing");
  });
});

describe("applyIntegrationHealthTransition", () => {
  it("creates an open alert when a connection flips ok -> failing", async () => {
    await applyIntegrationHealthTransition({
      websiteProjectId: 10,
      organizationId: 5,
      platform: "wordpress",
      previousOk: true,
      currentOk: false,
      error: "Invalid credentials (401 Unauthorized)",
    });

    expect(state.rows).toHaveLength(1);
    expect(state.rows[0]).toMatchObject({
      websiteProjectId: 10,
      organizationId: 5,
      platform: "wordpress",
      alertType: "reauth_required",
      status: "open",
    });
  });

  it("does not duplicate an alert when failing repeats", async () => {
    await applyIntegrationHealthTransition({
      websiteProjectId: 10,
      organizationId: 5,
      platform: "wordpress",
      previousOk: true,
      currentOk: false,
      error: "Invalid credentials (401 Unauthorized)",
    });
    // Second check still reports failing; previousOk is now false (as
    // persisted after the first check).
    await applyIntegrationHealthTransition({
      websiteProjectId: 10,
      organizationId: 5,
      platform: "wordpress",
      previousOk: false,
      currentOk: false,
      error: "Invalid credentials (401 Unauthorized)",
    });

    expect(state.rows).toHaveLength(1);
  });

  it("auto-resolves the open alert when the connection recovers", async () => {
    await applyIntegrationHealthTransition({
      websiteProjectId: 10,
      organizationId: 5,
      platform: "wordpress",
      previousOk: true,
      currentOk: false,
      error: "Invalid credentials (401 Unauthorized)",
    });
    expect(state.rows[0]!.status).toBe("open");

    await applyIntegrationHealthTransition({
      websiteProjectId: 10,
      organizationId: 5,
      platform: "wordpress",
      previousOk: false,
      currentOk: true,
    });

    expect(state.rows[0]!.status).toBe("resolved");
    expect(state.rows[0]!.resolvedAt).toBeInstanceOf(Date);
  });

  it("does nothing for a no_change transition", async () => {
    await applyIntegrationHealthTransition({
      websiteProjectId: 10,
      organizationId: 5,
      platform: "wordpress",
      previousOk: true,
      currentOk: true,
    });

    expect(state.rows).toHaveLength(0);
  });
});
