import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { z } from "zod";

const ApiKeyBody = z.object({
  key: z.string().min(10, "API key is too short"),
});

export async function POST(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = ApiKeyBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  try {
    const { AnthropicClient } = await import("@workspace/ai-providers/anthropic");
    const client = AnthropicClient.create({ apiKey: parsed.data.key });
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
