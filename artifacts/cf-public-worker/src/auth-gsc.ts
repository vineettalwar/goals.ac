import type { GoalsD1Database } from "@workspace/db/d1";
import {
  handleSearchPropertyCallback,
  startSearchPropertyOAuth,
  type SearchPropertyAuthEnv,
} from "./search-property-oauth-shared";

export async function handleGscAuthStart(
  request: Request,
  env: SearchPropertyAuthEnv,
  database: GoalsD1Database,
): Promise<Response> {
  try {
    return await startSearchPropertyOAuth(request, env, database, "google_search_console");
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Google Search Console OAuth failed" },
      { status: 503 },
    );
  }
}

export async function handleGscAuthCallback(
  request: Request,
  env: SearchPropertyAuthEnv,
  database: GoalsD1Database,
): Promise<Response> {
  return handleSearchPropertyCallback(request, env, database, "google_search_console");
}
