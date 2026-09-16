import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertOllamaReachableHere,
  isLoopbackOllamaUrl,
  probeOllamaReachable,
  requireOllamaReachable,
} from "./resolve-client";

describe("isLoopbackOllamaUrl", () => {
  it("detects laptop Ollama hosts", () => {
    expect(isLoopbackOllamaUrl("http://localhost:11434")).toBe(true);
    expect(isLoopbackOllamaUrl("http://127.0.0.1:11434")).toBe(true);
    expect(isLoopbackOllamaUrl("http://ollama.local:11434")).toBe(true);
  });

  it("allows remote Ollama hosts", () => {
    expect(isLoopbackOllamaUrl("https://ollama.example.com")).toBe(false);
  });

  it("treats LAN IPs as unreachable from production", () => {
    expect(isLoopbackOllamaUrl("http://192.168.1.10:11434")).toBe(true);
    expect(isLoopbackOllamaUrl("http://10.0.0.8:11434")).toBe(true);
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

describe("probeOllamaReachable", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("does not fetch loopback Ollama on Cloudflare", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await probeOllamaReachable("http://localhost:11434", true)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns true when /api/tags succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true }),
    );
    expect(await probeOllamaReachable("https://ollama.example.com", true)).toBe(true);
  });
});

describe("requireOllamaReachable", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rejects localhost on Cloudflare before probing", async () => {
    await expect(requireOllamaReachable("http://localhost:11434", true)).rejects.toThrow(
      /not reachable from Cloudflare/,
    );
  });
});
