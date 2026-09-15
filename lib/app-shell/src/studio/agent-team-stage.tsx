"use client";

import type { ComponentType } from "react";
import {
  Bird,
  CheckCircle2,
  Clock,
  Eye,
  Feather,
  Globe,
  Languages,
  Loader2,
  Search,
  SkipForward,
  Target,
  XCircle,
  type LucideProps,
} from "lucide-react";
import {
  AGENT_DEFINITIONS,
  AGENT_PIPELINE_ORDER,
  getCompletionMessage,
} from "@workspace/content-engine/agents/definitions";
import type { AgentId, AgentStatus } from "@workspace/content-engine/agents/types";
import { ChameleonIcon } from "./chameleon-icon";

type AgentTeamState = {
  [agentId: string]: {
    status: AgentStatus;
    message?: string;
    durationMs?: number;
  };
};

const AGENT_ICONS: Record<AgentId, ComponentType<LucideProps>> = {
  owl: Bird,
  ferret: Search,
  hummingbird: Feather,
  spider: Globe,
  fox: Target,
  mockingbird: Languages,
  hawk: Eye,
  chameleon: ChameleonIcon,
};

export type SceneEntry = {
  id: string;
  title: string;
  detail: string;
};

export function behindTheScenesEntries(agentState: AgentTeamState): SceneEntry[] {
  return AGENT_PIPELINE_ORDER.filter((id) => {
    const s = agentState[id]?.status;
    return s === "completed" || s === "skipped";
  })
    .slice(-5)
    .map((id) => ({
      id: `done-${id}`,
      title: AGENT_DEFINITIONS[id].name,
      detail: agentState[id]?.message || getCompletionMessage(id),
    }));
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function StatusIcon({ status }: { status: AgentStatus }) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (status === "working" || status === "starting") {
    return <Loader2 className="h-4 w-4 motion-safe:animate-spin text-primary" />;
  }
  if (status === "failed") return <XCircle className="h-4 w-4 text-red-600" />;
  if (status === "skipped") return <SkipForward className="h-4 w-4 text-muted-foreground" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}

function AgentPortrait({
  agentId,
  alt,
  className,
}: {
  agentId: AgentId;
  alt: string;
  className: string;
}) {
  const Icon = AGENT_ICONS[agentId];
  return (
    <span className={`relative inline-flex overflow-hidden rounded-full bg-secondary ${className}`}>
      <Icon className="absolute inset-[22%] text-primary/60" aria-hidden />
      <img
        src={`/agents/${agentId}.webp`}
        alt={alt}
        width={128}
        height={128}
        className="relative z-10 h-full w-full object-cover"
      />
    </span>
  );
}

function statusCopy(status: AgentStatus, message?: string): string {
  if (message) return message;
  if (status === "completed") return "Done";
  if (status === "pending") return "Waiting";
  if (status === "failed") return "Failed";
  if (status === "skipped") return "Skipped";
  return "Working";
}

export function AgentTeamStage({
  agentState,
  isRunning,
  totalElapsedMs,
  focusId,
  nextId,
}: {
  agentState: AgentTeamState;
  isRunning: boolean;
  totalElapsedMs?: number;
  focusId: AgentId | null;
  nextId: AgentId | null;
}) {
  const completedCount = AGENT_PIPELINE_ORDER.filter((id) => {
    const s = agentState[id]?.status;
    return s === "completed" || s === "skipped";
  }).length;
  const failedCount = AGENT_PIPELINE_ORDER.filter((id) => agentState[id]?.status === "failed").length;
  const focusDef = focusId ? AGENT_DEFINITIONS[focusId] : null;
  const focusState = focusId ? (agentState[focusId] ?? { status: "pending" as AgentStatus }) : null;
  const nextDef = nextId ? AGENT_DEFINITIONS[nextId] : null;
  const focusIndex = focusId ? AGENT_PIPELINE_ORDER.indexOf(focusId) : -1;
  const isFocusLive =
    focusState?.status === "working" ||
    focusState?.status === "starting" ||
    (isRunning && focusState?.status === "pending");
  const finishing =
    isRunning &&
    !isFocusLive &&
    completedCount + failedCount === AGENT_PIPELINE_ORDER.length &&
    AGENT_PIPELINE_ORDER.length > 0;

  const scene = behindTheScenesEntries(agentState);

  return (
    <div className="space-y-4" aria-live="polite" aria-busy={isRunning}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-base font-semibold text-foreground">Agent Team</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isRunning ? (
            <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-foreground">
              Working
            </span>
          ) : null}
          <span>
            {completedCount}/{AGENT_PIPELINE_ORDER.length}
          </span>
          {failedCount > 0 ? <span className="text-destructive">{failedCount} failed</span> : null}
          {totalElapsedMs !== undefined ? <span>{formatDuration(totalElapsedMs)}</span> : null}
        </div>
      </div>

      <ul className="flex items-end gap-1.5" aria-label="Agent roster">
        {AGENT_PIPELINE_ORDER.map((id, i) => {
          const s = agentState[id]?.status ?? "pending";
          const def = AGENT_DEFINITIONS[id];
          const active = i === focusIndex;
          const done = s === "completed" || s === "skipped";
          return (
            <li key={id} className="min-w-0 flex-1" title={`${def.name} · ${def.role}`}>
              <span
                className={
                  active
                    ? "mx-auto block w-fit rounded-full ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : done
                      ? "mx-auto block w-fit opacity-100"
                      : "mx-auto block w-fit opacity-40"
                }
              >
                <AgentPortrait
                  agentId={id}
                  alt=""
                  className={active ? "h-10 w-10" : "h-8 w-8"}
                />
              </span>
            </li>
          );
        })}
      </ul>

      {focusDef && focusState ? (
        <div className="rounded-lg border border-primary/25 bg-primary/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className={isFocusLive ? "agent-portrait-live inline-flex" : "inline-flex"}>
              <AgentPortrait
                agentId={focusDef.id}
                alt={focusDef.name}
                className="h-14 w-14 shrink-0"
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                {focusDef.name}
                <span className="font-normal text-muted-foreground"> · {focusDef.role}</span>
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {finishing ? "Polishing and saving the draft…" : statusCopy(focusState.status, focusState.message)}
              </p>
            </div>
            <StatusIcon status={finishing ? "working" : focusState.status} />
          </div>
        </div>
      ) : isRunning ? (
        <p className="text-sm text-muted-foreground">Polishing and saving the draft…</p>
      ) : null}

      {scene.length > 0 ? (
        <ul className="space-y-1.5 border-t border-border pt-3">
          {scene.map((entry) => (
            <li key={entry.id} className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{entry.title}</span>
              <span> — {entry.detail}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {nextDef ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <AgentPortrait agentId={nextDef.id} alt="" className="h-6 w-6" />
          Next:{" "}
          <span className="font-medium text-foreground">
            {nextDef.name}
            <span className="font-normal text-muted-foreground"> · {nextDef.role}</span>
          </span>
        </p>
      ) : isRunning && focusId ? (
        <p className="text-sm text-muted-foreground">Finishing…</p>
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
                  ? "h-1.5 flex-1 rounded-full bg-primary agent-bar-live"
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
