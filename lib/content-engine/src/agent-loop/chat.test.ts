import { describe, expect, it } from "vitest";
import { runAgentLoop, memoryTrajectorySink } from "./loop";
import {
  chipLabel,
  composeGroundedReply,
  goalFromIntent,
  parseChatIntent,
  runInspectorHref,
} from "./seo-chat-format";
import type { AgentTool } from "./types";

describe("parseChatIntent", () => {
  it("maps CTR title rewrites without treating them as CTR gaps", () => {
    expect(parseChatIntent("Suggest CTR titles for payroll")).toEqual({
      kind: "chat_turn",
      actionType: "ctr_title",
      keyword: "payroll",
      targetUrl: undefined,
    });
    expect(parseChatIntent("CTR gaps").kind).toBe("opportunity_scan");
  });

  it("maps unused-belt and platform verbs onto chat_turn action types", () => {
    expect(parseChatIntent("Check backlinks")).toMatchObject({ kind: "chat_turn", actionType: "backlinks" });
    expect(parseChatIntent("Add internal links")).toMatchObject({ kind: "chat_turn", actionType: "internal_link" });
    expect(parseChatIntent("Show the roadmap")).toMatchObject({ kind: "chat_turn", actionType: "strategy_overview" });
    expect(parseChatIntent("Generate a topical map")).toMatchObject({ kind: "chat_turn", actionType: "generate_topical_map" });
    expect(parseChatIntent("Start Daily Five for payroll, billing")).toMatchObject({
      kind: "chat_turn",
      actionType: "start_daily_five",
    });
    expect(parseChatIntent("Draft a LinkedIn post about payroll")).toMatchObject({
      kind: "chat_turn",
      actionType: "draft_social",
    });
    expect(parseChatIntent("Autopilot status")).toMatchObject({ kind: "chat_turn", actionType: "autopilot_status" });
  });

  it("maps brief/draft prompts to research_then_draft with a keyword", () => {
    const intent = parseChatIntent("Brief for payroll software");
    expect(intent).toEqual({ kind: "research_then_draft", keyword: "payroll software" });
  });

  it("maps create-content prompts onto the same Studio draft loop", () => {
    expect(parseChatIntent("Can we create some content about wordpress")).toEqual({
      kind: "research_then_draft",
      keyword: "wordpress",
    });
    expect(parseChatIntent("generate an article on payroll software")).toEqual({
      kind: "research_then_draft",
      keyword: "payroll software",
    });
  });

  it("maps relaunch + URL to inspect_url execute_action", () => {
    const intent = parseChatIntent("Relaunch risk for https://example.com/old-post");
    expect(intent).toEqual({
      kind: "execute_action",
      actionType: "inspect_url",
      targetUrl: "https://example.com/old-post",
      keyword: undefined,
    });
  });

  it("stores project memory without a loop goal", () => {
    expect(parseChatIntent("never claim: #1 in the world")).toEqual({
      kind: "memory",
      field: "bannedClaims",
      text: "#1 in the world",
    });
    expect(goalFromIntent(parseChatIntent("never claim: x"), 1, "never claim: x")).toBeNull();
  });
});

describe("composeGroundedReply", () => {
  it("refuses verified language when tools returned no evidence", () => {
    const out = composeGroundedReply({
      intent: { kind: "chat_turn" },
      text: "How are we doing?",
      run: {
        status: "completed",
        stopReason: "Chat research turn finished",
        trajectory: [
          {
            at: "t",
            tool: "gsc_query",
            decision: "Query Search Console",
            summary: "Search Console is not connected",
            ok: true,
            evidenceRefs: [],
          },
        ],
      },
    });
    expect(out.verified).toBe(false);
    expect(out.content).toMatch(/not verified/i);
    expect(out.content.toLowerCase()).not.toMatch(/verified evidence/);
    expect(out.missing[0]).toMatch(/not connected/i);
  });

  it("cites only verified tool refs", () => {
    const out = composeGroundedReply({
      intent: { kind: "opportunity_scan" },
      text: "What's slipping?",
      run: {
        status: "completed",
        stopReason: "Opportunity scan finished",
        trajectory: [
          {
            at: "t",
            tool: "gsc_query",
            decision: "score",
            ok: true,
            evidenceRefs: [{ source: 'GSC "widgets" pos 8.2', verified: true }],
          },
        ],
      },
    });
    expect(out.verified).toBe(true);
    expect(out.citations[0]).toMatch(/widgets/);
  });
});

describe("chat_turn planner wiring", () => {
  it("loads site context and does not dump research or draft unless asked", async () => {
    let drafted = 0;
    const tools: AgentTool[] = [
      {
        name: "site_context",
        description: "site",
        risk: "read",
        creditCost: 1,
        execute: async () => ({
          ok: true,
          summary: "Site Acme",
          hasToolEvidence: false,
          evidenceRefs: [{ source: "https://acme.test", verified: false }],
        }),
      },
      {
        name: "gsc_query",
        description: "gsc",
        risk: "read",
        creditCost: 1,
        execute: async () => ({
          ok: true,
          summary: "GSC rows",
          hasToolEvidence: true,
          evidenceRefs: [{ source: "GSC foo", verified: true }],
        }),
      },
      {
        name: "keyword_context",
        description: "kw",
        risk: "read",
        creditCost: 1,
        execute: async () => ({
          ok: true,
          summary: "keywords",
          hasToolEvidence: true,
          evidenceRefs: [{ source: "keyword hub foo", verified: true }],
        }),
      },
      {
        name: "competitor_context",
        description: "comp",
        risk: "read",
        creditCost: 1,
        execute: async () => ({
          ok: true,
          summary: "No competitor analyses on file",
          hasToolEvidence: false,
          evidenceRefs: [],
        }),
      },
      {
        name: "generate_draft",
        description: "draft",
        risk: "write",
        creditCost: 5,
        execute: async () => {
          drafted += 1;
          return { ok: true, summary: "drafted", evidenceRefs: [], hasToolEvidence: false };
        },
      },
    ];
    const sink = memoryTrajectorySink();
    const result = await runAgentLoop({
      goal: { kind: "chat_turn", text: "How are rankings?", projectId: 3 },
      tools,
      stepBudget: 8,
      sink,
    });
    expect(result.trajectory.some((step) => step.tool === "site_context")).toBe(true);
    expect(result.trajectory.some((step) => step.tool === "gsc_query")).toBe(false);
    expect(drafted).toBe(0);
    expect(chipLabel("gsc_query")).toBe("Queried GSC");
    expect(result.status).toBe("completed");
  });

  it("runs CTR title after site context when that action is requested", async () => {
    let titles = 0;
    const tools: AgentTool[] = [
      {
        name: "site_context",
        description: "site",
        risk: "read",
        creditCost: 1,
        execute: async () => ({
          ok: true,
          summary: "Site Acme",
          hasToolEvidence: false,
          evidenceRefs: [],
        }),
      },
      {
        name: "suggest_ctr_title",
        description: "ctr",
        risk: "write",
        creditCost: 2,
        execute: async () => {
          titles += 1;
          return { ok: true, summary: "titles", evidenceRefs: [], hasToolEvidence: false };
        },
      },
      {
        name: "generate_draft",
        description: "draft",
        risk: "write",
        creditCost: 5,
        execute: async () => ({ ok: true, summary: "drafted", evidenceRefs: [], hasToolEvidence: false }),
      },
    ];
    const result = await runAgentLoop({
      goal: { kind: "chat_turn", text: "Suggest CTR titles", projectId: 3, actionType: "ctr_title", keyword: "payroll" },
      tools,
      stepBudget: 8,
      sink: memoryTrajectorySink(),
    });
    expect(titles).toBe(1);
    expect(result.trajectory.some((step) => step.tool === "generate_draft")).toBe(false);
  });
});

describe("runInspectorHref", () => {
  it("appends runId for Actions inspector deep-links", () => {
    expect(runInspectorHref("/search/actions", 41)).toBe("/search/actions?runId=41");
    expect(runInspectorHref("/search/actions?project=2", 9)).toBe("/search/actions?project=2&runId=9");
  });
});
