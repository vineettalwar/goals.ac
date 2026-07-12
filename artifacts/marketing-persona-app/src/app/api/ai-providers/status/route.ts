import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { buildAiProviderStatus, probeOllama } from "@/lib/ai-providers-status";

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
