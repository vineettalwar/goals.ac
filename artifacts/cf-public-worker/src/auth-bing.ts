import type { GoalsD1Database } from "@workspace/db/d1";
import {
  handleSearchPropertyCallback,
  startSearchPropertyOAuth,
  type SearchPropertyAuthEnv,
} from "./search-property-oauth-shared";

export async function handleBingAuthStart(
  request: Request,
  env: SearchPropertyAuthEnv,
  database: GoalsD1Database,
): Promise<Response> {
  try {
    return await startSearchPropertyOAuth(request, env, database, "bing_webmaster");
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Bing Webmaster OAuth failed" },
      { status: 503 },
    );
  }
}

export async function handleBingAuthCallback(
  request: Request,
  env: SearchPropertyAuthEnv,
  database: GoalsD1Database,
): Promise<Response> {
  return handleSearchPropertyCallback(request, env, database, "bing_webmaster");
}
