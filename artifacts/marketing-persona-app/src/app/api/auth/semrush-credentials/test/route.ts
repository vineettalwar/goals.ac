import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getKeywordResearchProvider } from "@workspace/keyword-research-provider";
import { isSemrushDatabase } from "@workspace/keyword-research-provider";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const SemrushTestBody = z.object({
  apiKey: z.string().min(16, "API key is too short"),
  database: z
    .string()
    .trim()
    .toLowerCase()
    .refine(isSemrushDatabase, "Unsupported Semrush regional database"),
});

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const limited = await rateLimitResponse(
    `semrush-test:user:${userId}`,
    RATE_LIMITS.SEMRUSH_CREDENTIAL_TEST_PER_USER.limit,
    RATE_LIMITS.SEMRUSH_CREDENTIAL_TEST_PER_USER.windowMs,
  );
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = SemrushTestBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const { apiKey, database } = parsed.data;

  try {
    const provider = getKeywordResearchProvider();
    await provider.testConnection({ apiKey, database: database.toLowerCase() });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg });
  }
}
