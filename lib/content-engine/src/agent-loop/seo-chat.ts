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
import type { AgentGoal, TrajectorySink, TrajectoryStep } from "./types";
import {
  CHAT_AGENT_LOOP_CAPS,
  chipLabel,
  goalFromIntent,
  keywordFrom,
  parseChatIntent,
  type ChatIntent,
  type SeoChatCard,
  type SeoChatChip,
  type SeoChatStreamEvent,
} from "./seo-chat-format";
import { resolveToolNavHref } from "./chat-catalog";
import {
  RESEARCH_OPINION_CHOICE,
  WP_STATUS_CHOICE,
  asPlaybookState,
  extractHttpUrl,
  onboardStartState,
  parsePublishChoice,
  parseSkip,
  publishAskState,
  researchAskState,
  wantsCancelPlaybook,
  wantsOnboard,
  type ChatPlaybookState,
} from "./playbooks";
import { advanceOnboard } from "./chat-playbook-turn";
import { createProjectForChatOnboard } from "./chat-onboard";
import { buildGroundingPack, streamGroundedAssistantReply } from "./stream-grounded-reply";

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

export async function createSeoChatThread(input: {
  projectId: number;
  userId: number;
  title?: string;
  playbookState?: Record<string, unknown> | null;
}) {
  const [thread] = await db
    .insert(seoChatThreadsTable)
    .values({
      websiteProjectId: input.projectId,
      userId: input.userId,
      title: input.title?.trim() || "New chat",
      playbookState: input.playbookState ?? null,
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
  goal?: AgentGoal;
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

  if (run.status === "awaiting_user" && run.goal?.keyword) {
    cards.push(RESEARCH_OPINION_CHOICE(String(run.goal.keyword)));
  }

  if (
    run.contentPieceId &&
    run.status === "completed" &&
    run.trajectory.some((step) => step.tool === "generate_draft" && step.ok)
  ) {
    cards.push(WP_STATUS_CHOICE);
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

export async function bootstrapOnboardThread(input: {
  userId: number;
  text: string;
}): Promise<{ projectId: number; threadId: number }> {
  const url = extractHttpUrl(input.text);
  if (!url) throw new Error("Paste a site URL (https://…) to onboard");
  const created = await createProjectForChatOnboard({ userId: input.userId, url });
  const playbook = onboardStartState(url);
  playbook.payload.projectId = created.projectId;
  const thread = await createSeoChatThread({
    projectId: created.projectId,
    userId: input.userId,
    title: titleFromText(input.text),
    playbookState: playbook,
  });
  return { projectId: created.projectId, threadId: thread!.id };
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

  let playbook = asPlaybookState(thread.playbookState);
  let projectId = input.projectId;

  const finishStatic = async (
    intent: ChatIntent,
    content: string,
    cards: SeoChatCard[],
    extra?: { agentRunId?: number | null; chips?: SeoChatChip[] },
  ) => {
    await finishAssistantTurn({
      threadId: input.threadId,
      projectId,
      userId: input.userId,
      userText,
      intent,
      content,
      cards,
      chips: extra?.chips ?? [],
      agentRunId: extra?.agentRunId ?? null,
      run: null,
      emit,
    });
  };

  if (wantsCancelPlaybook(userText) && playbook) {
    await savePlaybook(input.threadId, null);
    await finishStatic({ kind: "chat_turn" }, "Playbook cancelled. What next?", []);
    return;
  }

  if (playbook?.id === "onboard") {
    const advanced = await advanceOnboard({
      userId: input.userId,
      text: userText,
      state: playbook,
      projectId,
    });
    await savePlaybook(input.threadId, advanced.state);
    await finishAssistantTurn({
      threadId: input.threadId,
      projectId: advanced.projectId ?? projectId,
      userId: input.userId,
      userText,
      intent: { kind: "onboard" },
      content: advanced.reply,
      cards: advanced.cards,
      chips: [],
      agentRunId: null,
      run: null,
      emit,
      extraFacts: [advanced.reply],
    });
    return;
  }

  let intent = parseChatIntent(userText, { contentPieceId: input.contentPieceId });

  if (intent.kind === "approve_live" || /^decision:\s*approved live publish/i.test(userText)) {
    const prior = thread.lastAgentRunId ? await loadAgentRun(thread.lastAgentRunId) : null;
    if (prior?.status === "awaiting_approval" && prior.id) {
      const run = await executeStoredAgentRun({
        runId: prior.id,
        projectId,
        userId: input.userId,
        goal: prior.goal,
        resumeApproved: true,
        stepBudget: CHAT_AGENT_LOOP_CAPS.stepBudget,
        sink: loopSink(input.threadId, emit),
      });
      await savePlaybook(input.threadId, null);
      await emitLoopResult({ threadId: input.threadId, projectId, userId: input.userId, userText, intent: { kind: "approve_live" }, run, emit });
      return;
    }
  }

  if (playbook?.id === "research_ask_draft" && playbook.step === "ask") {
    if (parseSkip(userText)) {
      await savePlaybook(input.threadId, null);
      await finishStatic({ kind: "chat_turn" }, "Skipped the draft. What should we look at instead?", []);
      return;
    }
    const keyword =
      (/^draft this\.?$/i.test(userText)
        ? String(playbook.payload.keyword ?? "")
        : keywordFrom(userText) ?? String(playbook.payload.keyword ?? "")) || "untitled";
    intent = {
      kind: "research_then_draft",
      keyword,
      userPrompt: typeof playbook.payload.userPrompt === "string" ? playbook.payload.userPrompt : undefined,
    };
    playbook = { id: "research_ask_draft", step: "draft", payload: { ...playbook.payload, keyword } };
  } else if (playbook?.id === "publish_ask") {
    const choice = parsePublishChoice(userText);
    const pieceId = Number(playbook.payload.contentPieceId);
    if (choice === "skip") {
      await savePlaybook(input.threadId, null);
      await finishStatic({ kind: "chat_turn" }, "Left the piece in Studio. Say push to WordPress when you want it on the site.", []);
      return;
    }
    if (choice === "draft" || choice === "publish") {
      intent = {
        kind: "publish_check",
        contentPieceId: pieceId,
        cmsStatus: choice === "draft" ? "draft" : "publish",
      };
    }
  }

  if (intent.kind === "onboard" || (wantsOnboard(userText) && !playbook)) {
    const url = extractHttpUrl(userText);
    if (url) {
      const created = await createProjectForChatOnboard({ userId: input.userId, url });
      projectId = created.projectId;
      await db
        .update(seoChatThreadsTable)
        .set({ websiteProjectId: projectId, updatedAt: new Date() })
        .where(eq(seoChatThreadsTable.id, input.threadId));
    }
    const started = onboardStartState(url);
    if (projectId) started.payload.projectId = projectId;
    if (url) started.payload.websiteUrl = url;
    const advanced = await advanceOnboard({
      userId: input.userId,
      text: userText,
      state: started,
      projectId,
    });
    await savePlaybook(input.threadId, advanced.state);
    if (advanced.projectId && advanced.projectId !== input.projectId) {
      await db
        .update(seoChatThreadsTable)
        .set({ websiteProjectId: advanced.projectId, updatedAt: new Date() })
        .where(eq(seoChatThreadsTable.id, input.threadId));
    }
    await finishAssistantTurn({
      threadId: input.threadId,
      projectId: advanced.projectId ?? projectId,
      userId: input.userId,
      userText,
      intent: { kind: "onboard" },
      content: advanced.reply,
      cards: advanced.cards,
      chips: [],
      agentRunId: null,
      run: null,
      emit,
    });
    return;
  }

  if (/^draft this\.?$/i.test(userText) && intent.kind !== "research_then_draft") {
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
    await patchProjectChatMemory(projectId, patch);
    await finishStatic(intent, `Saved ${intent.field === "lastDecisions" ? "decision" : intent.field === "bannedClaims" ? "banned claim" : "voice note"} for this project.`, []);
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
    await finishStatic(intent, content, [], { agentRunId: run?.id ?? null, chips });
    return;
  }

  let goal = goalFromIntent(intent, projectId, userText);
  if (!goal) {
    await finishStatic({ kind: "chat_turn" }, "I need a site or a clearer ask.", []);
    return;
  }

  if (intent.kind === "research_then_draft") {
    const drafting = playbook?.id === "research_ask_draft" && playbook.step === "draft";
    goal = { ...goal, askBeforeDraft: !drafting };
    if (!drafting) {
      await savePlaybook(input.threadId, researchAskState(intent.keyword, intent.userPrompt));
    }
  }

  if (intent.kind === "publish_check" && !goal.contentPieceId) {
    const fromPlaybook = Number(playbook?.payload.contentPieceId);
    const fromRun = thread.lastAgentRunId ? await loadAgentRun(thread.lastAgentRunId) : null;
    goal = {
      ...goal,
      contentPieceId: fromPlaybook || fromRun?.contentPieceId || input.contentPieceId,
    };
  }

  if (intent.kind === "publish_check" && !intent.cmsStatus && goal.contentPieceId) {
    await savePlaybook(input.threadId, publishAskState(goal.contentPieceId));
    await finishStatic(intent, "Push this piece as a WordPress draft, or live?", [WP_STATUS_CHOICE]);
    return;
  }

  const priorRun = thread.lastAgentRunId ? await loadAgentRun(thread.lastAgentRunId) : null;
  const resumeUser = Boolean(
    priorRun?.status === "awaiting_user" &&
      intent.kind === "research_then_draft" &&
      playbook?.id === "research_ask_draft" &&
      playbook.step === "draft" &&
      priorRun.id,
  );

  const run = await executeStoredAgentRun({
    runId: resumeUser ? priorRun?.id : undefined,
    projectId,
    userId: input.userId,
    goal: resumeUser && priorRun ? { ...priorRun.goal, ...goal, askBeforeDraft: false } : goal,
    stepBudget: CHAT_AGENT_LOOP_CAPS.stepBudget,
    policy: { maxCredits: CHAT_AGENT_LOOP_CAPS.maxCredits, plannerMode: "hybrid" },
    sink: loopSink(input.threadId, emit),
    resumeFromAwaitingUser: resumeUser,
  });

  if (run.status === "awaiting_user") {
    await savePlaybook(
      input.threadId,
      researchAskState(
        goal.keyword ?? (intent.kind === "research_then_draft" ? intent.keyword : "untitled"),
        goal.userPrompt,
        "ask",
      ),
    );
  } else if (run.contentPieceId && run.trajectory.some((step) => step.tool === "generate_draft" && step.ok)) {
    await savePlaybook(input.threadId, publishAskState(run.contentPieceId));
  } else if (intent.kind === "publish_check") {
    await savePlaybook(input.threadId, null);
  }

  await emitLoopResult({ threadId: input.threadId, projectId, userId: input.userId, userText, intent, run, emit });
}

async function savePlaybook(threadId: number, state: ChatPlaybookState | null) {
  await db
    .update(seoChatThreadsTable)
    .set({ playbookState: state, updatedAt: new Date() })
    .where(eq(seoChatThreadsTable.id, threadId));
}

function loopSink(
  threadId: number,
  emit: (event: SeoChatStreamEvent) => void | Promise<void>,
): TrajectorySink {
  const inner = dbTrajectorySink();
  let boundRunId: number | null = null;
  return {
    async save(run) {
      await inner.save(run);
      if (run.id && boundRunId !== run.id) {
        boundRunId = run.id;
        await db
          .update(seoChatThreadsTable)
          .set({ lastAgentRunId: run.id, updatedAt: new Date() })
          .where(eq(seoChatThreadsTable.id, threadId));
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
}

async function emitLoopResult(input: {
  threadId: number;
  projectId: number;
  userId: number;
  userText: string;
  intent: ChatIntent;
  run: Awaited<ReturnType<typeof executeStoredAgentRun>>;
  emit: (event: SeoChatStreamEvent) => void | Promise<void>;
}) {
  const cards = await cardsFromRun(input.run);
  await finishAssistantTurn({
    threadId: input.threadId,
    projectId: input.projectId,
    userId: input.userId,
    userText: input.userText,
    intent: input.intent,
    content: "",
    cards,
    chips: input.run.trajectory
      .filter((step) => step.tool)
      .map((step) => ({ tool: step.tool!, label: chipLabel(step.tool), ok: step.ok })),
    agentRunId: input.run.id ?? null,
    run: input.run,
    emit: input.emit,
  });
}

async function finishAssistantTurn(input: {
  threadId: number;
  projectId: number;
  userId: number;
  userText: string;
  intent: ChatIntent;
  content: string;
  cards: SeoChatCard[];
  chips: SeoChatChip[];
  agentRunId: number | null;
  run: Awaited<ReturnType<typeof executeStoredAgentRun>> | null;
  emit: (event: SeoChatStreamEvent) => void | Promise<void>;
  extraFacts?: string[];
}) {
  for (const card of input.cards) await input.emit({ event: "card", data: card });
  const pack = buildGroundingPack({
    trajectory: input.run?.trajectory,
    extraFacts: input.extraFacts ?? (input.content ? [input.content] : []),
    question: input.cards.find((card) => card.kind === "choice")?.prompt,
  });
  let content = input.content;
  let citations = pack.citations;
  let missing = pack.missing;
  let verified = pack.verified;
  if (input.run) {
    const streamed = await streamGroundedAssistantReply({
      userId: input.userId,
      userText: input.userText,
      intent: input.intent,
      run: input.run,
      pack,
      onDelta: async (text) => {
        await input.emit({ event: "delta", data: { text } });
      },
    });
    content = streamed.content;
    citations = streamed.citations;
    missing = streamed.missing;
    verified = streamed.verified;
    if (!streamed.streamed) {
      for (const part of chunkText(content)) await input.emit({ event: "delta", data: { text: part } });
    }
  } else if (content) {
    const streamed = await streamGroundedAssistantReply({
      userId: input.userId,
      userText: input.userText,
      intent: input.intent,
      run: null,
      pack,
      onDelta: async (text) => {
        await input.emit({ event: "delta", data: { text } });
      },
    });
    content = streamed.content;
    if (!streamed.streamed) {
      for (const part of chunkText(content)) await input.emit({ event: "delta", data: { text: part } });
    }
  }

  const [assistant] = await db
    .insert(seoChatMessagesTable)
    .values({
      threadId: input.threadId,
      role: "assistant",
      content,
      agentRunId: input.agentRunId,
      payload: {
        intent: input.intent,
        chips: input.chips,
        cards: input.cards,
        missing,
        citations,
        verified,
        agentRunId: input.agentRunId,
        projectId: input.projectId,
      },
    })
    .returning();

  await db
    .update(seoChatThreadsTable)
    .set({
      ...(input.agentRunId ? { lastAgentRunId: input.agentRunId } : {}),
      updatedAt: new Date(),
    })
    .where(eq(seoChatThreadsTable.id, input.threadId));

  await input.emit({
    event: "done",
    data: {
      assistantId: assistant!.id,
      agentRunId: input.agentRunId,
      content,
      chips: input.chips,
      cards: input.cards,
      missing,
      citations,
      projectId: input.projectId,
    },
  });
}
