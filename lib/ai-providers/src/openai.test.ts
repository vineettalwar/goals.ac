import { describe, expect, it } from "vitest";
import { resolveProviderId } from "./config";

describe("ai-providers openai", () => {
  it("auto-detects openai when OPENAI_API_KEY is set and no other provider wins", () => {
    const original = process.env.AI_PROVIDER;
    const originalOpenAI = process.env.OPENAI_API_KEY;
    const originalAnthropic = process.env.ANTHROPIC_API_KEY;
    const originalGemini = process.env.GEMINI_API_KEY;

    delete process.env.AI_PROVIDER;
    delete process.env.GEMINI_API_KEY;
    delete process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    process.env.OPENAI_API_KEY = "test-key";

    expect(resolveProviderId()).toBe("openai");

    if (original) process.env.AI_PROVIDER = original;
    else delete process.env.AI_PROVIDER;
    if (originalOpenAI) process.env.OPENAI_API_KEY = originalOpenAI;
    else delete process.env.OPENAI_API_KEY;
    if (originalAnthropic) process.env.ANTHROPIC_API_KEY = originalAnthropic;
    else delete process.env.ANTHROPIC_API_KEY;
    if (originalGemini) process.env.GEMINI_API_KEY = originalGemini;
  });
});
