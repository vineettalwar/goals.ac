import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import { getSeoChatThread, runSeoChatTurn, type SeoChatStreamEvent } from "@workspace/content-engine/agent-loop";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, error } = await requireAuth();
  if (error) return error;
  const threadId = Number((await params).id);
  if (!Number.isInteger(threadId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const packed = await getSeoChatThread(threadId);
  if (!packed || packed.thread.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const access = await requireProjectAccess(packed.thread.websiteProjectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = (await req.json().catch(() => null)) as { text?: string; contentPieceId?: number } | null;
  const text = body?.text?.trim() ?? "";
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SeoChatStreamEvent) => {
        controller.enqueue(encoder.encode(`event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`));
      };
      try {
        await runSeoChatTurn({
          threadId,
          projectId: packed.thread.websiteProjectId,
          userId: userId!,
          text,
          contentPieceId: body?.contentPieceId,
          onEvent: send,
        });
      } catch (err) {
        send({ event: "error", data: { error: err instanceof Error ? err.message : "Chat failed" } });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
