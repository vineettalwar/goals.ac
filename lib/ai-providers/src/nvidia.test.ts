import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveProviderId } from "./config";
import { NvidiaClient, NVIDIA_BASE_URL } from "./nvidia";

describe("ai-providers nvidia", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("auto-detects nvidia when NVIDIA_API_KEY is set and no other provider wins", () => {
    vi.stubEnv("AI_PROVIDER", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("AI_INTEGRATIONS_GEMINI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("NVIDIA_API_KEY", "nvapi-test-key");

    expect(resolveProviderId()).toBe("nvidia");
  });

  it("posts to NVIDIA chat completions with a bearer token and skips json_object", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "ok" } }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = NvidiaClient.create({
      apiKey: "nvapi-test",
      model: "nvidia/nemotron-3.5-lightning-30b-a3b",
    });
    const result = await client.generate({
      prompt: "Reply ok",
      responseMimeType: "application/json",
    });

    expect(result.text).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${NVIDIA_BASE_URL}/chat/completions`);
    const headers = init.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer nvapi-test");
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.response_format).toBeUndefined();
  });
});
