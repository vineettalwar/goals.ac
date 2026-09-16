import type { AgentPolicy, AgentRunRecord, PendingApproval, TrajectoryStep } from "./types";

export type PresentedTrajectoryStep = TrajectoryStep;

export type PresentedAgentRun = {
  id?: number;
  websiteProjectId: number;
  userId?: number | null;
  goalKind: string;
  goal: AgentRunRecord["goal"] | Record<string, unknown>;
  status: AgentRunRecord["status"] | string;
  stopReason: string | null;
  creditsSpent: number;
  contentPieceId?: number | null;
  pendingApproval: PendingApproval | null;
  trajectory: PresentedTrajectoryStep[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type PresentedAgentRunListItem = Omit<PresentedAgentRun, "trajectory" | "goal"> & {
  stepCount: number;
  lastStep: PresentedTrajectoryStep | null;
  failed: boolean;
  awaitingApproval: boolean;
};

type RunLike = {
  id?: number | null;
  websiteProjectId: number;
  userId?: number | null;
  goalKind?: string | null;
  goal?: AgentRunRecord["goal"] | Record<string, unknown> | null;
  status: string;
  stopReason?: string | null;
  policy?: AgentPolicy | Record<string, unknown> | null;
  trajectory?: unknown[] | null;
  creditsSpent?: number | null;
  contentPieceId?: number | null;
  pendingApproval?: PendingApproval | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

function asTrajectory(raw: unknown[] | null | undefined): TrajectoryStep[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((step): step is TrajectoryStep => Boolean(step) && typeof step === "object");
}

function pendingFrom(run: RunLike): PendingApproval | null {
  if (run.pendingApproval) return run.pendingApproval;
  const policy = run.policy as AgentPolicy | undefined;
  return policy?.pendingApproval ?? null;
}

export function presentAgentRun(run: RunLike): PresentedAgentRun {
  const goal = (run.goal ?? {}) as AgentRunRecord["goal"] | Record<string, unknown>;
  const goalKind =
    run.goalKind ??
    (typeof goal === "object" && goal && "kind" in goal ? String((goal as { kind?: unknown }).kind ?? "") : "");
  return {
    id: run.id ?? undefined,
    websiteProjectId: run.websiteProjectId,
    userId: run.userId,
    goalKind,
    goal,
    status: run.status,
    stopReason: run.stopReason ?? null,
    creditsSpent: run.creditsSpent ?? 0,
    contentPieceId: run.contentPieceId,
    pendingApproval: pendingFrom(run),
    trajectory: asTrajectory(run.trajectory),
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
  };
}

export function presentAgentRunListItem(run: RunLike): PresentedAgentRunListItem {
  const full = presentAgentRun(run);
  const lastStep = full.trajectory.at(-1) ?? null;
  return {
    id: full.id,
    websiteProjectId: full.websiteProjectId,
    userId: full.userId,
    goalKind: full.goalKind,
    status: full.status,
    stopReason: full.stopReason,
    creditsSpent: full.creditsSpent,
    contentPieceId: full.contentPieceId,
    pendingApproval: full.pendingApproval,
    createdAt: full.createdAt,
    updatedAt: full.updatedAt,
    stepCount: full.trajectory.length,
    lastStep,
    failed: full.status === "failed" || full.status === "budget_exhausted" || full.status === "no_evidence",
    awaitingApproval: full.status === "awaiting_approval" || Boolean(full.pendingApproval),
  };
}
