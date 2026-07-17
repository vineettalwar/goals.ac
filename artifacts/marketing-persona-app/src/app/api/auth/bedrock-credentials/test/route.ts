import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { z } from "zod";

const BedrockTestBody = z.object({
  apiKey: z.string().min(16, "API key is too short"),
  model: z.string().trim().min(1, "Choose a Bedrock model"),
});

export async function POST(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = BedrockTestBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  try {
    const { testBedrockCredentials } = await import("@workspace/ai-providers/bedrock");
    await testBedrockCredentials({
      apiKey: parsed.data.apiKey.trim(),
      model: parsed.data.model.trim(),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { formatBedrockAuthError } = await import("@workspace/ai-providers/bedrock");
    return NextResponse.json({ ok: false, error: formatBedrockAuthError(err) });
  }
}
