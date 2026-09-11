/**
 * Run: pnpm exec vitest run lib/app-shell/src/studio/agent-team-progress.test.ts
 */
import { describe, expect, it } from "vitest";
import {
  applyAgentTeamEvent,
  focusAgentId,
  nextAgentId,
  type AgentTeamState,
} from "./agent-team-progress";

function empty(): AgentTeamState {
  return {};
}

describe("applyAgentTeamEvent", () => {
  it("resets on pipeline_start", () => {
    const next = applyAgentTeamEvent(empty(), { type: "pipeline_start", totalAgents: 8 });
    expect(next.resetStart).toBe(true);
    expect(next.isRunning).toBe(true);
    expect(next.state.owl?.status).toBe("pending");
    expect(next.state.chameleon?.status).toBe("pending");
  });

  it("updates agent status", () => {
    let state = applyAgentTeamEvent(empty(), { type: "pipeline_start", totalAgents: 8 }).state;
    state = applyAgentTeamEvent(state, {
      type: "agent",
      agent: "owl",
      status: "working",
      message: "planning",
    }).state;
    expect(state.owl?.status).toBe("working");
    expect(state.owl?.message).toBe("planning");
  });
});

describe("focusAgentId / nextAgentId", () => {
  it("focuses active agent and names the next step", () => {
    let state = applyAgentTeamEvent(empty(), { type: "pipeline_start", totalAgents: 8 }).state;
    state = applyAgentTeamEvent(state, {
      type: "agent",
      agent: "owl",
      status: "completed",
    }).state;
    state = applyAgentTeamEvent(state, {
      type: "agent",
      agent: "ferret",
      status: "working",
      message: "digging",
    }).state;
    expect(focusAgentId(state, true)).toBe("ferret");
    expect(nextAgentId(state, "ferret")).toBe("hummingbird");
  });

  it("while assembling, focuses first pending and next is ferret", () => {
    const state = applyAgentTeamEvent(empty(), { type: "pipeline_start", totalAgents: 8 }).state;
    expect(focusAgentId(state, true)).toBe("owl");
    expect(nextAgentId(state, "owl")).toBe("ferret");
  });
});
