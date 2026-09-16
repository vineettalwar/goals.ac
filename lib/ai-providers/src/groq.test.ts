import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveProviderId } from "./config";
import { GroqClient, GROQ_BASE_URL } from "./groq";

describe("ai-providers groq", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("auto-detects groq when GROQ_API_KEY is set and no other provider wins", () => {
    vi.stubEnv("AI_PROVIDER", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("AI_INTEGRATIONS_GEMINI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("GROQ_API_KEY", "gsk-test-key");
    vi.stubEnv("NVIDIA_API_KEY", "");
    vi.stubEnv("AWS_ACCESS_KEY_ID", "");
    vi.stubEnv("AWS_SECRET_ACCESS_KEY", "");
    vi.stubEnv("AWS_BEARER_TOKEN_BEDROCK", "");

    expect(resolveProviderId()).toBe("groq");
  });

  it("posts to Groq chat completions with a bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "ok" } }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = GroqClient.create({ apiKey: "gsk-test", model: "openai/gpt-oss-20b" });
    const result = await client.generate({ prompt: "Reply ok" });

    expect(result.text).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${GROQ_BASE_URL}/chat/completions`);
    const headers = init.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer gsk-test");
  });
});
