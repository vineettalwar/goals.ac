/**
 * Agent Progress Events
 *
 * Types and utilities for tracking agent pipeline progress via SSE.
 */

import type { AgentId, AgentProgressEvent, AgentStatus } from "./agent-types";
import { getWorkingMessage, getCompletionMessage } from "./agent-definitions";

/**
 * Create a progress event for an agent.
 */
export function createAgentEvent(
  agentId: AgentId,
  status: AgentStatus,
  options?: {
    message?: string;
    durationMs?: number;
    metadata?: Record<string, unknown>;
  },
): AgentProgressEvent {
  let message: string;
  switch (status) {
    case "pending":
      message = "Waiting";
      break;
    case "starting":
      message = "Starting";
      break;
    case "working":
      message = options?.message ?? getWorkingMessage(agentId);
      break;
    case "completed":
      message = options?.message ?? getCompletionMessage(agentId);
      break;
    case "failed":
      message = options?.message ?? "Failed";
      break;
    case "skipped":
      message = options?.message ?? "Skipped";
      break;
  }

  return {
    agent: agentId,
    status,
    message,
    durationMs: options?.durationMs,
    metadata: options?.metadata,
  };
}

/**
 * Serialize an agent event for SSE transmission.
 */
export function serializeAgentEvent(event: AgentProgressEvent): string {
  return JSON.stringify({
    type: "agent",
    ...event,
  });
}

/**
 * Parse an agent event from SSE data.
 */
export function parseAgentEvent(data: string): AgentProgressEvent | null {
  try {
    const parsed = JSON.parse(data);
    if (parsed.type === "agent" && parsed.agent && parsed.status) {
      return {
        agent: parsed.agent,
        status: parsed.status,
        message: parsed.message,
        durationMs: parsed.durationMs,
        metadata: parsed.metadata,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Create a pipeline start event (meta-event, not agent-specific).
 */
export function createPipelineStartEvent(totalAgents: number): string {
  return JSON.stringify({
    type: "pipeline_start",
    totalAgents,
    message: "Starting",
  });
}

/**
 * Create a pipeline complete event.
 */
export function createPipelineCompleteEvent(
  totalDurationMs: number,
  agentsCompleted: number,
  agentsFailed: number,
): string {
  return JSON.stringify({
    type: "pipeline_complete",
    totalDurationMs,
    agentsCompleted,
    agentsFailed,
    message:
      agentsFailed > 0
        ? `Pipeline complete with ${agentsFailed} agent(s) degraded`
        : "All agents complete",
  });
}
