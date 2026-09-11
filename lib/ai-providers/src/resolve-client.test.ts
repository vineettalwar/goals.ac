import { describe, expect, it } from "vitest";
import { isLoopbackOllamaUrl } from "./resolve-client";

describe("isLoopbackOllamaUrl", () => {
  it("detects laptop Ollama hosts", () => {
    expect(isLoopbackOllamaUrl("http://localhost:11434")).toBe(true);
    expect(isLoopbackOllamaUrl("http://127.0.0.1:11434")).toBe(true);
    expect(isLoopbackOllamaUrl("http://ollama.local:11434")).toBe(true);
  });

  it("allows remote Ollama hosts", () => {
    expect(isLoopbackOllamaUrl("https://ollama.example.com")).toBe(false);
  });
});
