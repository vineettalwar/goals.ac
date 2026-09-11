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
  type AgentId,
  type AgentProgressEvent,
  type AgentStatus,
} from "@workspace/content-engine";

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
  if (status === "completed") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />;
  if (status === "working" || status === "starting") {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />;
  }
  if (status === "failed") return <XCircle className="h-3.5 w-3.5 text-red-600" />;
  if (status === "skipped") return <SkipForward className="h-3.5 w-3.5 text-muted-foreground" />;
  return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
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
    (id) => agentState[id]?.status === "completed",
  ).length;
  const activeAgent = AGENT_PIPELINE_ORDER.find(
    (id) => agentState[id]?.status === "working" || agentState[id]?.status === "starting",
  );

  return (
    <div className="mt-6 space-y-3" aria-live="polite" aria-busy={isRunning}>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-foreground">Agent team</span>
        <span className="text-muted-foreground">
          {completedCount}/{AGENT_PIPELINE_ORDER.length}
          {totalElapsedMs !== undefined ? ` · ${formatDuration(totalElapsedMs)}` : ""}
        </span>
      </div>
      {activeAgent ? (
        <p className="text-sm text-muted-foreground">
          {agentState[activeAgent]?.message ||
            `${AGENT_DEFINITIONS[activeAgent].name} is working…`}
        </p>
      ) : isRunning ? (
        <p className="text-sm text-muted-foreground">Assembling the team…</p>
      ) : null}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {AGENT_PIPELINE_ORDER.map((agentId) => {
          const def = AGENT_DEFINITIONS[agentId];
          const state = agentState[agentId] ?? { status: "pending" as AgentStatus };
          const Icon = AGENT_ICONS[agentId];
          const active = state.status === "working" || state.status === "starting";
          return (
            <div
              key={agentId}
              className={
                active
                  ? "flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-2.5 py-2"
                  : "flex items-center gap-2 rounded-lg border border-border px-2.5 py-2"
              }
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-xs font-medium">{def.name}</span>
              <StatusIcon status={state.status} />
            </div>
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

  useEffect(() => {
    if (!isRunning || !startTime) return;
    const interval = setInterval(() => setTotalElapsedMs(Date.now() - startTime), 200);
    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  return { state, isRunning, totalElapsedMs, handleEvent, reset };
}
