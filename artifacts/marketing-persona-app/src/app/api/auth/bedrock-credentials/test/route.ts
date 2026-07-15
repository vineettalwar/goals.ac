import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { z } from "zod";

const BedrockTestBody = z.object({
  accessKeyId: z.string().min(16, "Access key ID is too short"),
  secretAccessKey: z.string().min(16, "Secret access key is too short"),
  sessionToken: z.string().trim().optional().nullable(),
  region: z.string().trim().min(1, "Region is required"),
  model: z.string().trim().min(1, "Model is required"),
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
    await client.generate({
      prompt: "Reply with the single word: ok",
      maxOutputTokens: 16,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg });
  }
}
