/**
 * Run: pnpm exec vitest run lib/app-shell/src/studio/loop-step-progress.test.ts
 */
import { describe, expect, it } from "vitest";
import { applyLoopStepEvent } from "./loop-step-progress";

describe("applyLoopStepEvent", () => {
  it("appends loop_step and ignores owl pipeline events", () => {
    let steps = applyLoopStepEvent([], { type: "pipeline_start", totalAgents: 8 });
    expect(steps).toHaveLength(0);
    steps = applyLoopStepEvent(steps, {
      type: "loop_step",
      tool: "gsc_query",
      decision: "Query Search Console",
      ok: true,
    });
    expect(steps).toHaveLength(1);
    expect(steps[0]?.tool).toBe("gsc_query");
    steps = applyLoopStepEvent(steps, { type: "agent", agent: "owl", status: "working" });
    expect(steps).toHaveLength(1);
  });

  it("keeps failed loop_step error text", () => {
    const steps = applyLoopStepEvent([], {
      type: "loop_step",
      tool: "generate_draft",
      ok: false,
      error: "model timeout",
      summary: "Draft failed",
    });
    expect(steps[0]?.ok).toBe(false);
    expect(steps[0]?.error).toBe("model timeout");
  });
});
