import { defaultEmployeePlanner } from "./planner";
import {
  DEFAULT_AGENT_POLICY,
  emptyCredentials,
  sanitizeVerifiedFlags,
  summarizeArgs,
  type AgentLoopContext,
  type AgentRunRecord,
  type RunAgentLoopInput,
  type RunAgentLoopResult,
  type TrajectorySink,
  type TrajectoryStep,
} from "./types";

export async function runAgentLoop(input: RunAgentLoopInput): Promise<RunAgentLoopResult> {
  const policy = { ...DEFAULT_AGENT_POLICY, ...input.policy };
  const credentials = { ...emptyCredentials(), ...input.credentials };
  const planner = input.planner ?? defaultEmployeePlanner;
  const tools = input.tools;
  const toolByName = new Map(tools.map((tool) => [tool.name, tool]));

  const run: AgentRunRecord = {
    id: input.runId,
    websiteProjectId: input.goal.projectId,
    userId: input.userId ?? null,
    goal: input.goal,
    status: "running",
    stopReason: null,
    policy,
    trajectory: [],
    creditsSpent: 0,
    contentPieceId: input.goal.contentPieceId ?? null,
  };

  const persist = async () => {
    if (input.sink) await input.sink.save(run);
  };

  await persist();

  const budget = Math.max(0, input.stepBudget);

  for (let stepIndex = 0; stepIndex < budget; stepIndex++) {
    if (run.creditsSpent >= policy.maxCredits) {
      run.status = "budget_exhausted";
      run.stopReason = "Credit cap reached";
      run.trajectory.push({
        at: new Date().toISOString(),
        decision: "stop:budget credits",
        creditsSpent: run.creditsSpent,
      });
      await persist();
      return run;
    }

    const ctx: AgentLoopContext = {
      goal: input.goal,
      credentials,
      policy,
      trajectory: run.trajectory,
      creditsSpent: run.creditsSpent,
      stepIndex,
    };

    const decision = await planner(ctx, tools);

    if (decision.type === "stop") {
      if (decision.reason === "budget") run.status = "budget_exhausted";
      else if (decision.reason === "no_evidence") run.status = "no_evidence";
      else if (decision.reason === "await_approval") run.status = "awaiting_approval";
      else if (decision.reason === "failed") run.status = "failed";
      else run.status = "completed";
      run.stopReason = decision.detail;
      run.trajectory.push({
        at: new Date().toISOString(),
        decision: `stop:${decision.reason}`,
        summary: decision.detail,
        creditsSpent: run.creditsSpent,
      });
      await persist();
      return run;
    }

    const tool = toolByName.get(decision.tool);
    if (!tool) {
      run.status = "failed";
      run.stopReason = `Unknown tool ${decision.tool}`;
      run.trajectory.push({
        at: new Date().toISOString(),
        decision: decision.reason,
        tool: decision.tool,
        summary: run.stopReason,
        ok: false,
      });
      await persist();
      return run;
    }

    if (tool.risk === "publish_live" && (policy.approveFirstForLivePublish || !policy.allowLivePublish)) {
      run.status = "awaiting_approval";
      run.stopReason = "Live publish requires human approval";
      const gateStep: TrajectoryStep = {
        at: new Date().toISOString(),
        decision: decision.reason,
        tool: tool.name,
        argsSummary: summarizeArgs(decision.args),
        ok: false,
        summary: run.stopReason,
        creditsSpent: run.creditsSpent,
      };
      run.trajectory.push(gateStep);
      await persist();
      return run;
    }

    const raw = await tool.execute(decision.args, ctx);
    const result = sanitizeVerifiedFlags(raw);
    run.creditsSpent += tool.creditCost;
    run.trajectory.push({
      at: new Date().toISOString(),
      decision: decision.reason,
      tool: tool.name,
      argsSummary: summarizeArgs(decision.args),
      evidenceRefs: result.evidenceRefs,
      ok: result.ok,
      summary: result.summary,
      creditsSpent: run.creditsSpent,
    });
    await persist();

    const pieceId = contentPieceIdFromToolData(result.data);
    if (pieceId) {
      run.contentPieceId = pieceId;
      await persist();
    }

    if (!result.ok && tool.risk !== "read") {
      run.status = "failed";
      run.stopReason = result.error ?? result.summary;
      await persist();
      return run;
    }
  }

  run.status = "budget_exhausted";
  run.stopReason = `Step budget ${budget} exhausted`;
  run.trajectory.push({
    at: new Date().toISOString(),
    decision: "stop:budget steps",
    summary: run.stopReason,
    creditsSpent: run.creditsSpent,
  });
  await persist();
  return run;
}

function contentPieceIdFromToolData(data: unknown): number | undefined {
  if (!data || typeof data !== "object") return undefined;
  const raw = (data as { contentPieceId?: unknown }).contentPieceId;
  const id = typeof raw === "number" ? raw : Number(raw);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

export function memoryTrajectorySink(): TrajectorySink & { runs: AgentRunRecord[] } {
  const runs: AgentRunRecord[] = [];
  return {
    runs,
    async save(run) {
      const copy = structuredClone(run);
      const idx = runs.findIndex((row) => row.id != null && row.id === copy.id);
      if (idx >= 0) runs[idx] = copy;
      else runs.push(copy);
    },
  };
}
