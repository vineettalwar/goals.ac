import { defaultEmployeePlanner } from "./planner";
import type { AgentPlanner, AgentTool, AgentLoopContext, PlannerDecision } from "./types";

export function isLegalPlannerDecision(decision: PlannerDecision, tools: AgentTool[]): boolean {
  if (decision.type === "stop") return true;
  return tools.some((tool) => tool.name === decision.tool);
}

/** Parse a model reply into a planner decision. Invalid JSON / unknown tools → null (caller falls back). */
export function parsePlannerJson(raw: string, toolNames: Iterable<string>): PlannerDecision | null {
  const names = toolNames instanceof Set ? toolNames : new Set(toolNames);
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (obj.type === "stop") {
    const reason =
      obj.reason === "no_evidence" || obj.reason === "budget" || obj.reason === "failed" || obj.reason === "await_approval"
        ? obj.reason
        : "done";
    return { type: "stop", reason, detail: String(obj.detail ?? obj.reason ?? "stop") };
  }
  if (obj.type === "call_tool" && typeof obj.tool === "string" && names.has(obj.tool)) {
    const args =
      obj.args && typeof obj.args === "object" && !Array.isArray(obj.args)
        ? (obj.args as Record<string, unknown>)
        : {};
    return {
      type: "call_tool",
      tool: obj.tool,
      args,
      reason: typeof obj.reason === "string" && obj.reason.trim() ? obj.reason : "llm tool choice",
    };
  }
  return null;
}

export function buildPlannerChoicePrompt(ctx: AgentLoopContext, tools: AgentTool[]): string {
  const toolLines = tools.map((tool) => `- ${tool.name} (${tool.risk}, cost ${tool.creditCost}): ${tool.description}`).join("\n");
  const traj = ctx.trajectory
    .map((step) => `${step.tool ?? "stop"} ok=${step.ok ?? ""} ${step.summary ?? step.decision}`)
    .join("\n");
  return `You pick the next employee-loop tool. Reply with JSON only.
Goal: ${JSON.stringify(ctx.goal)}
Credits spent: ${ctx.creditsSpent} / ${ctx.policy.maxCredits}
Trajectory:
${traj || "(empty)"}
Tools:
${toolLines}
JSON shape: {"type":"call_tool","tool":"<name>","args":{},"reason":"..."} or {"type":"stop","reason":"done","detail":"..."}
Do not invent tool names. Prefer research tools before writes. Never pick publish_live unless the goal is publish_check.`;
}

/**
 * Interactive / chat-ready planner: try `choose`, else `defaultEmployeePlanner`.
 * Autopilot must pass `defaultEmployeePlanner` directly (no LLM) for spend control.
 */
export function createHybridPlanner(opts?: {
  choose?: (
    ctx: AgentLoopContext,
    tools: AgentTool[],
  ) => PlannerDecision | null | Promise<PlannerDecision | null>;
  fallback?: AgentPlanner;
}): AgentPlanner {
  const fallback = opts?.fallback ?? defaultEmployeePlanner;
  return async (ctx, tools) => {
    if (opts?.choose) {
      try {
        const picked = await opts.choose(ctx, tools);
        if (picked && isLegalPlannerDecision(picked, tools)) return picked;
      } catch {
        // ponytail: swallow chooser errors — deterministic planner is the spend ceiling
      }
    }
    return fallback(ctx, tools);
  };
}
