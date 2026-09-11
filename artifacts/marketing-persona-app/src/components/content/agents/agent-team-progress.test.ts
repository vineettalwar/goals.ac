/**
 * Agent team event reducer self-check (no DOM).
 * Run: npx vitest run artifacts/marketing-persona-app/src/components/content/agents/agent-team-progress.test.ts
 */
import { describe, it, expect } from "vitest";
import { applyAgentTeamEvent, type AgentTeamState } from "./agent-team-progress";
import { AGENT_PIPELINE_ORDER } from "@workspace/content-engine";

function emptyState(): AgentTeamState {
  const s: AgentTeamState = {};
  for (const id of AGENT_PIPELINE_ORDER) s[id] = { status: "pending" };
  return s;
}

describe("applyAgentTeamEvent", () => {
  it("resets on pipeline_start", () => {
    const prev = emptyState();
    prev.owl = { status: "completed", durationMs: 1 };
    const next = applyAgentTeamEvent(prev, { type: "pipeline_start", totalAgents: 8 });
    expect(next.resetStart).toBe(true);
    expect(next.isRunning).toBe(true);
    expect(next.state.owl?.status).toBe("pending");
  });

  it("applies wrapped type:agent SSE payloads", () => {
    let state = emptyState();
    state = applyAgentTeamEvent(state, {
      type: "agent",
      agent: "ferret",
      status: "working",
      message: "The Ferret is digging for sources...",
    }).state;
    expect(state.ferret?.status).toBe("working");
    expect(state.ferret?.message).toContain("Ferret");

    state = applyAgentTeamEvent(state, {
      type: "agent",
      agent: "ferret",
      status: "completed",
      message: "Research ready",
      durationMs: 900,
    }).state;
    expect(state.ferret?.status).toBe("completed");
    expect(state.ferret?.durationMs).toBe(900);
  });

  it("marks pipeline complete", () => {
    const next = applyAgentTeamEvent(emptyState(), {
      type: "pipeline_complete",
      totalDurationMs: 42000,
      agentsCompleted: 8,
      agentsFailed: 0,
    });
    expect(next.isRunning).toBe(false);
    expect(next.totalElapsedMs).toBe(42000);
  });
});
