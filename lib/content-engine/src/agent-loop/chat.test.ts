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
  it("maps slipping and CTR prompts to opportunity_scan", () => {
    expect(parseChatIntent("What's slipping?").kind).toBe("opportunity_scan");
    expect(parseChatIntent("CTR gaps").kind).toBe("opportunity_scan");
  });

  it("maps brief/draft prompts to research_then_draft with a keyword", () => {
    const intent = parseChatIntent("Brief for payroll software");
    expect(intent).toEqual({ kind: "research_then_draft", keyword: "payroll software" });
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
  it("runs first-party tools and does not draft unless asked", async () => {
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
    expect(result.trajectory.some((step) => step.tool === "gsc_query")).toBe(true);
    expect(result.trajectory.some((step) => step.tool === "site_context")).toBe(true);
    expect(drafted).toBe(0);
    expect(chipLabel("gsc_query")).toBe("Queried GSC");
    expect(result.status).toBe("completed");
  });
});

describe("runInspectorHref", () => {
  it("appends runId for Actions inspector deep-links", () => {
    expect(runInspectorHref("/search/actions", 41)).toBe("/search/actions?runId=41");
    expect(runInspectorHref("/search/actions?project=2", 9)).toBe("/search/actions?project=2&runId=9");
  });
});
