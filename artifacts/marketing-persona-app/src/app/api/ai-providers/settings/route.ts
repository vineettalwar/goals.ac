import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@workspace/db";
import { organizationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { resetAiProviderClient, requireOllamaReachable } from "@workspace/ai-providers";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireSiteAdmin } from "@/lib/auth/require-site-admin";
import { getOrgAiSettingsForUser } from "@workspace/content-engine/support/ai/org-ai-settings";
import { buildAiProviderStatus, enrichOllamaStatus, toAiProviderOptions } from "@/lib/platform/ai-providers-status";

const PatchBody = z.object({
  provider: z.enum(["gemini", "bedrock", "ollama", "openai", "anthropic", "openrouter", "groq", "nvidia"]),
  ollamaBaseUrl: z.string().trim().optional().nullable(),
  ollamaModel: z.string().trim().optional().nullable(),
  openrouterModel: z.string().trim().optional().nullable(),
  nvidiaModel: z.string().trim().optional().nullable(),
});

function toStatusInput(
  settings: Awaited<ReturnType<typeof getOrgAiSettingsForUser>>,
) {
  return settings
    ? {
        aiProvider: settings.aiProvider,
        ollamaBaseUrl: settings.ollamaBaseUrl,
        ollamaModel: settings.ollamaModel,
        openrouterModel: settings.openrouterModel,
        nvidiaModel: settings.nvidiaModel,
      }
    : undefined;
}

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const orgSettings = await getOrgAiSettingsForUser(userId!);
  const payload = buildAiProviderStatus(toStatusInput(orgSettings));
  await enrichOllamaStatus(payload, toAiProviderOptions(toStatusInput(orgSettings)));

  return NextResponse.json(payload);
}

export async function PATCH(req: Request) {
  const { userId, error } = await requireSiteAdmin();
  if (error) return error;

  const orgSettings = await getOrgAiSettingsForUser(userId!);
  if (!orgSettings) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const { provider, ollamaBaseUrl, ollamaModel, openrouterModel, nvidiaModel } = parsed.data;

  if (provider === "ollama") {
    try {
      await requireOllamaReachable(ollamaBaseUrl?.trim() || "http://localhost:11434");
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Ollama is not reachable" },
        { status: 400 },
      );
    }
  }

  await db
    .update(organizationsTable)
    .set({
      aiProvider: provider,
      ollamaBaseUrl: provider === "ollama" ? (ollamaBaseUrl?.trim() || null) : null,
      ollamaModel: provider === "ollama" ? (ollamaModel?.trim() || null) : null,
      openrouterModel: provider === "openrouter" ? (openrouterModel?.trim() || null) : null,
      nvidiaModel: provider === "nvidia" ? (nvidiaModel?.trim() || null) : null,
    })
    .where(eq(organizationsTable.id, orgSettings.organizationId));

  resetAiProviderClient();

  const updated = await getOrgAiSettingsForUser(userId!);
  const payload = buildAiProviderStatus(toStatusInput(updated));
  await enrichOllamaStatus(payload, toAiProviderOptions(toStatusInput(updated)));

  return NextResponse.json(payload);
}
