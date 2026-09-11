"use client";

/**
 * AgentTimeline Component
 *
 * Vertical timeline view of agent pipeline execution.
 * Shows completed stages with their outputs and timing.
 */

import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import type { AgentId, AgentStatus, AgentStageResult } from "@workspace/content-engine";
import { AGENT_DEFINITIONS, AGENT_PIPELINE_ORDER } from "@workspace/content-engine";
import { getAgentIcon } from "./agent-icons";
import type { AgentTeamState } from "./agent-team-progress";

interface AgentTimelineProps {
  /** State of all agents */
  agentState: AgentTeamState;
  /** Optional detailed stage results */
  stageResults?: AgentStageResult[];
  className?: string;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function TimelineIcon({ status }: { status: AgentStatus }) {
  switch (status) {
    case "completed":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
        </div>
      );
    case "working":
    case "starting":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
          <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />
        </div>
      );
    case "failed":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
          <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
        </div>
      );
    case "skipped":
    case "pending":
    default:
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          <Clock className="h-4 w-4 text-muted-foreground" />
        </div>
      );
  }
}

export function AgentTimeline({
  agentState,
  stageResults,
  className,
}: AgentTimelineProps) {
  return (
    <div className={cn("relative", className)}>
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

      <div className="space-y-4">
        {AGENT_PIPELINE_ORDER.map((agentId, index) => {
          const agent = AGENT_DEFINITIONS[agentId];
          const state = agentState[agentId] || { status: "pending" as AgentStatus };
          const stageResult = stageResults?.find((r) => r.agentId === agentId);
          const Icon = getAgentIcon(agentId);
          const isActive = state.status === "working" || state.status === "starting";
          const isCompleted = state.status === "completed";
          const isFailed = state.status === "failed";

          return (
            <div
              key={agentId}
              className={cn(
                "relative pl-12 pb-4",
                index === AGENT_PIPELINE_ORDER.length - 1 && "pb-0",
              )}
            >
              {/* Timeline node */}
              <div className="absolute left-0 top-0">
                <TimelineIcon status={state.status} />
              </div>

              {/* Content */}
              <div
                className={cn(
                  "rounded-lg border p-3 transition-all",
                  isActive && "border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/30",
                  isCompleted && "border-green-200 dark:border-green-800",
                  isFailed && "border-red-200 dark:border-red-800",
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{agent.name}</span>
                  <span className="text-xs text-muted-foreground">({agent.role})</span>
                  {state.durationMs !== undefined && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatDuration(state.durationMs)}
                    </span>
                  )}
                </div>

                {state.message && (
                  <p
                    className={cn(
                      "text-sm mt-1",
                      isActive && "text-blue-700 dark:text-blue-300",
                      isFailed && "text-red-700 dark:text-red-300",
                    )}
                  >
                    {state.message}
                  </p>
                )}

                {stageResult?.error && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    Error: {stageResult.error}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
