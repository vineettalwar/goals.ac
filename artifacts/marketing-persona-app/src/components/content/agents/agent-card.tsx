"use client";

/**
 * AgentCard Component
 *
 * Visual card for a single agent showing their status, icon, and progress.
 */

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle2, XCircle, Clock, SkipForward } from "lucide-react";
import type { AgentId, AgentStatus, AgentDefinition } from "@workspace/content-engine";
import { AGENT_DEFINITIONS } from "@workspace/content-engine";
import { getAgentIcon } from "./agent-icons";

interface AgentCardProps {
  agentId: AgentId;
  status: AgentStatus;
  message?: string;
  durationMs?: number;
  className?: string;
  compact?: boolean;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function getStatusColor(status: AgentStatus): string {
  switch (status) {
    case "completed":
      return "text-green-600 dark:text-green-400";
    case "working":
    case "starting":
      return "text-blue-600 dark:text-blue-400";
    case "failed":
      return "text-red-600 dark:text-red-400";
    case "skipped":
      return "text-muted-foreground";
    default:
      return "text-muted-foreground";
  }
}

function getStatusBgColor(status: AgentStatus): string {
  switch (status) {
    case "completed":
      return "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800";
    case "working":
    case "starting":
      return "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800";
    case "failed":
      return "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800";
    case "skipped":
      return "bg-muted/50 border-muted";
    default:
      return "bg-card border-border";
  }
}

function StatusIndicator({ status }: { status: AgentStatus }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
    case "working":
    case "starting":
      return <Spinner className="h-4 w-4" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
    case "skipped":
      return <SkipForward className="h-4 w-4 text-muted-foreground" />;
    case "pending":
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    default:
      return null;
  }
}

export function AgentCard({
  agentId,
  status,
  message,
  durationMs,
  className,
  compact = false,
}: AgentCardProps) {
  const agent: AgentDefinition = AGENT_DEFINITIONS[agentId];
  const Icon = getAgentIcon(agentId);
  const isActive = status === "working" || status === "starting";

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
          getStatusBgColor(status),
          isActive && "ring-2 ring-blue-500/20",
          className,
        )}
      >
        <Icon className={cn("h-4 w-4", getStatusColor(status))} />
        <span className="text-sm font-medium">{agent.name}</span>
        <StatusIndicator status={status} />
        {durationMs !== undefined && status === "completed" && (
          <span className="text-xs text-muted-foreground ml-auto">
            {formatDuration(durationMs)}
          </span>
        )}
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "p-4 transition-all",
        getStatusBgColor(status),
        isActive && "ring-2 ring-blue-500/20 shadow-md",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            isActive ? "bg-blue-100 dark:bg-blue-900/50" : "bg-muted",
          )}
        >
          <Icon className={cn("h-5 w-5", getStatusColor(status))} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">{agent.name}</h4>
            <Badge variant="outline" className="text-xs">
              {agent.role}
            </Badge>
            <StatusIndicator status={status} />
          </div>

          <p className="text-xs text-muted-foreground mt-1">{agent.personality}</p>

          {message && (
            <p
              className={cn(
                "text-sm mt-2",
                isActive ? "text-blue-700 dark:text-blue-300" : "text-foreground",
              )}
            >
              {message}
            </p>
          )}

          {durationMs !== undefined && status === "completed" && (
            <p className="text-xs text-muted-foreground mt-1">
              Completed in {formatDuration(durationMs)}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
