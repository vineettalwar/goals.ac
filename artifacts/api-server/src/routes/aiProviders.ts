import { Router } from "express";
import { requireAuth } from "../lib/auth";
import { isBedrockEnvConfigured, resolveOllamaConfigAsync } from "@workspace/ai-providers";

const router = Router();

function env(key: string): string | undefined {
  const v = process.env[key];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

router.get("/ai-providers/status", requireAuth, async (_req, res) => {
  const activeProvider = env("AI_PROVIDER") ?? "gemini";

  const geminiConfigured = !!(env("GEMINI_API_KEY") || env("AI_INTEGRATIONS_GEMINI_API_KEY"));
  const geminiSource = env("AI_INTEGRATIONS_GEMINI_API_KEY")
    ? "replit-proxy"
    : env("GEMINI_API_KEY")
      ? "env-key"
      : null;

  const bedrockConfigured = isBedrockEnvConfigured();

  let ollamaReachable = false;
  const ollamaBaseUrl = env("OLLAMA_BASE_URL") ?? "http://localhost:11434";
  let ollamaModel = env("OLLAMA_MODEL") ?? "";

  if (activeProvider === "ollama" || env("OLLAMA_BASE_URL")) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const resp = await fetch(`${ollamaBaseUrl}/api/tags`, { signal: controller.signal });
      clearTimeout(timeout);
      ollamaReachable = resp.ok;
      if (ollamaReachable) {
        const resolved = await resolveOllamaConfigAsync();
        ollamaModel = resolved.model;
      }
    } catch {
      ollamaReachable = false;
    }
  }

  res.json({
    activeProvider,
    gemini: {
      configured: geminiConfigured,
      source: geminiSource,
    },
    bedrock: {
      configured: bedrockConfigured,
      region: env("AWS_REGION") ?? env("AWS_DEFAULT_REGION") ?? (bedrockConfigured ? "us-east-1" : null),
      model: env("BEDROCK_MODEL") ?? null,
    },
    ollama: {
      configured: activeProvider === "ollama" || !!env("OLLAMA_BASE_URL"),
      baseUrl: ollamaBaseUrl,
      model: ollamaModel,
      reachable: ollamaReachable,
    },
  });
});

export default router;
