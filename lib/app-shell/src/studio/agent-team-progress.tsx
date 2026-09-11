/**
 * Compact agent-team progress for the live Studio create dialog (app.goals.ac).
 * Shares event semantics with the Next Content Studio AgentTeamProgress.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Bird,
  CheckCircle2,
  Clock,
  Eye,
  Feather,
  Globe,
  Languages,
  Loader2,
  Palette,
  Search,
  SkipForward,
  Target,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  AGENT_DEFINITIONS,
  AGENT_PIPELINE_ORDER,
} from "@workspace/content-engine/agents/definitions";
import type {
  AgentId,
  AgentProgressEvent,
  AgentStatus,
} from "@workspace/content-engine/agents/types";

export type AgentTeamState = {
  [agentId: string]: {
    status: AgentStatus;
    message?: string;
    durationMs?: number;
  };
};

const AGENT_ICONS: Record<AgentId, LucideIcon> = {
  owl: Bird,
  ferret: Search,
  hummingbird: Feather,
  spider: Globe,
  fox: Target,
  mockingbird: Languages,
  hawk: Eye,
  chameleon: Palette,
};

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

function StatusIcon({ status }: { status: AgentStatus }) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (status === "working" || status === "starting") {
    return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  }
  if (status === "failed") return <XCircle className="h-4 w-4 text-red-600" />;
  if (status === "skipped") return <SkipForward className="h-4 w-4 text-muted-foreground" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}

/** Current focus agent: active → first pending → last finished. */
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

/** Next pipeline step after `current` that still has work left. */
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
}: {
  agentState: AgentTeamState;
  isRunning: boolean;
  totalElapsedMs?: number;
}) {
  const completedCount = AGENT_PIPELINE_ORDER.filter(
    (id) => agentState[id]?.status === "completed" || agentState[id]?.status === "skipped",
  ).length;
  const focusId = focusAgentId(agentState, isRunning);
  const nextId = nextAgentId(agentState, focusId);
  const focusDef = focusId ? AGENT_DEFINITIONS[focusId] : null;
  const focusState = focusId
    ? (agentState[focusId] ?? { status: "pending" as AgentStatus })
    : null;
  const FocusIcon = focusId ? AGENT_ICONS[focusId] : null;
  const nextDef = nextId ? AGENT_DEFINITIONS[nextId] : null;
  const focusIndex = focusId ? AGENT_PIPELINE_ORDER.indexOf(focusId) : -1;

  return (
    <div className="mt-6 space-y-4" aria-live="polite" aria-busy={isRunning}>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-foreground">Agent team</span>
        <span className="text-muted-foreground">
          {completedCount}/{AGENT_PIPELINE_ORDER.length}
          {totalElapsedMs !== undefined ? ` · ${formatDuration(totalElapsedMs)}` : ""}
        </span>
      </div>

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
    </div>
  );
}

export function useAgentTeamState() {
  const [state, setState] = useState<AgentTeamState>(() => {
    const initial: AgentTeamState = {};
    for (const id of AGENT_PIPELINE_ORDER) initial[id] = { status: "pending" };
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
        if (next.isRunning === false) setIsRunning(false);
        if (next.totalElapsedMs !== undefined) setTotalElapsedMs(next.totalElapsedMs);
        return next.state;
      });
    },
    [],
  );

  const reset = useCallback(() => {
    const initial: AgentTeamState = {};
    for (const id of AGENT_PIPELINE_ORDER) initial[id] = { status: "pending" };
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
      if (snapshot.totalElapsedMs !== undefined) setTotalElapsedMs(snapshot.totalElapsedMs);
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
    const interval = setInterval(() => setTotalElapsedMs(Date.now() - startTime), 200);
    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  return { state, isRunning, totalElapsedMs, handleEvent, reset, hydrate };
}
