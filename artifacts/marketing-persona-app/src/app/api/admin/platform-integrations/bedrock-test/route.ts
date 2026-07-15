import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdminApi } from "@/lib/auth/require-platform-admin";
import { loadPlatformBedrockCredentials } from "@workspace/platform-admin/platform-bedrock";

const BedrockTestBody = z.object({
  accessKeyId: z.string().min(16).optional(),
  secretAccessKey: z.string().min(16).optional(),
  sessionToken: z.string().trim().optional().nullable(),
  region: z.string().trim().min(1).optional(),
  model: z.string().trim().min(1).optional(),
});

export async function POST(req: Request) {
  const admin = await requirePlatformAdminApi();
  if (admin.error) return admin.error;

  const body = await req.json().catch(() => null);
  const parsed = BedrockTestBody.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const stored = await loadPlatformBedrockCredentials();
  const accessKeyId = parsed.data.accessKeyId?.trim() || stored?.accessKeyId;
  const secretAccessKey = parsed.data.secretAccessKey?.trim() || stored?.secretAccessKey;
  const sessionToken =
    parsed.data.sessionToken?.trim() || stored?.sessionToken || undefined;
  const region = parsed.data.region?.trim() || stored?.region;
  const model = parsed.data.model?.trim() || stored?.model;

  if (!accessKeyId || !secretAccessKey || !region || !model) {
    return NextResponse.json(
      { ok: false, error: "Access key, secret, region, and model are required to test" },
      { status: 400 },
    );
  }

  try {
    const { BedrockClient } = await import("@workspace/ai-providers/bedrock");
    const client = await BedrockClient.create({
      accessKeyId,
      secretAccessKey,
      sessionToken,
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
