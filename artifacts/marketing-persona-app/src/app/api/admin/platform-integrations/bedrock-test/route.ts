import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdminApi } from "@/lib/auth/require-platform-admin";
import { loadPlatformBedrockCredentials } from "@/lib/platform/platform-bedrock-admin";

const BedrockTestBody = z.object({
  apiKey: z.string().min(16).optional(),
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
  const apiKey = parsed.data.apiKey?.trim() || stored?.apiKey;
  const accessKeyId = parsed.data.accessKeyId?.trim() || stored?.accessKeyId;
  const secretAccessKey = parsed.data.secretAccessKey?.trim() || stored?.secretAccessKey;
  const sessionToken =
    parsed.data.sessionToken?.trim() || stored?.sessionToken || undefined;
  const region = parsed.data.region?.trim() || stored?.region;
  const model = parsed.data.model?.trim() || stored?.model;

  if (!apiKey && !(accessKeyId && secretAccessKey)) {
    return NextResponse.json(
      { ok: false, error: "Paste a Bedrock API key (or save one first) to test" },
      { status: 400 },
    );
  }

  try {
    const { testBedrockCredentials } = await import("@workspace/ai-providers/bedrock");
    await testBedrockCredentials(
      apiKey
        ? { apiKey, region, model }
        : { accessKeyId, secretAccessKey, sessionToken, region, model },
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { formatBedrockAuthError } = await import("@workspace/ai-providers/bedrock");
    return NextResponse.json({ ok: false, error: formatBedrockAuthError(err) });
  }
}
