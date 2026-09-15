import type { AgentPlanner, AgentTool, PlannerDecision } from "./types";
import { trajectoryHasVerifiedEvidence } from "./types";

function called(ctx: { trajectory: Array<{ tool?: string; ok?: boolean }> }, name: string): boolean {
  return ctx.trajectory.some((step) => step.tool === name && step.ok === true);
}

function hasTool(tools: AgentTool[], name: string): boolean {
  return tools.some((tool) => tool.name === name);
}

/**
 * Deterministic employee planner. No named mascot stages.
 * Research tools first, then one generate/readiness/publish step, then stop.
 */
export const defaultEmployeePlanner: AgentPlanner = (ctx, tools): PlannerDecision => {
  const { goal } = ctx;

  if (goal.kind === "chat_turn") {
    if (hasTool(tools, "site_context") && !called(ctx, "site_context")) {
      return { type: "call_tool", tool: "site_context", args: { projectId: goal.projectId }, reason: "Load project/brand context" };
    }
    if (hasTool(tools, "gsc_query") && !called(ctx, "gsc_query")) {
      return {
        type: "call_tool",
        tool: "gsc_query",
        args: { projectId: goal.projectId, keyword: goal.keyword },
        reason: "Query Search Console",
      };
    }
    if (hasTool(tools, "keyword_context") && !called(ctx, "keyword_context")) {
      return {
        type: "call_tool",
        tool: "keyword_context",
        args: { projectId: goal.projectId, keyword: goal.keyword },
        reason: "Load keyword opportunities",
      };
    }
    if (hasTool(tools, "competitor_context") && !called(ctx, "competitor_context")) {
      return {
        type: "call_tool",
        tool: "competitor_context",
        args: { projectId: goal.projectId },
        reason: "Load competitor analyses",
      };
    }
    if (hasTool(tools, "inspect_url") && !called(ctx, "inspect_url") && goal.targetUrl) {
      return {
        type: "call_tool",
        tool: "inspect_url",
        args: { projectId: goal.projectId, inspectionUrl: goal.targetUrl },
        reason: "Inspect live URL in Search Console",
      };
    }
    if (goal.actionType === "new_content" && hasTool(tools, "generate_draft") && !called(ctx, "generate_draft") && goal.keyword) {
      return {
        type: "call_tool",
        tool: "generate_draft",
        args: { projectId: goal.projectId, keyword: goal.keyword },
        reason: "Draft after research tools (verified evidence optional)",
      };
    }
    if (goal.actionType === "enqueue" && hasTool(tools, "upsert_action_queue") && !called(ctx, "upsert_action_queue")) {
      return {
        type: "call_tool",
        tool: "upsert_action_queue",
        args: { projectId: goal.projectId },
        reason: "Persist scored actions",
      };
    }
    if (hasTool(tools, "publish_readiness") && !called(ctx, "publish_readiness") && goal.contentPieceId) {
      return {
        type: "call_tool",
        tool: "publish_readiness",
        args: { projectId: goal.projectId, contentPieceId: goal.contentPieceId },
        reason: "Check publish gates",
      };
    }
    if (hasTool(tools, "publish_live") && goal.actionType === "publish" && !called(ctx, "publish_live")) {
      return {
        type: "call_tool",
        tool: "publish_live",
        args: { projectId: goal.projectId, contentPieceId: goal.contentPieceId },
        reason: "Live publish requested",
      };
    }
    return { type: "stop", reason: "done", detail: "Chat research turn finished" };
  }

  if (goal.kind === "opportunity_scan") {
    if (hasTool(tools, "gsc_query") && !called(ctx, "gsc_query")) {
      return { type: "call_tool", tool: "gsc_query", args: { projectId: goal.projectId }, reason: "Score Search Console demand" };
    }
    if (hasTool(tools, "keyword_context") && !called(ctx, "keyword_context")) {
      return {
        type: "call_tool",
        tool: "keyword_context",
        args: { projectId: goal.projectId },
        reason: "Load keyword hub + tracked terms",
      };
    }
    if (hasTool(tools, "upsert_action_queue") && !called(ctx, "upsert_action_queue")) {
      return {
        type: "call_tool",
        tool: "upsert_action_queue",
        args: { projectId: goal.projectId },
        reason: "Persist scored actions",
      };
    }
    return { type: "stop", reason: "done", detail: "Opportunity scan finished" };
  }

  if (goal.kind === "publish_check") {
    if (hasTool(tools, "publish_readiness") && !called(ctx, "publish_readiness") && goal.contentPieceId) {
      return {
        type: "call_tool",
        tool: "publish_readiness",
        args: { projectId: goal.projectId, contentPieceId: goal.contentPieceId },
        reason: "Check publish gates",
      };
    }
    if (hasTool(tools, "publish_live") && !called(ctx, "publish_live")) {
      return {
        type: "call_tool",
        tool: "publish_live",
        args: { projectId: goal.projectId, contentPieceId: goal.contentPieceId },
        reason: "Live publish requested",
      };
    }
    return { type: "stop", reason: "done", detail: "Publish check finished" };
  }

  if (goal.kind === "execute_action") {
    const actionType = goal.actionType ?? "new_content";
    if (hasTool(tools, "gsc_query") && !called(ctx, "gsc_query")) {
      return { type: "call_tool", tool: "gsc_query", args: { projectId: goal.projectId, keyword: goal.keyword }, reason: "Ground in GSC" };
    }
    if (hasTool(tools, "keyword_context") && !called(ctx, "keyword_context")) {
      return {
        type: "call_tool",
        tool: "keyword_context",
        args: { projectId: goal.projectId, keyword: goal.keyword },
        reason: "Ground in keyword hub",
      };
    }
    if (hasTool(tools, "competitor_context") && !called(ctx, "competitor_context") && !called(ctx, "generate_draft")) {
      return {
        type: "call_tool",
        tool: "competitor_context",
        args: { projectId: goal.projectId },
        reason: "Load competitor analyses on file",
      };
    }
    if (!trajectoryHasVerifiedEvidence(ctx.trajectory)) {
      return {
        type: "stop",
        reason: "no_evidence",
        detail: "No connected research evidence (GSC, keywords, or competitors)",
      };
    }
    if (actionType === "inspect_url" && hasTool(tools, "inspect_url") && !called(ctx, "inspect_url") && goal.targetUrl) {
      return {
        type: "call_tool",
        tool: "inspect_url",
        args: { projectId: goal.projectId, inspectionUrl: goal.targetUrl },
        reason: "Inspect live URL in Search Console",
      };
    }
    if (actionType === "ctr_title" && hasTool(tools, "suggest_ctr_title") && !called(ctx, "suggest_ctr_title")) {
      return {
        type: "call_tool",
        tool: "suggest_ctr_title",
        args: {
          projectId: goal.projectId,
          keyword: goal.keyword,
          url: goal.targetUrl,
          apply: true,
        },
        reason: "CTR work is title/meta, not a new article",
      };
    }
    if (
      actionType === "internal_link" &&
      hasTool(tools, "suggest_internal_links") &&
      !called(ctx, "suggest_internal_links")
    ) {
      return {
        type: "call_tool",
        tool: "suggest_internal_links",
        args: {
          projectId: goal.projectId,
          keyword: goal.keyword,
          url: goal.targetUrl,
          apply: true,
        },
        reason: "Internal-link work is link suggestions, not a new article",
      };
    }
    if (
      (actionType === "new_content" || actionType === "refresh") &&
      hasTool(tools, "generate_draft") &&
      !called(ctx, "generate_draft")
    ) {
      return {
        type: "call_tool",
        tool: "generate_draft",
        args: { projectId: goal.projectId, keyword: goal.keyword, actionType },
        reason: "Draft is one action type, not the whole product",
      };
    }
    const pieceId = goal.contentPieceId ?? ctx.contentPieceId;
    if (
      hasTool(tools, "publish_live") &&
      !called(ctx, "publish_live") &&
      pieceId &&
      (called(ctx, "generate_draft") ||
        called(ctx, "suggest_ctr_title") ||
        called(ctx, "suggest_internal_links"))
    ) {
      return {
        type: "call_tool",
        tool: "publish_live",
        args: { projectId: goal.projectId, contentPieceId: pieceId },
        reason: "Live publish after action work (approve-first)",
      };
    }
    return { type: "stop", reason: "done", detail: "Action loop finished" };
  }

  // research_then_draft
  if (hasTool(tools, "site_context") && !called(ctx, "site_context")) {
    return { type: "call_tool", tool: "site_context", args: { projectId: goal.projectId }, reason: "Load project/brand context" };
  }
  if (hasTool(tools, "gsc_query") && !called(ctx, "gsc_query")) {
    return {
      type: "call_tool",
      tool: "gsc_query",
      args: { projectId: goal.projectId, keyword: goal.keyword },
      reason: "Query Search Console",
    };
  }
  if (hasTool(tools, "keyword_context") && !called(ctx, "keyword_context")) {
    return {
      type: "call_tool",
      tool: "keyword_context",
      args: { projectId: goal.projectId, keyword: goal.keyword },
      reason: "Load keyword opportunities",
    };
  }
  if (hasTool(tools, "competitor_context") && !called(ctx, "competitor_context")) {
    return {
      type: "call_tool",
      tool: "competitor_context",
      args: { projectId: goal.projectId },
      reason: "Load competitor analyses",
    };
  }
  // Studio / Autopilot / Daily Five: same generator after research *attempts*.
  // Missing GSC/keywords does not skip draft; it also does not mark claims verified.
  if (hasTool(tools, "generate_draft") && !called(ctx, "generate_draft") && goal.keyword) {
    return {
      type: "call_tool",
      tool: "generate_draft",
      args: { projectId: goal.projectId, keyword: goal.keyword },
      reason: "Draft after research tools (verified evidence optional)",
    };
  }
  if (hasTool(tools, "publish_readiness") && !called(ctx, "publish_readiness") && goal.contentPieceId) {
    return {
      type: "call_tool",
      tool: "publish_readiness",
      args: { projectId: goal.projectId, contentPieceId: goal.contentPieceId },
      reason: "Readiness gate before any live publish",
    };
  }
  if (called(ctx, "generate_draft")) {
    return { type: "stop", reason: "done", detail: "Research + draft loop finished" };
  }
  if (!trajectoryHasVerifiedEvidence(ctx.trajectory)) {
    return {
      type: "stop",
      reason: "no_evidence",
      detail: "No connected research evidence; refusing to mark claims verified",
    };
  }
  return { type: "stop", reason: "done", detail: "Research + draft loop finished" };
};
