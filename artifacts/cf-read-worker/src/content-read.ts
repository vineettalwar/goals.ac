import { db } from "./db";
import { contentPiecesTable, goalsTable, briefsTable } from "@workspace/db/schema-sqlite";
import { and, desc, eq, getTableColumns, inArray } from "drizzle-orm";
import { withCors } from "@workspace/cf-edge/cors";
import {
  getAccessibleProject,
  listAccessibleProjectIds,
  parsePositiveInt,
} from "./project-access";

export async function handleContentRead(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const url = new URL(request.url);

  if (path === "/api/goals" && request.method === "GET") {
    const projectId = parsePositiveInt(url.searchParams.get("projectId"));
    if (!projectId) {
      return withCors(request, Response.json({ error: "projectId is required" }, { status: 400 }));
    }
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const goals = await db
      .select(getTableColumns(goalsTable))
      .from(goalsTable)
      .where(eq(goalsTable.projectId, projectId))
      .orderBy(desc(goalsTable.updatedAt));
    return withCors(request, Response.json({ goals }));
  }

  if (path === "/api/briefs" && request.method === "GET") {
    const projectId = parsePositiveInt(url.searchParams.get("projectId"));
    if (!projectId) {
      return withCors(request, Response.json({ error: "projectId required" }, { status: 400 }));
    }
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const briefs = await db
      .select(getTableColumns(briefsTable))
      .from(briefsTable)
      .innerJoin(goalsTable, eq(briefsTable.goalId, goalsTable.id))
      .where(eq(goalsTable.projectId, projectId))
      .orderBy(desc(briefsTable.updatedAt));
    return withCors(request, Response.json({ briefs }));
  }

  const contentMatch = path.match(/^\/api\/content-pieces\/(\d+)$/);
  if (contentMatch && request.method === "GET") {
    const id = Number.parseInt(contentMatch[1]!, 10);
    const accessibleIds = await listAccessibleProjectIds(userId);
    if (accessibleIds.length === 0) {
      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    }
    const [piece] = await db
      .select(getTableColumns(contentPiecesTable))
      .from(contentPiecesTable)
      .where(
        and(
          eq(contentPiecesTable.id, id),
          inArray(contentPiecesTable.websiteProjectId, accessibleIds),
        ),
      )
      .limit(1);
    if (!piece) {
      return withCors(
        request,
        Response.json({ error: "Content piece not found" }, { status: 404 }),
      );
    }
    return withCors(request, Response.json(piece));
  }

  if (path === "/api/content-pieces" && request.method === "GET") {
    const accessibleIds = await listAccessibleProjectIds(userId);
    const pieces =
      accessibleIds.length === 0
        ? []
        : await db
            .select(getTableColumns(contentPiecesTable))
            .from(contentPiecesTable)
            .where(inArray(contentPiecesTable.websiteProjectId, accessibleIds))
            .orderBy(desc(contentPiecesTable.updatedAt))
            .limit(100);
    return withCors(request, Response.json(pieces));
  }

  return null;
}
