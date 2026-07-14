import { Router } from "express";
import { z } from "zod";
import { db, organizationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { requireSiteAdmin } from "../lib/orgAccess";
import {
  getOrgAiSettingsForUser,
  hasOrgBedrockCredentials,
} from "@workspace/content-engine/support/ai/org-ai-settings";
import {
  isBedrockEnvConfigured,
  resetAiProviderClient,
  resolveOllamaConfigAsync,
  resolveProviderId,
} from "@workspace/ai-providers";

const router = Router();

function env(key: string): string | undefined {
  const v = process.env[key];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

const PatchBody = z.object({
  provider: z.enum(["gemini", "bedrock", "ollama", "openai", "anthropic"]),
  ollamaBaseUrl: z.string().trim().optional().nullable(),
  ollamaModel: z.string().trim().optional().nullable(),
});

async function buildStatusPayload(userId: number) {
  const orgSettings = await getOrgAiSettingsForUser(userId);
  const aiProviderOptions = orgSettings
    ? {
        providerId: orgSettings.aiProvider as "gemini" | "bedrock" | "ollama" | "openai" | "anthropic" | null,
        ollamaBaseUrl: orgSettings.ollamaBaseUrl,
        ollamaModel: orgSettings.ollamaModel,
      }
    : undefined;

  const activeProvider = resolveProviderId(aiProviderOptions);
  const geminiConfigured =
    !!(env("GEMINI_API_KEY") || env("AI_INTEGRATIONS_GEMINI_API_KEY")) ||
    Boolean(orgSettings?.encryptedGeminiKey);
  const openaiConfigured = !!env("OPENAI_API_KEY") || Boolean(orgSettings?.encryptedOpenaiApiKey);
  const anthropicConfigured = !!env("ANTHROPIC_API_KEY") || Boolean(orgSettings?.encryptedAnthropicApiKey);
  const bedrockConfigured = isBedrockEnvConfigured() || hasOrgBedrockCredentials(orgSettings);

  let ollamaReachable = false;
  const ollamaBaseUrl =
    orgSettings?.ollamaBaseUrl?.trim() || env("OLLAMA_BASE_URL") || "http://localhost:11434";
  let ollamaModel = orgSettings?.ollamaModel?.trim() || env("OLLAMA_MODEL") || "";

  if (activeProvider === "ollama" || orgSettings?.ollamaBaseUrl || env("OLLAMA_BASE_URL")) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const resp = await fetch(`${ollamaBaseUrl}/api/tags`, { signal: controller.signal });
      clearTimeout(timeout);
      ollamaReachable = resp.ok;
      if (ollamaReachable) {
        const resolved = await resolveOllamaConfigAsync(aiProviderOptions);
        ollamaModel = resolved.model;
      }
    } catch {
      ollamaReachable = false;
    }
  }

  const ready =
    activeProvider === "gemini"
      ? geminiConfigured
      : activeProvider === "openai"
        ? openaiConfigured
        : activeProvider === "anthropic"
          ? anthropicConfigured
          : activeProvider === "bedrock"
            ? bedrockConfigured
            : ollamaReachable || activeProvider === "ollama";

  return {
    activeProvider,
    ready,
    source: orgSettings?.aiProvider ? "app" : env("AI_PROVIDER") ? "env" : "auto",
    settings: {
      provider: orgSettings?.aiProvider ?? null,
      ollamaBaseUrl: orgSettings?.ollamaBaseUrl ?? null,
      ollamaModel: orgSettings?.ollamaModel ?? null,
    },
    gemini: {
      configured: geminiConfigured,
      source: orgSettings?.encryptedGeminiKey ? "org-key" : env("GEMINI_API_KEY") ? "env" : null,
    },
    openai: {
      configured: openaiConfigured,
      source: orgSettings?.encryptedOpenaiApiKey ? "org-key" : env("OPENAI_API_KEY") ? "env" : null,
    },
    anthropic: {
      configured: anthropicConfigured,
      source: orgSettings?.encryptedAnthropicApiKey ? "org-key" : env("ANTHROPIC_API_KEY") ? "env" : null,
    },
    bedrock: {
      configured: bedrockConfigured,
      region:
        orgSettings?.bedrockRegion ??
        env("AWS_REGION") ??
        env("AWS_DEFAULT_REGION") ??
        (bedrockConfigured ? "us-east-1" : null),
      model: orgSettings?.bedrockModel ?? env("BEDROCK_MODEL") ?? null,
      source: hasOrgBedrockCredentials(orgSettings) ? "org-key" : bedrockConfigured ? "env" : null,
    },
    ollama: {
      configured: activeProvider === "ollama" || !!orgSettings?.ollamaBaseUrl || !!env("OLLAMA_BASE_URL"),
      baseUrl: ollamaBaseUrl,
      model: ollamaModel,
      reachable: ollamaReachable,
    },
  };
}

router.get("/ai-providers/status", requireAuth, async (req, res) => {
  res.json(await buildStatusPayload(req.user!.userId));
});

router.get("/ai-providers/settings", requireAuth, async (req, res) => {
  res.json(await buildStatusPayload(req.user!.userId));
});

router.patch("/ai-providers/settings", requireSiteAdmin, async (req, res) => {
  const orgSettings = await getOrgAiSettingsForUser(req.user!.userId);
  if (!orgSettings) {
    res.status(404).json({ error: "Organization not found" });
    return;
  }

  const parsed = PatchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
    return;
  }

  const { provider, ollamaBaseUrl, ollamaModel } = parsed.data;

  await db
    .update(organizationsTable)
    .set({
      aiProvider: provider,
      ollamaBaseUrl: provider === "ollama" ? (ollamaBaseUrl?.trim() || null) : null,
      ollamaModel: provider === "ollama" ? (ollamaModel?.trim() || null) : null,
    })
    .where(eq(organizationsTable.id, orgSettings.organizationId));

  resetAiProviderClient();
  res.json(await buildStatusPayload(req.user!.userId));
});

export default router;
