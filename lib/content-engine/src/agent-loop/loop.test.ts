import { describe, expect, it } from "vitest";
import { runAgentLoop, memoryTrajectorySink } from "./loop";
import { sanitizeVerifiedFlags, type AgentTool } from "./types";
import { draftsFromGsc, actionTypeFromGscPattern, draftsFromPositionSlip, pickAutopilotQueueWork } from "./action-queue";
import { parsePlannerJson, createHybridPlanner } from "./hybrid-planner";
import { buildCtrTitleSuggestions } from "./finish-actions";
import { defaultEmployeePlanner } from "./planner";
import type { GscScoredOpportunity } from "@workspace/seo-tools/gscOpportunityScorer";

function tool(name: string, result: Parameters<AgentTool["execute"]> extends never ? never : Awaited<ReturnType<AgentTool["execute"]>>, risk: AgentTool["risk"] = "read"): AgentTool {
  return {
    name,
    description: name,
    risk,
    creditCost: 1,
    execute: async () => result,
  };
}

const gscHit: AgentTool = {
  name: "gsc_query",
  description: "gsc",
  risk: "read",
  creditCost: 1,
  async execute() {
    return {
      ok: true,
      summary: "GSC rows",
      hasToolEvidence: true,
      evidenceRefs: [{ source: "GSC foo", url: "https://example.com/a", verified: true }],
    };
  },
};

describe("runAgentLoop", () => {
  it("stops when the step budget is exhausted", async () => {
    const sink = memoryTrajectorySink();
    const noisy: AgentTool = {
      name: "gsc_query",
      description: "always again",
      risk: "read",
      creditCost: 1,
      async execute() {
        return { ok: true, summary: "ping", evidenceRefs: [], hasToolEvidence: false };
      },
    };
    const result = await runAgentLoop({
      goal: { kind: "opportunity_scan", text: "scan", projectId: 1 },
      tools: [noisy],
      stepBudget: 2,
      sink,
      planner: () => ({ type: "call_tool", tool: "gsc_query", args: { projectId: 1 }, reason: "again" }),
    });
    expect(result.status).toBe("budget_exhausted");
    expect(result.trajectory.filter((step) => step.tool === "gsc_query")).toHaveLength(2);
    expect(sink.runs.at(-1)?.status).toBe("budget_exhausted");
  });

  it("stamps run.id on the first persist before any tool runs", async () => {
    const ids: Array<number | undefined> = [];
    const sink = memoryTrajectorySink();
    let toolSawId: number | undefined;
    const noisy: AgentTool = {
      name: "gsc_query",
      description: "gsc",
      risk: "read",
      creditCost: 1,
      async execute() {
        toolSawId = sink.runs[0]?.id;
        return { ok: true, summary: "ping", evidenceRefs: [], hasToolEvidence: false };
      },
    };
    const result = await runAgentLoop({
      goal: { kind: "opportunity_scan", text: "scan", projectId: 1 },
      tools: [noisy],
      stepBudget: 1,
      sink: {
        async save(run) {
          await sink.save(run);
          ids.push(run.id);
        },
      },
      planner: () => ({ type: "call_tool", tool: "gsc_query", args: { projectId: 1 }, reason: "again" }),
    });
    expect(ids[0]).toBe(1);
    expect(toolSawId).toBe(1);
    expect(result.id).toBe(1);
  });

  it("invokes GSC when that tool is on the registry (credentials exist)", async () => {
    let gscCalls = 0;
    const gsc: AgentTool = {
      ...gscHit,
      async execute() {
        gscCalls += 1;
        return gscHit.execute({}, null as never);
      },
    };
    const generate: AgentTool = {
      name: "generate_draft",
      description: "draft",
      risk: "write",
      creditCost: 1,
      async execute() {
        return { ok: true, summary: "drafted", evidenceRefs: [], hasToolEvidence: false };
      },
    };
    const result = await runAgentLoop({
      goal: {
        kind: "research_then_draft",
        text: "draft about widgets",
        projectId: 9,
        keyword: "widgets",
      },
      tools: [gsc, generate],
      credentials: { gsc: true },
      stepBudget: 8,
    });
    expect(gscCalls).toBe(1);
    expect(result.trajectory.some((step) => step.tool === "gsc_query" && step.ok)).toBe(true);
    expect(result.trajectory.some((step) => step.tool === "generate_draft")).toBe(true);
    expect(result.status).toBe("completed");
  });

  it("drafts via research_then_draft even when research tools return no evidence", async () => {
    let drafted = 0;
    const blank = tool("gsc_query", {
      ok: true,
      summary: "Search Console is not connected",
      evidenceRefs: [{ source: "invented", verified: true }],
      hasToolEvidence: false,
    });
    const generate: AgentTool = {
      name: "generate_draft",
      description: "draft",
      risk: "write",
      creditCost: 1,
      async execute() {
        drafted += 1;
        return {
          ok: true,
          summary: "drafted",
          evidenceRefs: [],
          hasToolEvidence: false,
          data: { contentPieceId: 42 },
        };
      },
    };
    const result = await runAgentLoop({
      goal: { kind: "research_then_draft", text: "draft", projectId: 1, keyword: "x" },
      tools: [blank, generate],
      stepBudget: 6,
      policy: { maxCredits: 12, allowLivePublish: false },
    });
    expect(drafted).toBe(1);
    expect(result.status).toBe("completed");
    expect(result.contentPieceId).toBe(42);
    const gscStep = result.trajectory.find((step) => step.tool === "gsc_query");
    expect(gscStep?.evidenceRefs?.every((ref) => ref.verified === false)).toBe(true);
  });

  it("stops with no_evidence instead of fake verification when tools find nothing", async () => {
    const blank: AgentTool = tool("gsc_query", {
      ok: true,
      summary: "Search Console is not connected",
      evidenceRefs: [{ source: "invented", verified: true }],
      hasToolEvidence: false,
    });
    const result = await runAgentLoop({
      goal: { kind: "research_then_draft", text: "draft", projectId: 1, keyword: "x" },
      tools: [blank],
      stepBudget: 6,
    });
    expect(result.status).toBe("no_evidence");
    const gscStep = result.trajectory.find((step) => step.tool === "gsc_query");
    expect(gscStep?.evidenceRefs?.every((ref) => ref.verified === false)).toBe(true);
  });

  it("execute_action still requires verified evidence before generate_draft", async () => {
    let drafted = 0;
    const blank = tool("gsc_query", {
      ok: true,
      summary: "not connected",
      evidenceRefs: [],
      hasToolEvidence: false,
    });
    const generate: AgentTool = {
      name: "generate_draft",
      description: "draft",
      risk: "write",
      creditCost: 1,
      async execute() {
        drafted += 1;
        return { ok: true, summary: "drafted", evidenceRefs: [], hasToolEvidence: false };
      },
    };
    const result = await runAgentLoop({
      goal: {
        kind: "execute_action",
        text: "run",
        projectId: 1,
        keyword: "x",
        actionType: "new_content",
      },
      tools: [blank, generate],
      stepBudget: 6,
    });
    expect(drafted).toBe(0);
    expect(result.status).toBe("no_evidence");
  });

  it("gates live publish for approval", async () => {
    const publish: AgentTool = {
      name: "publish_live",
      description: "live",
      risk: "publish_live",
      creditCost: 1,
      async execute() {
        throw new Error("must not execute");
      },
    };
    const result = await runAgentLoop({
      goal: { kind: "publish_check", text: "publish", projectId: 1, contentPieceId: 4 },
      tools: [publish],
      stepBudget: 4,
    });
    expect(result.status).toBe("awaiting_approval");
    expect(result.stopReason).toMatch(/approval/i);
    const gate = result.trajectory.find((step) => step.tool === "publish_live");
    expect(gate?.ok).toBe(false);
    expect(gate?.error).toMatch(/approval/i);
  });

  it("records tool error text on failed write tools", async () => {
    const draft: AgentTool = {
      name: "generate_draft",
      description: "draft",
      risk: "write",
      creditCost: 1,
      async execute() {
        return {
          ok: false,
          summary: "Draft failed",
          error: "model timeout",
          evidenceRefs: [],
          hasToolEvidence: false,
        };
      },
    };
    const result = await runAgentLoop({
      goal: { kind: "research_then_draft", text: "draft", projectId: 1, keyword: "x" },
      tools: [gscHit, draft],
      stepBudget: 6,
    });
    expect(result.status).toBe("failed");
    const step = result.trajectory.find((row) => row.tool === "generate_draft");
    expect(step?.error).toBe("model timeout");
  });

  it("resumes gated publish_live and executes the tool", async () => {
    let publishes = 0;
    const publish: AgentTool = {
      name: "publish_live",
      description: "live",
      risk: "publish_live",
      creditCost: 1,
      async execute() {
        publishes += 1;
        return { ok: true, summary: "queued", evidenceRefs: [], hasToolEvidence: false, data: { queued: true } };
      },
    };
    const gated = await runAgentLoop({
      goal: { kind: "publish_check", text: "publish", projectId: 1, contentPieceId: 4 },
      tools: [publish],
      stepBudget: 4,
    });
    expect(gated.status).toBe("awaiting_approval");
    expect(publishes).toBe(0);
    const resumed = await runAgentLoop({
      goal: gated.goal,
      tools: [publish],
      stepBudget: 4,
      resumeFrom: gated,
      policy: { allowLivePublish: true, approveFirstForLivePublish: false },
    });
    expect(publishes).toBe(1);
    expect(resumed.status).toBe("completed");
    expect(resumed.trajectory.some((step) => step.tool === "publish_live" && step.ok)).toBe(true);
  });

  it("routes ctr_title to suggest_ctr_title instead of generate_draft", async () => {
    let drafted = 0;
    let titled = 0;
    const gsc = gscHit;
    const generate: AgentTool = {
      name: "generate_draft",
      description: "draft",
      risk: "write",
      creditCost: 1,
      async execute() {
        drafted += 1;
        return { ok: true, summary: "drafted", evidenceRefs: [], hasToolEvidence: false };
      },
    };
    const titles: AgentTool = {
      name: "suggest_ctr_title",
      description: "titles",
      risk: "write",
      creditCost: 1,
      async execute() {
        titled += 1;
        return { ok: true, summary: "titles", evidenceRefs: [], hasToolEvidence: false, data: { contentPieceId: 9 } };
      },
    };
    const result = await runAgentLoop({
      goal: {
        kind: "execute_action",
        text: "ctr",
        projectId: 1,
        keyword: "weak snippet",
        actionType: "ctr_title",
      },
      tools: [gsc, generate, titles],
      stepBudget: 8,
      policy: { allowLivePublish: false },
    });
    expect(drafted).toBe(0);
    expect(titled).toBe(1);
    expect(result.status).toBe("completed");
  });
});

describe("sanitizeVerifiedFlags", () => {
  it("strips verified:true when the tool did not produce evidence", () => {
    const sanitized = sanitizeVerifiedFlags({
      ok: true,
      summary: "model claims",
      hasToolEvidence: false,
      evidenceRefs: [{ source: "https://fake.example", verified: true }],
    });
    expect(sanitized.evidenceRefs[0]?.verified).toBe(false);
  });
});

describe("action queue scoring", () => {
  it("maps GSC patterns onto action types with evidence", () => {
    const scored: GscScoredOpportunity[] = [
      {
        query: "near page one",
        impressions: 400,
        clicks: 8,
        ctr: 0.02,
        position: 8,
        opportunityScore: 80,
        pattern: "striking_distance",
        topPage: "https://example.com/old",
      },
      {
        query: "weak snippet",
        impressions: 900,
        clicks: 4,
        ctr: 0.004,
        position: 5,
        opportunityScore: 70,
        pattern: "high_impressions_low_ctr",
        topPage: "https://example.com/x",
      },
    ];
    const drafts = draftsFromGsc(scored);
    expect(actionTypeFromGscPattern("striking_distance", true)).toBe("refresh");
    expect(drafts[0]?.actionType).toBe("refresh");
    expect(drafts[1]?.actionType).toBe("ctr_title");
    expect(drafts[0]?.evidence[0]?.source).toBe("gsc_query");
  });

  it("upserts refresh drafts when GSC position slips", () => {
    const drafts = draftsFromPositionSlip(
      [
        {
          query: "old winner",
          impressions: 200,
          clicks: 10,
          ctr: 0.05,
          position: 18,
          pages: ["https://example.com/post"],
        },
      ],
      [
        {
          query: "old winner",
          impressions: 220,
          clicks: 40,
          ctr: 0.18,
          position: 8,
          pages: ["https://example.com/post"],
        },
      ],
    );
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.actionType).toBe("refresh");
    expect(drafts[0]?.evidence[0]?.source).toBe("gsc_position_slip");
  });

  it("prefers approved evidence-backed queue items for Autopilot", () => {
    const picked = pickAutopilotQueueWork([
      { id: 1, status: "open", opportunityScore: 90, evidence: [{ source: "gsc" }], actionType: "new_content" },
      { id: 2, status: "approved", opportunityScore: 55, evidence: [{ source: "gsc" }], actionType: "refresh" },
      { id: 3, status: "open", opportunityScore: 99, evidence: [], actionType: "new_content" },
    ]);
    expect(picked?.id).toBe(2);
  });

  it("falls through to high-score open items when nothing is approved", () => {
    const picked = pickAutopilotQueueWork([
      { id: 1, status: "open", opportunityScore: 71, evidence: [{ source: "gsc" }], actionType: "ctr_title" },
      { id: 2, status: "open", opportunityScore: 40, evidence: [{ source: "gsc" }], actionType: "refresh" },
    ]);
    expect(picked?.id).toBe(1);
  });
});

describe("hybrid planner", () => {
  it("falls back to deterministic when the chooser returns junk", async () => {
    const planner = createHybridPlanner({
      choose: () => ({ type: "call_tool", tool: "not_a_tool", args: {}, reason: "nope" }),
      fallback: defaultEmployeePlanner,
    });
    const decision = await planner(
      {
        goal: { kind: "opportunity_scan", text: "scan", projectId: 1 },
        credentials: { gsc: false, keywords: false, competitors: false, serp: false },
        policy: {
          allowLivePublish: false,
          approveFirstForLivePublish: true,
          maxCredits: 10,
          plannerMode: "hybrid",
        },
        trajectory: [],
        creditsSpent: 0,
        stepIndex: 0,
      },
      [gscHit],
    );
    expect(decision.type).toBe("call_tool");
    if (decision.type === "call_tool") expect(decision.tool).toBe("gsc_query");
  });

  it("uses a legal LLM pick", async () => {
    const planner = createHybridPlanner({
      choose: () => parsePlannerJson('{"type":"call_tool","tool":"gsc_query","args":{"projectId":1},"reason":"llm"}', ["gsc_query"]),
    });
    const decision = await planner(
      {
        goal: { kind: "research_then_draft", text: "x", projectId: 1, keyword: "x" },
        credentials: { gsc: false, keywords: false, competitors: false, serp: false },
        policy: {
          allowLivePublish: false,
          approveFirstForLivePublish: true,
          maxCredits: 10,
          plannerMode: "hybrid",
        },
        trajectory: [],
        creditsSpent: 0,
        stepIndex: 0,
      },
      [gscHit],
    );
    expect(decision).toEqual({
      type: "call_tool",
      tool: "gsc_query",
      args: { projectId: 1 },
      reason: "llm",
    });
  });
});

describe("ctr title suggestions", () => {
  it("builds apply-able title/meta options from a keyword", () => {
    const rows = buildCtrTitleSuggestions("weak snippet", "Old H1");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]?.seoTitle.length).toBeLessThanOrEqual(60);
    expect(rows.some((row) => row.title.toLowerCase().includes("weak snippet"))).toBe(true);
  });
});
