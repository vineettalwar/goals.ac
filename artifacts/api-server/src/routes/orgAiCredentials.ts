import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, organizationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { requireSiteAdmin } from "../lib/orgAccess";
import { decryptSecret, encryptSecret } from "@workspace/security/encryption";
import { getOrgAiSettingsForUser } from "@workspace/content-engine/support/ai/org-ai-settings";
import { resetAiProviderClient } from "@workspace/ai-providers";

const router: IRouter = Router();

const ApiKeyBody = z.object({
  key: z.string().min(10, "API key is too short"),
});

const BedrockCredentialsBody = z.object({
  accessKeyId: z.string().min(16, "Access key ID is too short"),
  secretAccessKey: z.string().min(16, "Secret access key is too short"),
  sessionToken: z.string().trim().optional().nullable(),
  region: z.string().trim().min(1, "Region is required"),
  model: z.string().trim().min(1, "Model is required"),
});

function orgKeyLastFour(encrypted: string | null | undefined): string {
  if (!encrypted) return "••••";
  try {
    return decryptSecret(encrypted).slice(-4);
  } catch {
    return "••••";
  }
}

async function saveOrgApiKey(
  userId: number,
  column: "encryptedGeminiKey" | "encryptedOpenaiApiKey" | "encryptedAnthropicApiKey",
  key: string,
) {
  const orgSettings = await getOrgAiSettingsForUser(userId);
  if (!orgSettings) {
    throw new Error("ORG_NOT_FOUND");
  }

  await db
    .update(organizationsTable)
    .set({ [column]: encryptSecret(key) })
    .where(eq(organizationsTable.id, orgSettings.organizationId));

  resetAiProviderClient();
  return key.slice(-4);
}

async function deleteOrgApiKey(
  userId: number,
  column: "encryptedGeminiKey" | "encryptedOpenaiApiKey" | "encryptedAnthropicApiKey",
) {
  const orgSettings = await getOrgAiSettingsForUser(userId);
  if (!orgSettings) {
    throw new Error("ORG_NOT_FOUND");
  }

  await db
    .update(organizationsTable)
    .set({ [column]: null })
    .where(eq(organizationsTable.id, orgSettings.organizationId));

  resetAiProviderClient();
}

function registerSimpleKeyRoutes(
  path: string,
  getEncrypted: (settings: Awaited<ReturnType<typeof getOrgAiSettingsForUser>>) => string | null | undefined,
  column: "encryptedOpenaiApiKey" | "encryptedAnthropicApiKey",
  testClient: (key: string) => Promise<void>,
) {
  router.get(path, requireAuth, async (req, res) => {
    try {
      const orgSettings = await getOrgAiSettingsForUser(req.user!.userId);
      const encrypted = getEncrypted(orgSettings);
      if (!encrypted) {
        res.json({ hasKey: false });
        return;
      }
      res.json({ hasKey: true, lastFour: orgKeyLastFour(encrypted) });
    } catch (err) {
      req.log.error({ err }, `Failed to fetch ${path}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.post(`${path}/test`, requireAuth, async (req, res) => {
    const parsed = ApiKeyBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
      return;
    }
    try {
      await testClient(parsed.data.key);
      res.json({ ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.json({ ok: false, error: msg });
    }
  });

  router.patch(path, requireSiteAdmin, async (req, res) => {
    const parsed = ApiKeyBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
      return;
    }
    try {
      const lastFour = await saveOrgApiKey(req.user!.userId, column, parsed.data.key);
      res.json({ ok: true, hasKey: true, lastFour });
    } catch (err) {
      if (err instanceof Error && err.message === "ORG_NOT_FOUND") {
        res.status(404).json({ error: "Organization not found" });
        return;
      }
      req.log.error({ err }, `Failed to save ${path}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.delete(path, requireSiteAdmin, async (req, res) => {
    try {
      await deleteOrgApiKey(req.user!.userId, column);
      res.json({ ok: true });
    } catch (err) {
      if (err instanceof Error && err.message === "ORG_NOT_FOUND") {
        res.status(404).json({ error: "Organization not found" });
        return;
      }
      req.log.error({ err }, `Failed to delete ${path}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}

// Gemini (legacy path: /auth/api-key)
router.get("/auth/api-key", requireAuth, async (req, res) => {
  try {
    const orgSettings = await getOrgAiSettingsForUser(req.user!.userId);
    if (!orgSettings?.encryptedGeminiKey) {
      res.json({ hasKey: false });
      return;
    }
    res.json({ hasKey: true, lastFour: orgKeyLastFour(orgSettings.encryptedGeminiKey) });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch API key status");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/api-key/test", requireAuth, async (req, res) => {
  const parsed = ApiKeyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
    return;
  }
  try {
    const { createUserGeminiClient } = await import("@workspace/ai-providers");
    const client = await createUserGeminiClient(parsed.data.key);
    await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: "Reply with the single word: ok" }] }],
      config: { maxOutputTokens: 16, thinkingConfig: { thinkingBudget: 0 } },
    });
    res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.json({ ok: false, error: msg });
  }
});

router.patch("/auth/api-key", requireSiteAdmin, async (req, res) => {
  const parsed = ApiKeyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
    return;
  }
  try {
    const lastFour = await saveOrgApiKey(req.user!.userId, "encryptedGeminiKey", parsed.data.key);
    res.json({ ok: true, hasKey: true, lastFour });
  } catch (err) {
    if (err instanceof Error && err.message === "ORG_NOT_FOUND") {
      res.status(404).json({ error: "Organization not found" });
      return;
    }
    req.log.error({ err }, "Failed to save API key");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/auth/api-key", requireSiteAdmin, async (req, res) => {
  try {
    await deleteOrgApiKey(req.user!.userId, "encryptedGeminiKey");
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "ORG_NOT_FOUND") {
      res.status(404).json({ error: "Organization not found" });
      return;
    }
    req.log.error({ err }, "Failed to remove API key");
    res.status(500).json({ error: "Internal server error" });
  }
});

registerSimpleKeyRoutes(
  "/auth/openai-credentials",
  (settings) => settings?.encryptedOpenaiApiKey,
  "encryptedOpenaiApiKey",
  async (key) => {
    const { OpenAIClient } = await import("@workspace/ai-providers/openai");
    const client = OpenAIClient.create({ apiKey: key });
    await client.generate({ prompt: "Reply with the single word: ok", maxOutputTokens: 16 });
  },
);

registerSimpleKeyRoutes(
  "/auth/anthropic-credentials",
  (settings) => settings?.encryptedAnthropicApiKey,
  "encryptedAnthropicApiKey",
  async (key) => {
    const { AnthropicClient } = await import("@workspace/ai-providers/anthropic");
    const client = AnthropicClient.create({ apiKey: key });
    await client.generate({ prompt: "Reply with the single word: ok", maxOutputTokens: 16 });
  },
);

router.get("/auth/bedrock-credentials", requireAuth, async (req, res) => {
  try {
    const orgSettings = await getOrgAiSettingsForUser(req.user!.userId);
    if (!orgSettings?.encryptedBedrockAccessKeyId || !orgSettings?.encryptedBedrockSecretAccessKey) {
      res.json({ hasCredentials: false });
      return;
    }
    res.json({
      hasCredentials: true,
      accessKeyLastFour: orgKeyLastFour(orgSettings.encryptedBedrockAccessKeyId),
      region: orgSettings.bedrockRegion ?? null,
      model: orgSettings.bedrockModel ?? null,
      hasSessionToken: Boolean(orgSettings.encryptedBedrockSessionToken),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch Bedrock credentials");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/bedrock-credentials/test", requireAuth, async (req, res) => {
  const parsed = BedrockCredentialsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
    return;
  }
  const { accessKeyId, secretAccessKey, sessionToken, region, model } = parsed.data;
  try {
    const { BedrockClient } = await import("@workspace/ai-providers/bedrock");
    const client = await BedrockClient.create({
      accessKeyId,
      secretAccessKey,
      sessionToken: sessionToken?.trim() || undefined,
      region,
      model,
    });
    await client.generate({ prompt: "Reply with the single word: ok", maxOutputTokens: 16 });
    res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.json({ ok: false, error: msg });
  }
});

router.patch("/auth/bedrock-credentials", requireSiteAdmin, async (req, res) => {
  const parsed = BedrockCredentialsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
    return;
  }
  const orgSettings = await getOrgAiSettingsForUser(req.user!.userId);
  if (!orgSettings) {
    res.status(404).json({ error: "Organization not found" });
    return;
  }
  const { accessKeyId, secretAccessKey, sessionToken, region, model } = parsed.data;
  const sessionTokenTrimmed = sessionToken?.trim();
  try {
    await db
      .update(organizationsTable)
      .set({
        encryptedBedrockAccessKeyId: encryptSecret(accessKeyId),
        encryptedBedrockSecretAccessKey: encryptSecret(secretAccessKey),
        encryptedBedrockSessionToken: sessionTokenTrimmed ? encryptSecret(sessionTokenTrimmed) : null,
        bedrockRegion: region,
        bedrockModel: model,
      })
      .where(eq(organizationsTable.id, orgSettings.organizationId));
    resetAiProviderClient();
    res.json({
      ok: true,
      hasCredentials: true,
      accessKeyLastFour: accessKeyId.slice(-4),
      region,
      model,
      hasSessionToken: Boolean(sessionTokenTrimmed),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to save Bedrock credentials");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/auth/bedrock-credentials", requireSiteAdmin, async (req, res) => {
  const orgSettings = await getOrgAiSettingsForUser(req.user!.userId);
  if (!orgSettings) {
    res.status(404).json({ error: "Organization not found" });
    return;
  }
  try {
    await db
      .update(organizationsTable)
      .set({
        encryptedBedrockAccessKeyId: null,
        encryptedBedrockSecretAccessKey: null,
        encryptedBedrockSessionToken: null,
        bedrockRegion: null,
        bedrockModel: null,
      })
      .where(eq(organizationsTable.id, orgSettings.organizationId));
    resetAiProviderClient();
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete Bedrock credentials");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
