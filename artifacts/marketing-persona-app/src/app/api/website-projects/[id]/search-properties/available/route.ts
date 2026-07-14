import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { SEARCH_PROPERTY_PROVIDERS, searchPropertyConnectionsTable, websiteProjectsTable } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import type { SearchPropertyProvider } from "@/lib/integrations/search/search-property-types";
import {
  listPropertiesForProvider,
  parseStoredTokens,
  rankProperties,
  resolveAccessToken,
  encryptStoredTokens,
} from "@/lib/integrations/search/search-property-client";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const projectId = Number(id);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const provider = new URL(req.url).searchParams.get("provider") as SearchPropertyProvider | null;
  if (!provider || !SEARCH_PROPERTY_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "provider query param is required" }, { status: 400 });
  }

  const [project] = await db
    .select({ url: websiteProjectsTable.url })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

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
    return NextResponse.json({ error: "Connect this provider first" }, { status: 404 });
  }

  try {
    let tokens = parseStoredTokens(connection.encryptedTokens);
    const resolved = await resolveAccessToken(provider, tokens);
    tokens = resolved.tokens;

    if (resolved.refreshed) {
      await db
        .update(searchPropertyConnectionsTable)
        .set({ encryptedTokens: encryptStoredTokens(tokens) })
        .where(eq(searchPropertyConnectionsTable.id, connection.id));
    }

    const rawProperties = await listPropertiesForProvider(provider, resolved.accessToken);
    const properties = rankProperties(project.url, rawProperties);

    return NextResponse.json({ properties, projectUrl: project.url });
  } catch {
    return NextResponse.json({ error: "Failed to load verified properties" }, { status: 502 });
  }
}
