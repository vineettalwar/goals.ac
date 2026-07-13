import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { analyticsPropertyConnectionsTable, websiteProjectsTable } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { requireProjectAccess } from "@/lib/project-access";
import {
  encryptStoredTokens,
  listGa4PropertiesForConnection,
  parseStoredTokens,
  rankProperties,
  resolveAccessToken,
} from "@/lib/analytics-property-client";

export async function GET(
  _req: Request,
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
      id: analyticsPropertyConnectionsTable.id,
      encryptedTokens: analyticsPropertyConnectionsTable.encryptedTokens,
    })
    .from(analyticsPropertyConnectionsTable)
    .where(
      and(
        eq(analyticsPropertyConnectionsTable.projectId, projectId),
        eq(analyticsPropertyConnectionsTable.provider, "google_analytics_4"),
      ),
    )
    .limit(1);

  if (!connection) {
    return NextResponse.json({ error: "Connect Google Analytics first" }, { status: 404 });
  }

  try {
    let tokens = parseStoredTokens(connection.encryptedTokens);
    const resolved = await resolveAccessToken(tokens);
    tokens = resolved.tokens;

    if (resolved.refreshed) {
      await db
        .update(analyticsPropertyConnectionsTable)
        .set({ encryptedTokens: encryptStoredTokens(tokens) })
        .where(eq(analyticsPropertyConnectionsTable.id, connection.id));
    }

    const rawProperties = await listGa4PropertiesForConnection(resolved.accessToken);
    const properties = rankProperties(project.url, rawProperties);

    return NextResponse.json({ properties, projectUrl: project.url });
  } catch {
    return NextResponse.json({ error: "Failed to load verified properties" }, { status: 502 });
  }
}
