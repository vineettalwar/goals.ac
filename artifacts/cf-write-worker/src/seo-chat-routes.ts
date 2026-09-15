import { z } from "zod";
import { withCors } from "@workspace/cf-edge/cors";
import {
  createSeoChatThread,
  getOrCreateProjectChatMemory,
  getSeoChatThread,
  patchProjectChatMemory,
  runSeoChatTurn,
  type SeoChatStreamEvent,
} from "@workspace/content-engine/agent-loop";
import { getAccessibleProject } from "./project-access";

const CreateThreadBody = z.object({
  projectId: z.number().int().positive(),
  title: z.string().trim().max(120).optional(),
});

const MessageBody = z.object({
  text: z.string().trim().min(1).max(8000),
  contentPieceId: z.number().int().positive().optional(),
});

const MemoryBody = z.object({
  brandVoiceNotes: z.string().max(4000).optional(),
  bannedClaims: z.string().max(4000).optional(),
  lastDecision: z.string().max(1000).optional(),
});

const sseHeaders = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
};

function sseResponse(request: Request, run: (send: (event: SeoChatStreamEvent) => void) => Promise<void>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SeoChatStreamEvent) => {
        controller.enqueue(encoder.encode(`event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`));
      };
      try {
        await run(send);
      } catch (err) {
        send({ event: "error", data: { error: err instanceof Error ? err.message : "Chat failed" } });
      } finally {
        controller.close();
      }
    },
  });
  return withCors(request, new Response(stream, { headers: sseHeaders }));
}

export async function handleSeoChatWrite(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const method = request.method;

  if (path === "/api/seo-chat/threads" && method === "POST") {
    const parsed = CreateThreadBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(request, Response.json({ error: "Invalid body" }, { status: 400 }));
    }
    const project = await getAccessibleProject(parsed.data.projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const thread = await createSeoChatThread({
      projectId: parsed.data.projectId,
      userId,
      title: parsed.data.title,
    });
    return withCors(request, Response.json({ thread }, { status: 201 }));
  }

  const messageMatch = path.match(/^\/api\/seo-chat\/threads\/(\d+)\/messages$/);
  if (messageMatch && method === "POST") {
    const threadId = Number.parseInt(messageMatch[1]!, 10);
    const packed = await getSeoChatThread(threadId);
    if (!packed || packed.thread.userId !== userId) {
      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    }
    const project = await getAccessibleProject(packed.thread.websiteProjectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    }
    const parsed = MessageBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(request, Response.json({ error: "Invalid body" }, { status: 400 }));
    }
    return sseResponse(request, async (send) => {
      await runSeoChatTurn({
        threadId,
        projectId: packed.thread.websiteProjectId,
        userId,
        text: parsed.data.text,
        contentPieceId: parsed.data.contentPieceId,
        onEvent: send,
      });
    });
  }

  const memoryMatch = path.match(/^\/api\/website-projects\/(\d+)\/chat-memory$/);
  if (memoryMatch && method === "PATCH") {
    const projectId = Number.parseInt(memoryMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const parsed = MemoryBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(request, Response.json({ error: "Invalid body" }, { status: 400 }));
    }
    await getOrCreateProjectChatMemory(projectId);
    const memory = await patchProjectChatMemory(projectId, parsed.data);
    return withCors(request, Response.json({ memory }));
  }

  return null;
}
