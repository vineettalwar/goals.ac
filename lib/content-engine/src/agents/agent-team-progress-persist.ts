/**
 * Persist agent-team progress onto content_pieces.piece_metadata so onboarding
 * UIs can poll one-agent-at-a-time status from background jobs (no SSE).
 */
import { db } from "@workspace/db";
import { contentPiecesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { AGENT_PIPELINE_ORDER } from "./agent-definitions";
import type { AgentId, AgentProgressEvent, AgentStatus } from "./agent-types";
import type { ContentPieceMetadata } from "../content/content-piece-seo";

export type AgentTeamProgressSnapshot = {
  agents: Record<
    string,
    {
      status: AgentStatus;
      message?: string;
      durationMs?: number;
    }
  >;
  isRunning: boolean;
  totalElapsedMs?: number;
  updatedAt: string;
};

function emptyAgents(): AgentTeamProgressSnapshot["agents"] {
  const agents: AgentTeamProgressSnapshot["agents"] = {};
  for (const id of AGENT_PIPELINE_ORDER) {
    agents[id] = { status: "pending" };
  }
  return agents;
}

export function foldAgentProgressEvent(
  prev: AgentTeamProgressSnapshot | null | undefined,
  event: AgentProgressEvent | { type: string; [key: string]: unknown },
): AgentTeamProgressSnapshot {
  const base: AgentTeamProgressSnapshot = prev ?? {
    agents: emptyAgents(),
    isRunning: false,
    updatedAt: new Date().toISOString(),
  };

  if ("type" in event && typeof event.type === "string") {
    if (event.type === "pipeline_start") {
      return {
        agents: emptyAgents(),
        isRunning: true,
        updatedAt: new Date().toISOString(),
      };
    }
    if (event.type === "pipeline_complete") {
      return {
        ...base,
        isRunning: false,
        totalElapsedMs: event.totalDurationMs as number | undefined,
        updatedAt: new Date().toISOString(),
      };
    }
    if (event.type === "agent" && event.agent && event.status) {
      const agentId = event.agent as AgentId;
      return {
        ...base,
        isRunning: true,
        agents: {
          ...base.agents,
          [agentId]: {
            status: event.status as AgentStatus,
            message: (event.message as string) ?? "",
            durationMs: event.durationMs as number | undefined,
          },
        },
        updatedAt: new Date().toISOString(),
      };
    }
  }

  if ("agent" in event && "status" in event) {
    const e = event as AgentProgressEvent;
    return {
      ...base,
      isRunning: true,
      agents: {
        ...base.agents,
        [e.agent]: {
          status: e.status,
          message: e.message,
          durationMs: e.durationMs,
        },
      },
      updatedAt: new Date().toISOString(),
    };
  }

  return { ...base, updatedAt: new Date().toISOString() };
}

/** Merge one progress event into piece_metadata.agentTeamProgress. */
export async function patchPieceAgentTeamProgress(
  pieceId: number,
  event: AgentProgressEvent | { type: string; [key: string]: unknown },
): Promise<void> {
  const [row] = await db
    .select({ pieceMetadata: contentPiecesTable.pieceMetadata })
    .from(contentPiecesTable)
    .where(eq(contentPiecesTable.id, pieceId))
    .limit(1);
  if (!row) return;

  const meta = (row.pieceMetadata ?? {}) as ContentPieceMetadata;
  const next = foldAgentProgressEvent(meta.agentTeamProgress, event);

  await db
    .update(contentPiecesTable)
    .set({
      pieceMetadata: {
        ...meta,
        agentTeamProgress: next,
      },
    })
    .where(eq(contentPiecesTable.id, pieceId));
}
