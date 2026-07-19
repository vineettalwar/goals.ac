import { describe, expect, it, vi } from "vitest";

vi.mock("@workspace/db", () => ({
  db: {
    insert: () => ({
      values: () => ({
        returning: async () => [{ geoScore: 71 }],
      }),
    }),
  },
}));

vi.mock("@workspace/db/schema", () => ({
  geoAuditsTable: { geoScore: "geoScore" },
}));

vi.mock("@workspace/seo-tools/geoAuditor", () => ({
  auditUrl: async () => ({
    url: "https://example.com",
    geoScore: 71,
    issues: [],
    pageTitle: "Example",
    metaDescription: null,
    hasSchemaOrg: false,
    schemaTypes: [],
    h1Count: 1,
    imageCount: 0,
    imagesMissingAlt: 0,
  }),
}));

vi.mock("@workspace/security/ssrf-guard", () => ({
  assertPublicUrl: async () => undefined,
}));

vi.mock("./llm-visibility-service", () => ({
  seedPromptsForProject: async () => 4,
}));

import { kickOffFastLaneVisibility } from "./fast-lane-visibility";

describe("kickOffFastLaneVisibility", () => {
  it("seeds prompts, queues check, and records GEO", async () => {
    const queue = vi.fn(async () => undefined);
    const result = await kickOffFastLaneVisibility({
      projectId: 1,
      projectUrl: "https://example.com",
      queueVisibilityCheck: queue,
    });
    expect(result.promptsSeeded).toBe(4);
    expect(result.visibilityQueued).toBe(true);
    expect(result.geoScore).toBe(71);
    expect(queue).toHaveBeenCalledOnce();
  });
});
