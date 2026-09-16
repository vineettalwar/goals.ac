import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveProviderId } from "./config";
import { OpenRouterClient, OPENROUTER_BASE_URL } from "./openrouter";

describe("ai-providers openrouter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("auto-detects openrouter when OPENROUTER_API_KEY is set and no other provider wins", () => {
    vi.stubEnv("AI_PROVIDER", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("AI_INTEGRATIONS_GEMINI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("OPENROUTER_API_KEY", "or-test-key");
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("NVIDIA_API_KEY", "");

    expect(resolveProviderId()).toBe("openrouter");
  });

  it("posts to OpenRouter chat completions with attribution headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "ok" } }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = OpenRouterClient.create({ apiKey: "sk-or-test", model: "openai/gpt-4.1-mini" });
    const result = await client.generate({ prompt: "Reply ok" });

    expect(result.text).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${OPENROUTER_BASE_URL}/chat/completions`);
    const headers = init.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer sk-or-test");
    expect(headers["HTTP-Referer"]).toBe("https://goals.ac");
    expect(headers["X-Title"]).toBe("goals.ac");
  });
});
