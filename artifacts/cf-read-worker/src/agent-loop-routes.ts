import { desc, eq } from "drizzle-orm";
import { withCors } from "@workspace/cf-edge/cors";
import { presentAgentRun, presentAgentRunListItem } from "@workspace/content-engine/agent-loop";
import { db } from "./db";
import { agentActionItemsTable, agentRunsTable } from "@workspace/db/schema-sqlite";
import { getAccessibleProject } from "./project-access";

export async function handleAgentLoopRead(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const method = request.method;
  const url = new URL(request.url);

  const actionsMatch = path.match(/^\/api\/website-projects\/(\d+)\/agent-actions$/);
  if (actionsMatch && method === "GET") {
    const projectId = Number.parseInt(actionsMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const status = url.searchParams.get("status");
    const rows = await db
      .select()
      .from(agentActionItemsTable)
      .where(eq(agentActionItemsTable.websiteProjectId, projectId))
      .orderBy(desc(agentActionItemsTable.opportunityScore))
      .limit(100);
    const items = status ? rows.filter((row) => row.status === status) : rows;
    return withCors(request, Response.json({ items }));
  }

  const runsMatch = path.match(/^\/api\/website-projects\/(\d+)\/agent-runs$/);
  if (runsMatch && method === "GET") {
    const projectId = Number.parseInt(runsMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const runs = await db
      .select()
      .from(agentRunsTable)
      .where(eq(agentRunsTable.websiteProjectId, projectId))
      .orderBy(desc(agentRunsTable.createdAt))
      .limit(30);
    return withCors(request, Response.json({ runs: runs.map(presentAgentRunListItem) }));
  }

  const runMatch = path.match(/^\/api\/agent-runs\/(\d+)$/);
  if (runMatch && method === "GET") {
    const runId = Number.parseInt(runMatch[1]!, 10);
    const [run] = await db.select().from(agentRunsTable).where(eq(agentRunsTable.id, runId)).limit(1);
    if (!run) {
      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    }
    const project = await getAccessibleProject(run.websiteProjectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    }
    return withCors(request, Response.json({ run: presentAgentRun(run) }));
  }

  return null;
}
