import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { roadmapsTable, conversations, messages } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";
import { getAiProviderClient } from "@workspace/ai-providers";
import { getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/auth/rate-limit";
import { requireAuth } from "@/lib/auth/require-auth";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "@/lib/billing/ai-billing";

const ChatBody = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.number().int().positive().optional(),
  slug: z.string().min(1),
});

function buildSystemPrompt(roadmap: { industry: string; location: string; stage: string; content: unknown }): string {
  const content = roadmap.content as {
    executiveSummary?: string;
    phases?: { title: string; timeframe: string; objectives: string[]; tactics: string[]; kpis: string[] }[];
  };
  const phaseSummary =
    content.phases
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

export async function POST(req: Request) {
  const limited = await rateLimitResponse(
    `ai-gen:ip:${getClientIp(req)}`,
    RATE_LIMITS.AI_GENERATION_PER_USER.limit,
    RATE_LIMITS.AI_GENERATION_PER_USER.windowMs
  );
  if (limited) return limited;

  const { userId, error: authError } = await requireAuth();
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  const parsed = ChatBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { message, conversationId, slug } = parsed.data;

  const [roadmap] = await db
    .select()
    .from(roadmapsTable)
    .where(eq(roadmapsTable.slug, slug))
    .limit(1);

  if (!roadmap) {
    return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
  }

  const billingPrep = await prepareAiBilling({
    userId: userId!,
    tier: "rapid",
    quotaKind: "article",
  });
  if (!billingPrep.ok) return billingPrep.response;

  try {
    const client = await getAiProviderClient();

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

    await completeAiBilling(billingPrep.ctx, {
      userId: userId!,
      eventType: "chat",
      usedByok: billingPrep.usedByok,
      tier: "rapid",
      promptTokens: response.usage?.promptTokens,
      outputTokens: response.usage?.outputTokens,
      totalTokens: response.usage?.totalTokens,
    });

    return NextResponse.json({ reply, conversationId: convId });
  } catch {
    await cancelAiBilling(billingPrep.ctx, "generation_failed");
    return NextResponse.json({ error: "Failed to get response" }, { status: 500 });
  }
}
