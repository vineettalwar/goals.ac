import { withCors } from "@workspace/cf-edge/cors";
import { db } from "@workspace/db";
import { projectRoadmapsTable, roadmapsTable } from "@workspace/db/schema-sqlite";
import { and, eq } from "drizzle-orm";
import { getAccessibleProject } from "./project-access";

export async function handleRoadmapPinWrite(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const match = path.match(/^\/api\/website-projects\/(\d+)\/roadmaps\/(\d+)$/);
  if (!match) return null;

  const projectId = Number.parseInt(match[1]!, 10);
  const roadmapId = Number.parseInt(match[2]!, 10);

  const project = await getAccessibleProject(projectId, userId);
  if (!project) {
    return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
  }

  if (request.method === "POST") {
    const [roadmap] = await db
      .select({ id: roadmapsTable.id })
      .from(roadmapsTable)
      .where(eq(roadmapsTable.id, roadmapId))
      .limit(1);

    if (!roadmap) {
      return withCors(request, Response.json({ error: "Roadmap not found" }, { status: 404 }));
    }

    await db
      .insert(projectRoadmapsTable)
      .values({ projectId, roadmapId })
      .onConflictDoNothing();

    return withCors(request, Response.json({ message: "Roadmap pinned to project" }, { status: 201 }));
  }

  if (request.method === "DELETE") {
    await db
      .delete(projectRoadmapsTable)
      .where(
        and(
          eq(projectRoadmapsTable.projectId, projectId),
          eq(projectRoadmapsTable.roadmapId, roadmapId),
        ),
      );

    return withCors(request, Response.json({ message: "Roadmap unpinned from project" }));
  }

  return null;
}
