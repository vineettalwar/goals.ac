import { describe, expect, it, vi } from "vitest";

vi.mock("@workspace/db", () => ({
  db: {},
}));

import { ARTICLE_QUOTA_EVENT_TYPES } from "./quotas";
import { DEFAULT_PLAN_QUOTA_LIMITS } from "./plans";

describe("ARTICLE_QUOTA_EVENT_TYPES", () => {
  it("includes tool and worker event types", () => {
    expect(ARTICLE_QUOTA_EVENT_TYPES).toContain("chat");
    expect(ARTICLE_QUOTA_EVENT_TYPES).toContain("social_composer");
    expect(ARTICLE_QUOTA_EVENT_TYPES).toContain("llm_visibility_check");
    expect(ARTICLE_QUOTA_EVENT_TYPES).toContain("brief_compilation");
  });
});

describe("DEFAULT_PLAN_QUOTA_LIMITS", () => {
  it("limits starter platform-key generations", () => {
    expect(DEFAULT_PLAN_QUOTA_LIMITS.starter.articles).toBe(5);
  });
});
