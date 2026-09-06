import { withCors } from "@workspace/cf-edge/cors";
import {
  encryptStoredTokens,
  listPropertiesForProvider,
  parseStoredTokens,
  resolveAccessToken,
  type SearchPropertyTokenEnv,
} from "@workspace/cf-edge/search-property-client";
import { db } from "./db";
import {
  SEARCH_PROPERTY_PROVIDERS,
  searchPropertyConnectionsTable,
  type SearchPropertyProvider,
} from "@workspace/db/schema-sqlite";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getAccessibleProject } from "./project-access";

const selectPropertyBody = z.object({
  provider: z.enum(["google_search_console", "bing_webmaster"]),
  propertyUrl: z.string().min(1),
});

export async function handleSearchPropertiesWrite(
  request: Request,
  path: string,
  userId: number,
  env: SearchPropertyTokenEnv,
): Promise<Response | null> {
  const baseMatch = path.match(/^\/api\/website-projects\/(\d+)\/search-properties$/);
  if (!baseMatch) return null;

  const projectId = Number.parseInt(baseMatch[1]!, 10);

  if (request.method === "DELETE") {
    const provider = new URL(request.url).searchParams.get("provider") as SearchPropertyProvider | null;
    if (!provider || !SEARCH_PROPERTY_PROVIDERS.includes(provider)) {
      return withCors(
        request,
        Response.json({ error: "provider query param is required" }, { status: 400 }),
      );
    }

    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }

    await db
      .delete(searchPropertyConnectionsTable)
      .where(
        and(
          eq(searchPropertyConnectionsTable.projectId, projectId),
          eq(searchPropertyConnectionsTable.provider, provider),
        ),
      );

    return withCors(request, Response.json({ ok: true }));
  }

  if (request.method === "PATCH") {
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }

    const parsed = selectPropertyBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(request, Response.json({ error: "Invalid request body" }, { status: 400 }));
    }

    const { provider, propertyUrl } = parsed.data;

    const [connection] = await db
      .select({
        id: searchPropertyConnectionsTable.id,
        encryptedTokens: searchPropertyConnectionsTable.encryptedTokens,
      })
      .from(searchPropertyConnectionsTable)
      .where(
        and(
          eq(searchPropertyConnectionsTable.projectId, projectId),
          eq(searchPropertyConnectionsTable.provider, provider),
        ),
      )
      .limit(1);

    if (!connection) {
      return withCors(request, Response.json({ error: "Connect this provider first" }, { status: 404 }));
    }

    try {
      let tokens = parseStoredTokens(connection.encryptedTokens);
      const resolved = await resolveAccessToken(provider, tokens, env);
      tokens = resolved.tokens;

      if (resolved.refreshed) {
        await db
          .update(searchPropertyConnectionsTable)
          .set({ encryptedTokens: encryptStoredTokens(tokens) })
          .where(eq(searchPropertyConnectionsTable.id, connection.id));
      }

      const available = await listPropertiesForProvider(provider, resolved.accessToken);
      if (!available.includes(propertyUrl)) {
        return withCors(
          request,
          Response.json({ error: "Property is not in your verified account" }, { status: 400 }),
        );
      }

      await db
        .update(searchPropertyConnectionsTable)
        .set({
          propertyUrl,
          propertyVerified: true,
        })
        .where(eq(searchPropertyConnectionsTable.id, connection.id));

      return withCors(request, Response.json({ ok: true }));
    } catch {
      return withCors(
        request,
        Response.json({ error: "Failed to save property selection" }, { status: 502 }),
      );
    }
  }

  return null;
}
