import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { z } from "zod";
import { getDecryptedBedrockCredentialsForUser } from "@workspace/content-engine/support/ai/org-ai-settings";

const Body = z.object({
  apiKey: z.string().min(16).optional(),
});

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const apiKey = parsed.data.apiKey?.trim();
  const credentials = apiKey
    ? { apiKey }
    : await getDecryptedBedrockCredentialsForUser(userId!);
  if (!credentials) {
    return NextResponse.json(
      { error: "Paste a Bedrock API key to load models available for this account." },
      { status: 400 },
    );
  }

  try {
    const { listBedrockChatModels } = await import("@workspace/ai-providers/bedrock");
    const models = await listBedrockChatModels(credentials);
    return NextResponse.json({ models });
  } catch (err) {
    const { formatBedrockAuthError } = await import("@workspace/ai-providers/bedrock");
    return NextResponse.json({ error: formatBedrockAuthError(err) }, { status: 502 });
  }
}
