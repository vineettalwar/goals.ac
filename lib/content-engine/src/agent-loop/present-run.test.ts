/**
 * Run: npx vitest run lib/content-engine/src/agent-loop/present-run.test.ts
 */
import { describe, expect, it } from "vitest";
import { presentAgentRun, presentAgentRunListItem } from "./present-run";

describe("presentAgentRun", () => {
  it("lifts pendingApproval from policy and keeps failed tool errors", () => {
    const presented = presentAgentRun({
      id: 9,
      websiteProjectId: 3,
      goalKind: "publish_check",
      goal: { kind: "publish_check", text: "live", projectId: 3 },
      status: "awaiting_approval",
      stopReason: "Live publish requires human approval",
      creditsSpent: 2,
      policy: {
        allowLivePublish: false,
        approveFirstForLivePublish: true,
        maxCredits: 20,
        plannerMode: "deterministic",
        pendingApproval: { tool: "publish_live", args: { contentPieceId: 4 }, reason: "gate" },
      },
      trajectory: [
        {
          at: "2026-09-16T00:00:00.000Z",
          decision: "gate",
          tool: "publish_live",
          ok: false,
          summary: "Live publish requires human approval",
          error: "Live publish requires human approval",
        },
      ],
    });
    expect(presented.pendingApproval?.tool).toBe("publish_live");
    expect(presented.trajectory[0]?.error).toMatch(/approval/i);
  });

  it("summarizes list rows without dumping the full trajectory", () => {
    const item = presentAgentRunListItem({
      id: 2,
      websiteProjectId: 1,
      goalKind: "research_then_draft",
      status: "failed",
      stopReason: "model timeout",
      trajectory: [
        { at: "t1", decision: "gsc", tool: "gsc_query", ok: true },
        { at: "t2", decision: "draft", tool: "generate_draft", ok: false, error: "model timeout" },
      ],
    });
    expect(item.stepCount).toBe(2);
    expect(item.lastStep?.tool).toBe("generate_draft");
    expect(item.failed).toBe(true);
    expect(item.awaitingApproval).toBe(false);
    expect("trajectory" in item).toBe(false);
  });
});
