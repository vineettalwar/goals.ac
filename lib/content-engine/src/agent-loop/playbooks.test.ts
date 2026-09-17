import { describe, expect, it } from "vitest";
import {
  asPlaybookState,
  extractHttpUrl,
  parsePublishChoice,
  parseVertical,
  wantsOnboard,
} from "./playbooks";
import { buildGroundingPack, groundedReplySystemPrompt } from "./stream-grounded-reply";
import { parseChatIntent } from "./seo-chat-format";
import { runAgentLoop, memoryTrajectorySink } from "./loop";
import type { AgentTool } from "./types";

describe("playbook parsing", () => {
  it("detects onboard from a URL plus add/onboard language", () => {
    expect(wantsOnboard("Onboard https://example.com")).toBe(true);
    expect(extractHttpUrl("see https://example.com/blog")).toBe("https://example.com/blog");
    expect(parseVertical("software saas")).toBe("software");
    expect(parsePublishChoice("push wordpress as draft")).toBe("draft");
    expect(parsePublishChoice("push wordpress live")).toBe("publish");
    expect(parsePublishChoice("skip")).toBe("skip");
  });

  it("round-trips playbook JSON", () => {
    expect(asPlaybookState({ id: "onboard", step: "ask_name", payload: { websiteUrl: "https://x.com" } })).toMatchObject({
      id: "onboard",
      step: "ask_name",
    });
    expect(asPlaybookState({ id: "nope" })).toBeNull();
  });
});

describe("parseChatIntent playbooks", () => {
  it("maps onboard, live approve, wordpress draft, and long prompts", () => {
    expect(parseChatIntent("Onboard https://acme.test").kind).toBe("onboard");
    expect(parseChatIntent("approve live publish").kind).toBe("approve_live");
    expect(parseChatIntent("push wordpress as draft")).toEqual({
      kind: "publish_check",
      contentPieceId: undefined,
      cmsStatus: "draft",
    });
    expect(parseChatIntent("push to WordPress").kind).toBe("publish_check");
    const long = "x".repeat(300);
    const intent = parseChatIntent(long);
    expect(intent.kind).toBe("research_then_draft");
    if (intent.kind === "research_then_draft") expect(intent.userPrompt).toBe(long);
  });
});

describe("grounding pack", () => {
  it("only lists verified citations and tells the model not to invent clicks", () => {
    const pack = buildGroundingPack({
      trajectory: [
        {
          at: "t",
          tool: "gsc_query",
          decision: "gsc",
          summary: "Search Console is not connected",
          ok: true,
          evidenceRefs: [{ source: "fake", verified: false }],
        },
      ],
    });
    expect(pack.verified).toBe(false);
    expect(pack.citations).toEqual([]);
    expect(pack.missing[0]).toMatch(/not connected/i);
    expect(groundedReplySystemPrompt(pack)).toMatch(/Never invent metrics/);
  });
});

describe("chat research waits for the user", () => {
  it("stops before generate_draft when askBeforeDraft is set", async () => {
    let drafted = 0;
    const tools: AgentTool[] = [
      {
        name: "gsc_query",
        description: "gsc",
        risk: "read",
        creditCost: 1,
        execute: async () => ({
          ok: true,
          summary: "GSC rows",
          hasToolEvidence: true,
          evidenceRefs: [{ source: 'GSC "widgets" pos 4', verified: true }],
        }),
      },
      {
        name: "generate_draft",
        description: "draft",
        risk: "write",
        creditCost: 1,
        execute: async () => {
          drafted += 1;
          return { ok: true, summary: "drafted", evidenceRefs: [], hasToolEvidence: false };
        },
      },
    ];
    const result = await runAgentLoop({
      goal: {
        kind: "research_then_draft",
        text: "write about widgets",
        projectId: 1,
        keyword: "widgets",
        askBeforeDraft: true,
      },
      tools,
      stepBudget: 8,
      sink: memoryTrajectorySink(),
    });
    expect(result.status).toBe("awaiting_user");
    expect(drafted).toBe(0);
  });

  it("queues WordPress draft via publish_cms", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const tools: AgentTool[] = [
      {
        name: "publish_readiness",
        description: "ready",
        risk: "read",
        creditCost: 1,
        execute: async () => ({ ok: true, summary: "Ready to publish", evidenceRefs: [], hasToolEvidence: false }),
      },
      {
        name: "publish_cms",
        description: "draft cms",
        risk: "write",
        creditCost: 1,
        execute: async (args) => {
          calls.push(args);
          return {
            ok: true,
            summary: "Queued WordPress draft publish",
            evidenceRefs: [],
            hasToolEvidence: false,
            data: { cmsStatus: "draft" },
          };
        },
      },
      {
        name: "publish_live",
        description: "live",
        risk: "publish_live",
        creditCost: 1,
        execute: async () => ({ ok: true, summary: "live", evidenceRefs: [], hasToolEvidence: false }),
      },
    ];
    const result = await runAgentLoop({
      goal: {
        kind: "publish_check",
        text: "push draft",
        projectId: 1,
        contentPieceId: 9,
        cmsStatus: "draft",
      },
      tools,
      stepBudget: 6,
      sink: memoryTrajectorySink(),
    });
    expect(result.status).toBe("completed");
    expect(calls[0]).toMatchObject({ contentPieceId: 9, cmsStatus: "draft" });
    expect(result.trajectory.some((step) => step.tool === "publish_live")).toBe(false);
  });
});
