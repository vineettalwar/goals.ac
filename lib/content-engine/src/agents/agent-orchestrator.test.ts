/**
 * Agent Orchestrator Self-Check
 *
 * Run with: npx vitest run src/agents/agent-orchestrator.test.ts
 *
 * Tests agent configuration without making AI calls.
 */

import { describe, it, expect } from "vitest";
import { validateAgentConfiguration, AgentPipelineError, shouldReplaceBody } from "./agent-orchestrator";
import { AGENT_PIPELINE_ORDER, AGENT_DEFINITIONS, getAgentDefinition } from "./agent-definitions";
import { buildAgentSystemPrompt, buildAgentTaskPrompt, AGENT_PERSONALITY_PROMPTS } from "./agent-prompts";
import type { AgentId } from "./agent-types";

describe("Agent Configuration", () => {
  it("validates all agents are configured correctly", () => {
    const result = validateAgentConfiguration();
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("has all 8 agents in pipeline order", () => {
    expect(AGENT_PIPELINE_ORDER).toHaveLength(8);
    expect(AGENT_PIPELINE_ORDER).toEqual([
      "owl",
      "ferret",
      "hummingbird",
      "spider",
      "fox",
      "mockingbird",
      "hawk",
      "chameleon",
    ]);
  });

  it("has definitions for all agents", () => {
    for (const agentId of AGENT_PIPELINE_ORDER) {
      const def = getAgentDefinition(agentId);
      expect(def).toBeDefined();
      expect(def.id).toBe(agentId);
      expect(def.name).toMatch(/^The \w+$/);
      expect(def.role).toBeTruthy();
      expect(def.icon).toBeTruthy();
      expect(def.personality).toBeTruthy();
      expect(def.expertise).toBeInstanceOf(Array);
      expect(def.expertise.length).toBeGreaterThan(0);
      expect(def.stage).toMatch(/^(pre-write|draft|optimize|polish)$/);
      expect(def.order).toBeGreaterThanOrEqual(0);
      expect(def.workingMessages.length).toBeGreaterThan(0);
    }
  });

  it("has personality prompts for all agents", () => {
    for (const agentId of AGENT_PIPELINE_ORDER) {
      const prompt = AGENT_PERSONALITY_PROMPTS[agentId];
      expect(prompt).toBeTruthy();
      expect(prompt.length).toBeGreaterThan(200);
      // Should mention the animal name
      expect(prompt).toContain("The " + agentId.charAt(0).toUpperCase() + agentId.slice(1));
    }
  });

  it("generates valid system prompts", () => {
    for (const agentId of AGENT_PIPELINE_ORDER) {
      const prompt = buildAgentSystemPrompt(agentId);
      expect(prompt).toBeTruthy();
      expect(prompt.length).toBeGreaterThan(200);
    }
  });

  it("generates valid task prompts with context", () => {
    const testContext = {
      keyword: "content marketing strategy",
      format: "blog_post",
      brandName: "Acme Corp",
      industry: "SaaS",
      targetAudience: "Marketing managers",
      wordRange: "1400-1800",
    };

    for (const agentId of AGENT_PIPELINE_ORDER) {
      const prompt = buildAgentTaskPrompt(agentId, testContext);
      expect(prompt).toBeTruthy();
      expect(prompt.length).toBeGreaterThan(50);
      // Should include the keyword for relevant agents
      if (["owl", "hummingbird", "spider", "hawk"].includes(agentId)) {
        expect(prompt).toContain(testContext.keyword);
      }
    }
  });

  it("has unique animal names for all agents", () => {
    const names = new Set<string>();
    for (const agentId of AGENT_PIPELINE_ORDER) {
      const def = getAgentDefinition(agentId);
      expect(names.has(def.name)).toBe(false);
      names.add(def.name);
    }
    expect(names.size).toBe(8);
  });

  it("has unique Lucide icons for all agents", () => {
    const icons = new Set<string>();
    for (const agentId of AGENT_PIPELINE_ORDER) {
      const def = getAgentDefinition(agentId);
      expect(icons.has(def.icon)).toBe(false);
      icons.add(def.icon);
    }
    expect(icons.size).toBe(8);
  });
});

describe("AgentPipelineError", () => {
  it("creates error with correct properties", () => {
    const err = new AgentPipelineError("Test error", "TIMEOUT", "owl", true);
    expect(err.message).toBe("Test error");
    expect(err.code).toBe("TIMEOUT");
    expect(err.agentId).toBe("owl");
    expect(err.retryable).toBe(true);
    expect(err.name).toBe("AgentPipelineError");
  });

  it("defaults to non-retryable", () => {
    const err = new AgentPipelineError("Test", "MISSING_KEYWORD");
    expect(err.retryable).toBe(false);
  });
});

describe("Agent Pipeline Order", () => {
  it("follows correct stage progression", () => {
    const stages: string[] = [];
    for (const agentId of AGENT_PIPELINE_ORDER) {
      const def = getAgentDefinition(agentId);
      stages.push(def.stage);
    }

    // Should progress: pre-write → draft → optimize → polish
    // Allow for multiple agents in same stage
    const stageOrder = ["pre-write", "draft", "optimize", "polish"];
    let lastStageIndex = -1;
    for (const stage of stages) {
      const index = stageOrder.indexOf(stage);
      expect(index).toBeGreaterThanOrEqual(lastStageIndex);
      lastStageIndex = index;
    }
  });

  it("has writer (hummingbird) in draft stage", () => {
    const hummingbird = getAgentDefinition("hummingbird");
    expect(hummingbird.stage).toBe("draft");
  });

  it("has owl and ferret in pre-write stage", () => {
    expect(getAgentDefinition("owl").stage).toBe("pre-write");
    expect(getAgentDefinition("ferret").stage).toBe("pre-write");
  });

  it("has chameleon as final agent", () => {
    expect(AGENT_PIPELINE_ORDER[AGENT_PIPELINE_ORDER.length - 1]).toBe("chameleon");
  });
});

describe("shouldReplaceBody", () => {
  it("keeps the longer hummingbird draft when a later agent returns a stub", () => {
    const draft = "x".repeat(4000);
    expect(shouldReplaceBody(draft, "Short SEO rewrite.")).toBe(false);
  });

  it("accepts a full rewrite that is at least 80% as long", () => {
    const draft = "word ".repeat(400);
    expect(shouldReplaceBody(draft, `${draft} extra closing.`)).toBe(true);
    expect(shouldReplaceBody(draft, draft.slice(0, Math.floor(draft.length * 0.85)))).toBe(true);
  });

  it("takes the first draft when nothing is accumulated yet", () => {
    expect(shouldReplaceBody(undefined, "A first hummingbird draft that is long enough.")).toBe(true);
    expect(shouldReplaceBody("", "")).toBe(false);
  });

  it("rejects a later truncated body so the hummingbird draft is kept", () => {
    const draft = "# Article\n\n" + "paragraph ".repeat(400);
    expect(shouldReplaceBody(draft, draft.slice(0, 80))).toBe(false);
  });
});

describe("later-agent task prompts", () => {
  it("tells later agents not to return a truncated body_markdown", () => {
    const ctx = {
      keyword: "content marketing strategy",
      format: "blog_post",
      brandName: "Acme Corp",
      previousOutput: { body_markdown: "# Draft\n\nLong enough." },
    };
    for (const agentId of ["spider", "fox", "mockingbird", "hawk", "chameleon"] as AgentId[]) {
      expect(buildAgentTaskPrompt(agentId, ctx)).toMatch(/Omit body_markdown|Include body_markdown only/i);
    }
  });
});
