import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { resetAiProviderClient } from "@workspace/ai-providers";
import { requireAuth } from "@/lib/require-auth";
import { buildAiProviderStatus, probeOllama } from "@/lib/ai-providers-status";

const PatchBody = z.object({
  provider: z.enum(["gemini", "bedrock", "ollama"]),
  ollamaBaseUrl: z.string().trim().optional().nullable(),
  ollamaModel: z.string().trim().optional().nullable(),
});

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const [user] = await db
    .select({
      aiProvider: usersTable.aiProvider,
      ollamaBaseUrl: usersTable.ollamaBaseUrl,
      ollamaModel: usersTable.ollamaModel,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId!))
    .limit(1);

  const payload = buildAiProviderStatus(user);
  payload.ollama.reachable = await probeOllama(payload.ollama.baseUrl);

  return NextResponse.json(payload);
}

export async function PATCH(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const { provider, ollamaBaseUrl, ollamaModel } = parsed.data;

  await db
    .update(usersTable)
    .set({
      aiProvider: provider,
      ollamaBaseUrl: provider === "ollama" ? (ollamaBaseUrl?.trim() || null) : null,
      ollamaModel: provider === "ollama" ? (ollamaModel?.trim() || null) : null,
    })
    .where(eq(usersTable.id, userId!));

  resetAiProviderClient();

  const [user] = await db
    .select({
      aiProvider: usersTable.aiProvider,
      ollamaBaseUrl: usersTable.ollamaBaseUrl,
      ollamaModel: usersTable.ollamaModel,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId!))
    .limit(1);

  const payload = buildAiProviderStatus(user);
  payload.ollama.reachable = await probeOllama(payload.ollama.baseUrl);

  return NextResponse.json(payload);
}
