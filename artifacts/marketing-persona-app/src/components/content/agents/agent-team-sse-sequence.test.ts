/**
 * Simulated Owl→…→Chameleon SSE sequence through the UI reducer.
 * Stand-in for live E2E when the app/AI key is unavailable.
 */
import { describe, it, expect } from "vitest";
import { applyAgentTeamEvent, type AgentTeamState } from "./agent-team-progress";
import { AGENT_PIPELINE_ORDER } from "@workspace/content-engine/agents/definitions";
import { createAgentEvent, createPipelineStartEvent, createPipelineCompleteEvent } from "@workspace/content-engine/agents/events";

function emptyState(): AgentTeamState {
  const s: AgentTeamState = {};
  for (const id of AGENT_PIPELINE_ORDER) s[id] = { status: "pending" };
  return s;
}

describe("agent team SSE sequence (E2E stand-in)", () => {
  it("walks full pipeline Owl through Chameleon", () => {
    let state = emptyState();
    let running = false;
    let elapsed: number | undefined;

    const apply = (raw: string) => {
      const parsed = JSON.parse(raw) as { type: string; [key: string]: unknown };
      const next = applyAgentTeamEvent(state, parsed);
      state = next.state;
      if (next.resetStart) running = true;
      if (next.isRunning === false) running = false;
      if (next.totalElapsedMs !== undefined) elapsed = next.totalElapsedMs;
    };

    apply(createPipelineStartEvent(8));
    expect(running).toBe(true);

    for (const agentId of AGENT_PIPELINE_ORDER) {
      apply(JSON.stringify({ type: "agent", ...createAgentEvent(agentId, "starting") }));
      apply(JSON.stringify({ type: "agent", ...createAgentEvent(agentId, "working") }));
      expect(state[agentId]?.status).toBe("working");
      apply(
        JSON.stringify({
          type: "agent",
          ...createAgentEvent(agentId, "completed", { durationMs: 100 }),
        }),
      );
      expect(state[agentId]?.status).toBe("completed");
    }

    apply(createPipelineCompleteEvent(8000, 8, 0));
    expect(running).toBe(false);
    expect(elapsed).toBe(8000);
    for (const agentId of AGENT_PIPELINE_ORDER) {
      expect(state[agentId]?.status).toBe("completed");
    }
  });
});
