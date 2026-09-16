import { and, desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  contentPiecesTable,
  projectChatMemoryTable,
  seoChatMessagesTable,
  seoChatThreadsTable,
} from "@workspace/db/schema";
import { executeStoredAgentRun } from "./run-job";
import { dbTrajectorySink, loadAgentRun } from "./persist";
import type { TrajectorySink, TrajectoryStep } from "./types";
import {
  CHAT_AGENT_LOOP_CAPS,
  chipLabel,
  composeGroundedReply,
  goalFromIntent,
  keywordFrom,
  parseChatIntent,
  runInspectorHref,
  type SeoChatCard,
  type SeoChatChip,
  type SeoChatStreamEvent,
} from "./seo-chat-format";
import { resolveToolNavHref } from "./chat-catalog";

export {
  CHAT_AGENT_LOOP_CAPS,
  TOOL_CHIP_LABELS,
  parseChatIntent,
  goalFromIntent,
  composeGroundedReply,
  chipLabel,
  suggestionPrompts,
  keywordFrom,
  runInspectorHref,
} from "./seo-chat-format";
export type { ChatIntent, SeoChatCard, SeoChatChip, SeoChatStreamEvent } from "./seo-chat-format";

export async function listSeoChatThreads(projectId: number, userId: number, limit = 40) {
  return db
    .select()
    .from(seoChatThreadsTable)
    .where(and(eq(seoChatThreadsTable.websiteProjectId, projectId), eq(seoChatThreadsTable.userId, userId)))
    .orderBy(desc(seoChatThreadsTable.updatedAt))
    .limit(limit);
}

export async function getSeoChatThread(threadId: number) {
  const [thread] = await db.select().from(seoChatThreadsTable).where(eq(seoChatThreadsTable.id, threadId)).limit(1);
  if (!thread) return null;
  const messages = await db
    .select()
    .from(seoChatMessagesTable)
    .where(eq(seoChatMessagesTable.threadId, threadId))
    .orderBy(seoChatMessagesTable.id);
  return { thread, messages };
}

export async function createSeoChatThread(input: { projectId: number; userId: number; title?: string }) {
  const [thread] = await db
    .insert(seoChatThreadsTable)
    .values({
      websiteProjectId: input.projectId,
      userId: input.userId,
      title: input.title?.trim() || "New chat",
    })
    .returning();
  return thread;
}

export async function getOrCreateProjectChatMemory(projectId: number) {
  const [existing] = await db
    .select()
    .from(projectChatMemoryTable)
    .where(eq(projectChatMemoryTable.websiteProjectId, projectId))
    .limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(projectChatMemoryTable)
    .values({ websiteProjectId: projectId })
    .returning();
  return created!;
}

export async function patchProjectChatMemory(
  projectId: number,
  patch: { brandVoiceNotes?: string; bannedClaims?: string; lastDecision?: string },
) {
  const row = await getOrCreateProjectChatMemory(projectId);
  const lastDecisions = [...(row.lastDecisions ?? [])];
  if (patch.lastDecision?.trim()) {
    lastDecisions.unshift({ at: new Date().toISOString(), text: patch.lastDecision.trim() });
    lastDecisions.splice(12);
  }
  const [updated] = await db
    .update(projectChatMemoryTable)
    .set({
      brandVoiceNotes: patch.brandVoiceNotes ?? row.brandVoiceNotes,
      bannedClaims: patch.bannedClaims ?? row.bannedClaims,
      lastDecisions,
      updatedAt: new Date(),
    })
    .where(eq(projectChatMemoryTable.id, row.id))
    .returning();
  return updated;
}

function titleFromText(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  return trimmed.length <= 72 ? trimmed : `${trimmed.slice(0, 69)}…`;
}

function chunkText(text: string, size = 48): string[] {
  if (!text) return [];
  const parts: string[] = [];
  for (let i = 0; i < text.length; i += size) parts.push(text.slice(i, i + size));
  return parts;
}

async function cardsFromRun(run: {
  id?: number;
  websiteProjectId: number;
  status: string;
  contentPieceId?: number | null;
  trajectory: TrajectoryStep[];
}): Promise<SeoChatCard[]> {
  const cards: SeoChatCard[] = [];
  const queueStep = run.trajectory.find((step) => step.tool === "upsert_action_queue");
  const queueSummary = queueStep?.summary ?? "";
  if (queueStep?.ok) {
    cards.push({
      kind: "opportunity",
      title: queueSummary || "Action Queue updated",
      keyword: "queue",
    });
  }

  if (run.contentPieceId) {
    const [piece] = await db
      .select({
        id: contentPiecesTable.id,
        title: contentPiecesTable.title,
        bodyMarkdown: contentPiecesTable.bodyMarkdown,
      })
      .from(contentPiecesTable)
      .where(eq(contentPiecesTable.id, run.contentPieceId))
      .limit(1);
    if (piece) {
      const excerpt = (piece.bodyMarkdown ?? "").replace(/\s+/g, " ").trim().slice(0, 280);
      cards.push({
        kind: "draft_preview",
        title: piece.title,
        excerpt,
        contentPieceId: piece.id,
      });
    }
  }

  const readyStep = run.trajectory.find((step) => step.tool === "publish_readiness");
  if (readyStep) {
    cards.push({
      kind: "readiness",
      ok: Boolean(readyStep.ok && /ready/i.test(readyStep.summary ?? "")),
      label: readyStep.summary ?? "Readiness",
      blockers: readyStep.ok ? [] : [readyStep.summary ?? "blocked"],
      contentPieceId: run.contentPieceId ?? undefined,
    });
  }

  if (run.status === "awaiting_approval" && run.id) {
    cards.push({ kind: "publish_gate", runId: run.id, contentPieceId: run.contentPieceId ?? null });
  }

  const seenNav = new Set<string>();
  for (const step of run.trajectory) {
    if (!step.tool) continue;
    const nav = resolveToolNavHref(step.tool, run.websiteProjectId, `/projects/${run.websiteProjectId}/content-studio`);
    if (!nav || seenNav.has(nav.href)) continue;
    seenNav.add(nav.href);
    cards.push({ kind: "nav_link", title: nav.title, href: nav.href, reason: nav.reason });
  }
  return cards;
}

export async function runSeoChatTurn(input: {
  threadId: number;
  projectId: number;
  userId: number;
  text: string;
  contentPieceId?: number;
  onEvent?: (event: SeoChatStreamEvent) => void | Promise<void>;
}) {
  const emit = async (event: SeoChatStreamEvent) => {
    await input.onEvent?.(event);
  };

  const [thread] = await db
    .select()
    .from(seoChatThreadsTable)
    .where(eq(seoChatThreadsTable.id, input.threadId))
    .limit(1);
  if (!thread || thread.websiteProjectId !== input.projectId) {
    throw new Error("Thread not found");
  }

  const userText = input.text.trim();
  if (!userText) throw new Error("Message is empty");

  const [userMessage] = await db
    .insert(seoChatMessagesTable)
    .values({ threadId: input.threadId, role: "user", content: userText, payload: {} })
    .returning();
  await emit({ event: "user", data: { id: userMessage!.id, content: userText } });

  if (thread.title === "New chat") {
    await db
      .update(seoChatThreadsTable)
      .set({ title: titleFromText(userText), updatedAt: new Date() })
      .where(eq(seoChatThreadsTable.id, input.threadId));
  }

  let intent = parseChatIntent(userText, { contentPieceId: input.contentPieceId });
  if (/^draft this\.?$/i.test(userText)) {
    const prior = await db
      .select({ content: seoChatMessagesTable.content })
      .from(seoChatMessagesTable)
      .where(and(eq(seoChatMessagesTable.threadId, input.threadId), eq(seoChatMessagesTable.role, "user")))
      .orderBy(desc(seoChatMessagesTable.id))
      .limit(5);
    const previous = prior.find((row) => !/^draft this\.?$/i.test(row.content));
    const fromPrior = previous ? parseChatIntent(previous.content) : null;
    const keyword =
      fromPrior && "keyword" in fromPrior ? fromPrior.keyword : keywordFrom(previous?.content ?? "");
    if (keyword) intent = { kind: "research_then_draft", keyword };
  }

  if (intent.kind === "memory") {
    const patch =
      intent.field === "lastDecisions"
        ? { lastDecision: intent.text }
        : intent.field === "bannedClaims"
          ? { bannedClaims: intent.text }
          : { brandVoiceNotes: intent.text };
    await patchProjectChatMemory(input.projectId, patch);
    const content = `Saved ${intent.field === "lastDecisions" ? "decision" : intent.field === "bannedClaims" ? "banned claim" : "voice note"} for this project.`;
    const [assistant] = await db
      .insert(seoChatMessagesTable)
      .values({ threadId: input.threadId, role: "assistant", content, payload: { intent } })
      .returning();
    for (const part of chunkText(content)) await emit({ event: "delta", data: { text: part } });
    await emit({
      event: "done",
      data: {
        assistantId: assistant!.id,
        agentRunId: null,
        content,
        chips: [],
        cards: [],
        missing: [],
        citations: [],
      },
    });
    await db.update(seoChatThreadsTable).set({ updatedAt: new Date() }).where(eq(seoChatThreadsTable.id, input.threadId));
    return;
  }

  if (intent.kind === "show_trajectory") {
    const run = thread.lastAgentRunId ? await loadAgentRun(thread.lastAgentRunId) : null;
    const content = run
      ? `Run ${run.id} · ${run.status}${run.stopReason ? ` — ${run.stopReason}` : ""}\n\n${run.trajectory
          .map((step) => `${chipLabel(step.tool)}: ${step.summary ?? step.decision}`)
          .join("\n")}`
      : "No agent run is linked to this thread yet.";
    const chips: SeoChatChip[] = (run?.trajectory ?? [])
      .filter((step) => step.tool)
      .map((step) => ({ tool: step.tool!, label: chipLabel(step.tool), ok: step.ok }));
    const [assistant] = await db
      .insert(seoChatMessagesTable)
      .values({
        threadId: input.threadId,
        role: "assistant",
        content,
        agentRunId: run?.id ?? null,
        payload: { intent, chips, agentRunId: run?.id ?? null },
      })
      .returning();
    for (const chip of chips) {
      await emit({ event: "loop_step", data: { tool: chip.tool, label: chip.label, ok: chip.ok } });
    }
    for (const part of chunkText(content)) await emit({ event: "delta", data: { text: part } });
    await emit({
      event: "done",
      data: {
        assistantId: assistant!.id,
        agentRunId: run?.id ?? null,
        content,
        chips,
        cards: [],
        missing: [],
        citations: [],
      },
    });
    return;
  }

  const goal = goalFromIntent(intent, input.projectId, userText)!;
  const inner = dbTrajectorySink();
  let boundRunId: number | null = null;
  const sink: TrajectorySink = {
    async save(run) {
      await inner.save(run);
      if (run.id && boundRunId !== run.id) {
        boundRunId = run.id;
        await db
          .update(seoChatThreadsTable)
          .set({ lastAgentRunId: run.id, updatedAt: new Date() })
          .where(eq(seoChatThreadsTable.id, input.threadId));
        await emit({ event: "run", data: { agentRunId: run.id, status: run.status } });
      }
      const last = run.trajectory.at(-1);
      if (last?.tool) {
        await emit({
          event: "loop_step",
          data: {
            tool: last.tool,
            label: chipLabel(last.tool),
            summary: last.summary,
            ok: last.ok,
            agentRunId: run.id,
          },
        });
      }
    },
  };

  const run = await executeStoredAgentRun({
    projectId: input.projectId,
    userId: input.userId,
    goal,
    stepBudget: CHAT_AGENT_LOOP_CAPS.stepBudget,
    policy: { maxCredits: CHAT_AGENT_LOOP_CAPS.maxCredits, plannerMode: "hybrid" },
    sink,
  });

  const cards = await cardsFromRun(run);
  const composed = composeGroundedReply({ intent, text: userText, run });
  const chips: SeoChatChip[] = run.trajectory
    .filter((step) => step.tool)
    .map((step) => ({ tool: step.tool!, label: chipLabel(step.tool), ok: step.ok }));

  for (const card of cards) await emit({ event: "card", data: card });
  for (const part of chunkText(composed.content)) await emit({ event: "delta", data: { text: part } });

  const [assistant] = await db
    .insert(seoChatMessagesTable)
    .values({
      threadId: input.threadId,
      role: "assistant",
      content: composed.content,
      agentRunId: run.id ?? null,
      payload: {
        intent,
        chips,
        cards,
        missing: composed.missing,
        citations: composed.citations,
        verified: composed.verified,
        status: run.status,
        agentRunId: run.id ?? null,
      },
    })
    .returning();

  await db
    .update(seoChatThreadsTable)
    .set({
      ...(run.id ? { lastAgentRunId: run.id } : {}),
      updatedAt: new Date(),
    })
    .where(eq(seoChatThreadsTable.id, input.threadId));

  await emit({
    event: "done",
    data: {
      assistantId: assistant!.id,
      agentRunId: run.id ?? null,
      content: composed.content,
      chips,
      cards,
      missing: composed.missing,
      citations: composed.citations,
    },
  });
}
