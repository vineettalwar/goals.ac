import { NextResponse } from "next/server";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import { getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/auth/rate-limit";
import { normalizeHttpUrl } from "@/lib/utils/normalize-url";
import { z } from "zod";

const Body = z.object({
  url: z.string().min(1).transform(normalizeHttpUrl).pipe(z.string().url()),
});

/** Shared gate for public free-tool POSTs: rate limit → URL normalize → SSRF check → run. */
export async function runPublicFreeTool(
  req: Request,
  run: (url: string) => Promise<object>,
): Promise<Response> {
  const ip = getClientIp(req);
  const limited = await rateLimitResponse(
    `public-free-tool:ip:${ip}`,
    RATE_LIMITS.PUBLIC_FREE_TOOLS_PER_IP.limit,
    RATE_LIMITS.PUBLIC_FREE_TOOLS_PER_IP.windowMs,
  );
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Valid URL required" }, { status: 400 });
  }

  try {
    await assertPublicUrl(parsed.data.url);
    const data = await run(parsed.data.url);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 422 });
  }
}
