import { describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  db: {
    select: () => ({ from: () => ({ innerJoin: () => ({ where: () => ({ limit: async () => [] }) }) }) }),
  },
}));

vi.mock("@workspace/content-engine/support/ai/org-ai-settings", () => ({
  getOrgAiSettingsForUser: vi.fn(),
}));

import { handleLegacyRead } from "./legacy-routes";

describe("GET /api/conversations", () => {
  it("returns 404 (unscoped dump removed)", async () => {
    const res = await handleLegacyRead(
      new Request("https://read.example/api/conversations"),
      "/api/conversations",
      1,
    );
    expect(res?.status).toBe(404);
  });
});
