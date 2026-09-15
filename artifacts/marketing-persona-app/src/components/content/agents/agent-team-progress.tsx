"use client";

/**
 * AgentTeamProgress — one agent at a time + next step (readable names).
 */

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { AgentId, AgentStatus, AgentProgressEvent } from "@workspace/content-engine/agents/types";
import { AGENT_PIPELINE_ORDER } from "@workspace/content-engine/agents/definitions";
import { AgentTeamStage } from "@workspace/app-shell/studio/agent-team-stage";

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
  /** @deprecated unused — kept for call-site compat */
  compact?: boolean;
  className?: string;
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

export function focusAgentId(agentState: AgentTeamState, isRunning: boolean): AgentId | null {
  const active = AGENT_PIPELINE_ORDER.find((id) => {
    const s = agentState[id]?.status;
    return s === "working" || s === "starting";
  });
  if (active) return active;
  if (isRunning) {
    const pending = AGENT_PIPELINE_ORDER.find((id) => {
      const s = agentState[id]?.status;
      return !s || s === "pending";
    });
    if (pending) return pending;
  }
  for (let i = AGENT_PIPELINE_ORDER.length - 1; i >= 0; i--) {
    const id = AGENT_PIPELINE_ORDER[i]!;
    const s = agentState[id]?.status;
    if (s === "completed" || s === "failed" || s === "skipped") return id;
  }
  return AGENT_PIPELINE_ORDER[0] ?? null;
}

export function nextAgentId(agentState: AgentTeamState, current: AgentId | null): AgentId | null {
  if (!current) return null;
  const idx = AGENT_PIPELINE_ORDER.indexOf(current);
  if (idx < 0) return null;
  for (let i = idx + 1; i < AGENT_PIPELINE_ORDER.length; i++) {
    const id = AGENT_PIPELINE_ORDER[i]!;
    const s = agentState[id]?.status;
    if (!s || s === "pending") return id;
  }
  return null;
}

export function AgentTeamProgress({
  agentState,
  isRunning,
  totalElapsedMs,
  className,
}: AgentTeamProgressProps) {
  const focusId = focusAgentId(agentState, isRunning);
  const nextId = nextAgentId(agentState, focusId);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="pt-6">
        <AgentTeamStage
          agentState={agentState}
          isRunning={isRunning}
          totalElapsedMs={totalElapsedMs}
          focusId={focusId}
          nextId={nextId}
        />
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

  const hydrate = useCallback(
    (snapshot: {
      agents: AgentTeamState;
      isRunning: boolean;
      totalElapsedMs?: number;
    }) => {
      const next: AgentTeamState = {};
      for (const id of AGENT_PIPELINE_ORDER) {
        next[id] = snapshot.agents[id] ?? { status: "pending" };
      }
      setState(next);
      setIsRunning(snapshot.isRunning);
      if (snapshot.totalElapsedMs !== undefined) {
        setTotalElapsedMs(snapshot.totalElapsedMs);
      }
      if (snapshot.isRunning) {
        setStartTime((prev) => prev ?? Date.now() - (snapshot.totalElapsedMs ?? 0));
      } else {
        setStartTime(null);
      }
    },
    [],
  );

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
    hydrate,
  };
}
