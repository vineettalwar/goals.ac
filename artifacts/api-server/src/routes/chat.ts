import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { roadmapsTable, conversations, messages } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { z } from "zod/v4";
import { optionalAuth } from "../lib/auth";
import { resolveAiClientForUser } from "@workspace/content-engine/support/resolve-ai-client-for-user";
import { getAiProviderClient } from "@workspace/ai-providers";

const router: IRouter = Router();

const ChatMessageBody = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.number().int().positive().optional(),
});

function buildSystemPrompt(roadmap: { industry: string; location: string; stage: string; content: unknown }): string {
  const content = roadmap.content as { executiveSummary?: string; phases?: { title: string; timeframe: string; objectives: string[]; tactics: string[]; kpis: string[] }[] };
  const phaseSummary = content.phases
    ?.map((p) => `${p.timeframe} — ${p.title}: ${p.objectives.slice(0, 2).join("; ")}`)
    .join("\n") ?? "";

  return `You are a B2B growth strategy advisor embedded in goals.ac. You help startup founders understand and execute the 12-month growth roadmap shown on the page.

ROADMAP CONTEXT:
Industry: ${roadmap.industry}
Location: ${roadmap.location}
Stage: ${roadmap.stage}
Executive Summary: ${content.executiveSummary ?? ""}

Phases:
${phaseSummary}

INSTRUCTIONS:
- Answer questions specifically about this roadmap and how to execute it
- Be concise, practical, and direct — founders are busy
- If asked something outside this roadmap, briefly answer then redirect to growth strategy
- Never fabricate metrics; ground advice in the roadmap content
- Respond in 2-4 short paragraphs max unless the user asks for more detail
- Do not use excessive markdown; plain prose is preferred`;
}

function buildChatPrompt(history: { role: string; content: string }[], message: string): string {
  if (history.length === 0) return message;

  const transcript = history
    .map((m) => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`)
    .join("\n\n");

  return `Previous conversation:\n${transcript}\n\nUser: ${message}\n\nAssistant:`;
}

router.post("/roadmaps/:slug/chat", optionalAuth, async (req, res) => {
  const parsed = ChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { message, conversationId } = parsed.data;
  const slug = String(req.params.slug);

  try {
    const [roadmap] = await db
      .select()
      .from(roadmapsTable)
      .where(eq(roadmapsTable.slug, slug))
      .limit(1);

    if (!roadmap) {
      res.status(404).json({ error: "Roadmap not found" });
      return;
    }

    let client;
    try {
      if (req.user) {
        ({ client } = await resolveAiClientForUser(req.user.userId));
      } else {
        client = await getAiProviderClient();
      }
    } catch {
      res.status(503).json({ error: "Chat temporarily unavailable" });
      return;
    }

    let convId = conversationId;
    let history: { role: string; content: string }[] = [];

    if (convId) {
      const existingMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, convId))
        .orderBy(asc(messages.createdAt));
      history = existingMessages.map((m) => ({ role: m.role, content: m.content }));
    } else {
      const [conv] = await db
        .insert(conversations)
        .values({ title: message.slice(0, 80) })
        .returning();
      convId = conv.id;
    }

    await db.insert(messages).values({ conversationId: convId, role: "user", content: message });

    const response = await client.generate({
      prompt: buildChatPrompt(history, message),
      systemInstruction: buildSystemPrompt(roadmap),
      maxOutputTokens: 2048,
    });

    const reply = response.text?.trim() ?? "";

    await db.insert(messages).values({ conversationId: convId, role: "assistant", content: reply });

    res.json({ reply, conversationId: convId });
  } catch (err) {
    req.log.error({ err }, "Chat failed");
    res.status(500).json({ error: "Failed to get response" });
  }
});

export default router;
