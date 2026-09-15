import { withCors } from "@workspace/cf-edge/cors";
import {
  getOrCreateProjectChatMemory,
  getSeoChatThread,
  listSeoChatThreads,
} from "@workspace/content-engine/agent-loop";
import { getAccessibleProject } from "./project-access";

export async function handleSeoChatRead(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const method = request.method;
  const url = new URL(request.url);

  if (path === "/api/seo-chat/threads" && method === "GET") {
    const projectId = Number.parseInt(url.searchParams.get("projectId") ?? "", 10);
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return withCors(request, Response.json({ error: "projectId required" }, { status: 400 }));
    }
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const threads = await listSeoChatThreads(projectId, userId);
    return withCors(request, Response.json({ threads }));
  }

  const threadMatch = path.match(/^\/api\/seo-chat\/threads\/(\d+)$/);
  if (threadMatch && method === "GET") {
    const threadId = Number.parseInt(threadMatch[1]!, 10);
    const packed = await getSeoChatThread(threadId);
    if (!packed) {
      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    }
    const project = await getAccessibleProject(packed.thread.websiteProjectId, userId);
    if (!project || packed.thread.userId !== userId) {
      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    }
    return withCors(request, Response.json(packed));
  }

  const memoryMatch = path.match(/^\/api\/website-projects\/(\d+)\/chat-memory$/);
  if (memoryMatch && method === "GET") {
    const projectId = Number.parseInt(memoryMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const memory = await getOrCreateProjectChatMemory(projectId);
    return withCors(request, Response.json({ memory }));
  }

  return null;
}
