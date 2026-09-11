"use client";

/**
 * AgentTeamProgress Component
 *
 * Live progress view showing the agent team pipeline.
 * Displays all agents with their current status and progress messages.
 */

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AgentCard } from "./agent-card";
import type { AgentId, AgentStatus, AgentProgressEvent } from "@workspace/content-engine";
import { AGENT_PIPELINE_ORDER, AGENT_DEFINITIONS } from "@workspace/content-engine";

export interface AgentTeamState {
  [agentId: string]: {
    status: AgentStatus;
    message?: string;
    durationMs?: number;
  };
}

interface AgentTeamProgressProps {
  agentState: AgentTeamState;
  isRunning: boolean;
  totalElapsedMs?: number;
  compact?: boolean;
  className?: string;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

export function applyAgentTeamEvent(
  prev: AgentTeamState,
  event: AgentProgressEvent | { type: string; [key: string]: unknown },
): { state: AgentTeamState; isRunning?: boolean; totalElapsedMs?: number; resetStart?: boolean } {
  if ("type" in event && typeof event.type === "string") {
    if (event.type === "pipeline_start") {
      const reset: AgentTeamState = {};
      for (const id of AGENT_PIPELINE_ORDER) {
        reset[id] = { status: "pending" };
      }
      return { state: reset, isRunning: true, resetStart: true };
    }
    if (event.type === "pipeline_complete") {
      return {
        state: prev,
        isRunning: false,
        totalElapsedMs: event.totalDurationMs as number,
      };
    }
    if (event.type === "agent" && event.agent && event.status) {
      const agentId = event.agent as AgentId;
      return {
        state: {
          ...prev,
          [agentId]: {
            status: event.status as AgentStatus,
            message: (event.message as string) ?? "",
            durationMs: event.durationMs as number | undefined,
          },
        },
      };
    }
  }

  if ("agent" in event && "status" in event) {
    const e = event as AgentProgressEvent;
    return {
      state: {
        ...prev,
        [e.agent]: {
          status: e.status,
          message: e.message,
          durationMs: e.durationMs,
        },
      },
    };
  }

  return { state: prev };
}

export function AgentTeamProgress({
  agentState,
  isRunning,
  totalElapsedMs,
  compact = false,
  className,
}: AgentTeamProgressProps) {
  const completedCount = AGENT_PIPELINE_ORDER.filter(
    (id) => agentState[id]?.status === "completed",
  ).length;
  const failedCount = AGENT_PIPELINE_ORDER.filter(
    (id) => agentState[id]?.status === "failed",
  ).length;
  const activeAgent = AGENT_PIPELINE_ORDER.find(
    (id) => agentState[id]?.status === "working" || agentState[id]?.status === "starting",
  );

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Agent Team</CardTitle>
          <div className="flex items-center gap-2">
            {isRunning && (
              <Badge variant="secondary" className="animate-pulse">
                Working
              </Badge>
            )}
            <Badge variant="outline">
              {completedCount}/{AGENT_PIPELINE_ORDER.length}
            </Badge>
            {failedCount > 0 && (
              <Badge variant="destructive">{failedCount} failed</Badge>
            )}
            {totalElapsedMs !== undefined && (
              <span className="text-xs text-muted-foreground">
                {formatDuration(totalElapsedMs)}
              </span>
            )}
          </div>
        </div>
        {activeAgent && (
          <p className="text-sm text-muted-foreground">
            {agentState[activeAgent]?.message || `${AGENT_DEFINITIONS[activeAgent].name} is working...`}
          </p>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <div className={cn("grid gap-2", compact ? "grid-cols-4" : "grid-cols-2 lg:grid-cols-4")}>
          {AGENT_PIPELINE_ORDER.map((agentId) => {
            const state = agentState[agentId] || { status: "pending" as AgentStatus };
            return (
              <AgentCard
                key={agentId}
                agentId={agentId}
                status={state.status}
                message={compact ? undefined : state.message}
                durationMs={state.durationMs}
                compact={compact}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function useAgentTeamState() {
  const [state, setState] = useState<AgentTeamState>(() => {
    const initial: AgentTeamState = {};
    for (const id of AGENT_PIPELINE_ORDER) {
      initial[id] = { status: "pending" };
    }
    return initial;
  });
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [totalElapsedMs, setTotalElapsedMs] = useState<number | undefined>();

  const handleEvent = useCallback(
    (event: AgentProgressEvent | { type: string; [key: string]: unknown }) => {
      setState((prev) => {
        const next = applyAgentTeamEvent(prev, event);
        if (next.resetStart) {
          setIsRunning(true);
          setStartTime(Date.now());
          setTotalElapsedMs(undefined);
        }
        if (next.isRunning === false) {
          setIsRunning(false);
        }
        if (next.totalElapsedMs !== undefined) {
          setTotalElapsedMs(next.totalElapsedMs);
        }
        return next.state;
      });
    },
    [],
  );

  const reset = useCallback(() => {
    const initial: AgentTeamState = {};
    for (const id of AGENT_PIPELINE_ORDER) {
      initial[id] = { status: "pending" };
    }
    setState(initial);
    setIsRunning(false);
    setStartTime(null);
    setTotalElapsedMs(undefined);
  }, []);

  useEffect(() => {
    if (!isRunning || !startTime) return;
    const interval = setInterval(() => {
      setTotalElapsedMs(Date.now() - startTime);
    }, 100);
    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  return {
    state,
    isRunning,
    totalElapsedMs,
    handleEvent,
    reset,
  };
}
