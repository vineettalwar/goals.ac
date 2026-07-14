import { NextResponse } from "next/server";
import {
  authenticateApiKey,
  checkApiKeyRateLimit,
  requireApiKeyScope,
  type AuthenticatedApiKey,
} from "@workspace/content-engine/support/api-key-auth";

export async function withPublicApiKey(
  req: Request,
  handler: (key: AuthenticatedApiKey) => Promise<NextResponse>,
): Promise<NextResponse> {
  const key = await authenticateApiKey(req.headers.get("authorization") ?? undefined);
  if (!key) {
    return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  }
  if (!checkApiKeyRateLimit(key)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  try {
    return await handler(key);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    const status = message.includes("missing required scope") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export { requireApiKeyScope };
