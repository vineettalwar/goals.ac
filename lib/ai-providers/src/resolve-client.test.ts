import { describe, expect, it } from "vitest";
import { assertOllamaReachableHere, isLoopbackOllamaUrl } from "./resolve-client";

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

describe("assertOllamaReachableHere", () => {
  it("allows laptop Ollama on local Node", () => {
    expect(() => assertOllamaReachableHere("http://localhost:11434", false)).not.toThrow();
  });

  it("refuses laptop Ollama on Cloudflare Workers", () => {
    expect(() => assertOllamaReachableHere("http://localhost:11434", true)).toThrow(/not reachable from Cloudflare/);
  });
});

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
