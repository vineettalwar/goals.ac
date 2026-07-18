import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdminApi } from "@/lib/auth/require-platform-admin";
import { loadPlatformBedrockCredentials } from "@/lib/platform/platform-bedrock-admin";

const Body = z.object({
  apiKey: z.string().min(16).optional(),
});

export async function POST(req: Request) {
  const admin = await requirePlatformAdminApi();
  if (admin.error) return admin.error;

  const body = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const stored = await loadPlatformBedrockCredentials();
  const apiKey = parsed.data.apiKey?.trim() || stored?.apiKey;
  const credentials = apiKey
    ? { apiKey, region: stored?.region, model: stored?.model }
    : stored;

  if (!credentials) {
    return NextResponse.json(
      { error: "Paste a Bedrock API key (or save platform credentials) to load models." },
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
