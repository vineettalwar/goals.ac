import { withCors } from "@workspace/cf-edge/cors";
import { getDb } from "@workspace/db";
import type { GoalsD1Database } from "@workspace/db/d1";
import {
  authenticateApiKey,
  checkApiKeyRateLimit,
} from "@workspace/content-engine/support/auth/api-key-auth";

export function db(): GoalsD1Database {
  return getDb() as GoalsD1Database;
}

export async function withPublicApiKey(
  request: Request,
  handler: (key: NonNullable<Awaited<ReturnType<typeof authenticateApiKey>>>) => Promise<Response>,
): Promise<Response> {
  const key = await authenticateApiKey(request.headers.get("authorization") ?? undefined);
  if (!key) {
    return withCors(request, Response.json({ error: "Unauthorized" }, { status: 401 }));
  }
  if (!checkApiKeyRateLimit(key)) {
    return withCors(request, Response.json({ error: "Rate limit exceeded" }, { status: 429 }));
  }
  try {
    return await handler(key);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    const status = message.includes("scope") ? 403 : message.includes("not found") ? 404 : 400;
    return withCors(request, Response.json({ error: message }, { status }));
  }
}
