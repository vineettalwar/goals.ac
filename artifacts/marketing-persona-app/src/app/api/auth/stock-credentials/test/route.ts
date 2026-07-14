import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import { isStockProviderId, testStockProviderConnection } from "@workspace/stock-images";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/auth/rate-limit";

const StockTestBody = z.object({
  provider: z.string().refine(isStockProviderId, "Unknown stock provider"),
  apiKey: z.string().min(8, "API key is too short"),
});

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const limited = await rateLimitResponse(
    `stock-test:user:${userId}`,
    RATE_LIMITS.SEMRUSH_CREDENTIAL_TEST_PER_USER.limit,
    RATE_LIMITS.SEMRUSH_CREDENTIAL_TEST_PER_USER.windowMs,
  );
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = StockTestBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const result = await testStockProviderConnection(parsed.data.provider, parsed.data.apiKey);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error });
  }
  return NextResponse.json({ ok: true, note: result.note });
}
