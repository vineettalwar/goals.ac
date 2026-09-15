export type ToolRisk = "read" | "write" | "publish_live";

export type EvidenceRef = {
  source: string;
  url?: string;
  verified: boolean;
};

export type AgentToolResult = {
  ok: boolean;
  summary: string;
  evidenceRefs: EvidenceRef[];
  data?: unknown;
  error?: string;
  hasToolEvidence: boolean;
};

export type AgentLoopCredentials = {
  gsc: boolean;
  keywords: boolean;
  competitors: boolean;
  serp: boolean;
};

export type AgentGoalKind =
  | "research_then_draft"
  | "opportunity_scan"
  | "execute_action"
  | "publish_check"
  | "chat_turn";

export type AgentGoal = {
  kind: AgentGoalKind;
  text: string;
  projectId: number;
  keyword?: string;
  contentPieceId?: number;
  actionItemId?: number;
  actionType?: string;
  targetUrl?: string;
};

export type AgentPolicy = {
  /** Live CMS publish always waits unless this is true (tests / explicit override). */
  allowLivePublish: boolean;
  approveFirstForLivePublish: boolean;
  maxCredits: number;
};

export const DEFAULT_AGENT_POLICY: AgentPolicy = {
  allowLivePublish: false,
  approveFirstForLivePublish: true,
  maxCredits: 20,
};

export type TrajectoryStep = {
  at: string;
  decision: string;
  tool?: string;
  argsSummary?: string;
  evidenceRefs?: EvidenceRef[];
  ok?: boolean;
  summary?: string;
  creditsSpent?: number;
};

export type AgentRunRecord = {
  id?: number;
  websiteProjectId: number;
  userId?: number | null;
  goal: AgentGoal;
  status:
    | "running"
    | "awaiting_approval"
    | "completed"
    | "failed"
    | "budget_exhausted"
    | "no_evidence";
  stopReason: string | null;
  policy: AgentPolicy;
  trajectory: TrajectoryStep[];
  creditsSpent: number;
  contentPieceId?: number | null;
};

export type AgentLoopContext = {
  goal: AgentGoal;
  credentials: AgentLoopCredentials;
  policy: AgentPolicy;
  trajectory: TrajectoryStep[];
  creditsSpent: number;
  stepIndex: number;
};

export type AgentTool = {
  name: string;
  description: string;
  risk: ToolRisk;
  creditCost: number;
  execute: (args: Record<string, unknown>, ctx: AgentLoopContext) => Promise<AgentToolResult>;
};

export type PlannerDecision =
  | { type: "call_tool"; tool: string; args: Record<string, unknown>; reason: string }
  | {
      type: "stop";
      reason: "done" | "budget" | "no_evidence" | "await_approval" | "failed";
      detail: string;
    };

export type AgentPlanner = (ctx: AgentLoopContext, tools: AgentTool[]) => PlannerDecision | Promise<PlannerDecision>;

export type TrajectorySink = {
  save: (run: AgentRunRecord) => Promise<void>;
};

export type RunAgentLoopInput = {
  goal: AgentGoal;
  tools: AgentTool[];
  credentials?: Partial<AgentLoopCredentials>;
  policy?: Partial<AgentPolicy>;
  stepBudget: number;
  sink?: TrajectorySink;
  userId?: number | null;
  runId?: number;
  planner?: AgentPlanner;
};

export type RunAgentLoopResult = AgentRunRecord;

export function emptyCredentials(): AgentLoopCredentials {
  return { gsc: false, keywords: false, competitors: false, serp: false };
}

export function summarizeArgs(args: Record<string, unknown>): string {
  const keys = Object.keys(args).slice(0, 8);
  const parts = keys.map((key) => {
    const value = args[key];
    if (value == null) return `${key}=`;
    if (typeof value === "string") return `${key}=${value.slice(0, 80)}`;
    if (typeof value === "number" || typeof value === "boolean") return `${key}=${value}`;
    return `${key}=[${typeof value}]`;
  });
  return parts.join(" ");
}

/** Verified flags are only legal when a tool returned matching evidence. */
export function sanitizeVerifiedFlags(result: AgentToolResult): AgentToolResult {
  if (result.hasToolEvidence && result.evidenceRefs.some((ref) => ref.verified)) {
    return {
      ...result,
      evidenceRefs: result.evidenceRefs.map((ref) => ({
        ...ref,
        verified: Boolean(ref.verified && ref.source),
      })),
    };
  }
  return {
    ...result,
    hasToolEvidence: false,
    evidenceRefs: result.evidenceRefs.map((ref) => ({ ...ref, verified: false })),
  };
}

export function trajectoryHasVerifiedEvidence(trajectory: TrajectoryStep[]): boolean {
  return trajectory.some((step) => step.evidenceRefs?.some((ref) => ref.verified));
}
