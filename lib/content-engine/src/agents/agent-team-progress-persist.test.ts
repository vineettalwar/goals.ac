/**
 * foldAgentProgressEvent self-check (no DB).
 * Run: npx vitest run lib/content-engine/src/agents/agent-team-progress-persist.test.ts
 */
import { describe, it, expect } from "vitest";
import { foldAgentProgressEvent } from "./agent-team-progress-persist";
import { AGENT_PIPELINE_ORDER } from "./agent-definitions";

describe("foldAgentProgressEvent", () => {
  it("resets agents on pipeline_start and marks running", () => {
    const next = foldAgentProgressEvent(null, { type: "pipeline_start", totalAgents: 8 });
    expect(next.isRunning).toBe(true);
    expect(next.agents.owl?.status).toBe("pending");
    expect(Object.keys(next.agents)).toHaveLength(AGENT_PIPELINE_ORDER.length);
  });

  it("applies agent working then complete", () => {
    let snap = foldAgentProgressEvent(null, { type: "pipeline_start", totalAgents: 8 });
    snap = foldAgentProgressEvent(snap, {
      type: "agent",
      agent: "owl",
      status: "working",
      message: "planning",
    });
    expect(snap.agents.owl?.status).toBe("working");
    expect(snap.agents.owl?.message).toBe("planning");

    snap = foldAgentProgressEvent(snap, {
      agent: "owl",
      status: "completed",
      message: "done",
      durationMs: 1200,
    });
    expect(snap.agents.owl?.status).toBe("completed");
    expect(snap.agents.owl?.durationMs).toBe(1200);
  });

  it("stops on pipeline_complete", () => {
    const next = foldAgentProgressEvent(
      { agents: {}, isRunning: true, updatedAt: "" },
      { type: "pipeline_complete", totalDurationMs: 9000 },
    );
    expect(next.isRunning).toBe(false);
    expect(next.totalElapsedMs).toBe(9000);
  });
});
