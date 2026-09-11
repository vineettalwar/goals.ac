"use client";

/**
 * AgentTeamProgress — one agent at a time + next step (readable names).
 */

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Loader2, SkipForward, XCircle } from "lucide-react";
import type { AgentId, AgentStatus, AgentProgressEvent } from "@workspace/content-engine";
import { AGENT_PIPELINE_ORDER, AGENT_DEFINITIONS } from "@workspace/content-engine";
import { getAgentIcon } from "./agent-icons";

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

export function focusAgentId(agentState: AgentTeamState, isRunning: boolean): AgentId | null {
  const active = AGENT_PIPELINE_ORDER.find((id) => {
    const s = agentState[id]?.status;
    return s === "working" || s === "starting";
  });
  if (active) return active;
  if (isRunning) {
    return (
      AGENT_PIPELINE_ORDER.find((id) => {
        const s = agentState[id]?.status;
        return !s || s === "pending";
      }) ?? null
    );
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

function StatusIcon({ status }: { status: AgentStatus }) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (status === "working" || status === "starting") {
    return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  }
  if (status === "failed") return <XCircle className="h-4 w-4 text-red-600" />;
  if (status === "skipped") return <SkipForward className="h-4 w-4 text-muted-foreground" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}

export function AgentTeamProgress({
  agentState,
  isRunning,
  totalElapsedMs,
  className,
}: AgentTeamProgressProps) {
  const completedCount = AGENT_PIPELINE_ORDER.filter(
    (id) => agentState[id]?.status === "completed" || agentState[id]?.status === "skipped",
  ).length;
  const failedCount = AGENT_PIPELINE_ORDER.filter(
    (id) => agentState[id]?.status === "failed",
  ).length;
  const focusId = focusAgentId(agentState, isRunning);
  const nextId = nextAgentId(agentState, focusId);
  const focusDef = focusId ? AGENT_DEFINITIONS[focusId] : null;
  const focusState = focusId
    ? (agentState[focusId] ?? { status: "pending" as AgentStatus })
    : null;
  const FocusIcon = focusId ? getAgentIcon(focusId) : null;
  const nextDef = nextId ? AGENT_DEFINITIONS[nextId] : null;
  const focusIndex = focusId ? AGENT_PIPELINE_ORDER.indexOf(focusId) : -1;

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
      </CardHeader>

      <CardContent className="space-y-4 pt-0" aria-live="polite" aria-busy={isRunning}>
        {focusDef && focusState && FocusIcon ? (
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
            <div className="flex items-center gap-3">
              <FocusIcon className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {focusDef.name}
                  <span className="font-normal text-muted-foreground"> · {focusDef.role}</span>
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {focusState.message ||
                    (focusState.status === "pending"
                      ? "Waiting to start…"
                      : focusState.status === "completed"
                        ? "Done"
                        : `${focusDef.name} is working…`)}
                </p>
              </div>
              <StatusIcon status={focusState.status} />
            </div>
          </div>
        ) : isRunning ? (
          <p className="text-sm text-muted-foreground">Assembling the team…</p>
        ) : null}

        {nextDef ? (
          <p className="text-sm text-muted-foreground">
            Next:{" "}
            <span className="font-medium text-foreground">
              {nextDef.name}
              <span className="font-normal text-muted-foreground"> · {nextDef.role}</span>
            </span>
          </p>
        ) : isRunning && focusId ? (
          <p className="text-sm text-muted-foreground">Next: finishing up…</p>
        ) : null}

        <div className="flex items-center gap-1.5" aria-hidden="true">
          {AGENT_PIPELINE_ORDER.map((id, i) => {
            const s = agentState[id]?.status ?? "pending";
            const done = s === "completed" || s === "skipped";
            const active = i === focusIndex;
            return (
              <span
                key={id}
                className={
                  active
                    ? "h-1.5 flex-1 rounded-full bg-primary"
                    : done
                      ? "h-1.5 flex-1 rounded-full bg-emerald-500/70"
                      : "h-1.5 flex-1 rounded-full bg-border"
                }
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
