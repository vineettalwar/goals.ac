"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ListPlus, PenLine, Plus, Send } from "lucide-react";
import { APP_SHELL_PAGE_WIDE } from "../shell-constants";
import { cn } from "../cn";
import type { SeoChatCard, SeoChatChip } from "@workspace/content-engine/agent-loop";
import { AgentRunInspector, type AgentRunView } from "../agent-loop/agent-run-inspector";

type Thread = { id: number; title: string; updatedAt?: string | Date };
type ProjectOption = { id: number | string; name: string };

type ChatMessage = {
  id: number | string;
  role: "user" | "assistant";
  content: string;
  chips?: SeoChatChip[];
  cards?: SeoChatCard[];
  agentRunId?: number | null;
};

type SeoChatWorkspaceProps = {
  projectId: string;
  projects: ProjectOption[];
  onProjectChange: (id: string) => void;
  request: (path: string, init?: RequestInit) => Promise<Response>;
  studioHref: (pieceId?: number) => string;
  actionsHref: string;
};

const SUGGESTIONS = ["What's slipping?", "CTR gaps", "Brief for [keyword]", "Relaunch risk for [url]"];

function runInspectorHref(actionsHref: string, runId: number): string {
  return `${actionsHref}${actionsHref.includes("?") ? "&" : "?"}runId=${runId}`;
}

function runIdFromMessageRow(row: {
  agentRunId?: number | null;
  payload?: Record<string, unknown> | null;
}): number | null {
  if (typeof row.agentRunId === "number") return row.agentRunId;
  const fromPayload = row.payload?.agentRunId;
  return typeof fromPayload === "number" ? fromPayload : null;
}

function cardRunId(card: SeoChatCard): number | null {
  return card.kind === "publish_gate" ? card.runId : null;
}

export function SeoChatWorkspace({
  projectId,
  projects,
  onProjectChange,
  request,
  studioHref,
  actionsHref,
}: SeoChatWorkspaceProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadId, setThreadId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveChips, setLiveChips] = useState<SeoChatChip[]>([]);
  const [liveRunId, setLiveRunId] = useState<number | null>(null);
  const [openRun, setOpenRun] = useState<AgentRunView | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const inspectGen = useRef(0);
  const sendGen = useRef(0);

  const loadThreads = useCallback(async () => {
    if (!projectId) return;
    const res = await request(`/api/seo-chat/threads?projectId=${projectId}`);
    if (!res.ok) throw new Error("Could not load threads");
    const data = (await res.json()) as { threads?: Thread[] };
    setThreads(data.threads ?? []);
  }, [projectId, request]);

  const loadThread = useCallback(
    async (id: number) => {
      const res = await request(`/api/seo-chat/threads/${id}`);
      if (!res.ok) throw new Error("Could not load conversation");
      const data = (await res.json()) as {
        messages?: Array<{
          id: number;
          role: "user" | "assistant";
          content: string;
          agentRunId?: number | null;
          payload?: Record<string, unknown>;
        }>;
      };
      setThreadId(id);
      setMessages(
        (data.messages ?? []).map((row) => ({
          id: row.id,
          role: row.role,
          content: row.content,
          chips: Array.isArray(row.payload?.chips) ? (row.payload!.chips as SeoChatChip[]) : [],
          cards: Array.isArray(row.payload?.cards) ? (row.payload!.cards as SeoChatCard[]) : [],
          agentRunId: runIdFromMessageRow(row),
        })),
      );
    },
    [request],
  );

  useEffect(() => {
    setThreadId(null);
    setMessages([]);
    setOpenRun(null);
    void loadThreads().catch((err: unknown) => setError(err instanceof Error ? err.message : "Load failed"));
  }, [loadThreads]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages, liveChips, busy, openRun]);

  async function inspectRun(runId: number) {
    const gen = ++inspectGen.current;
    const res = await request(`/api/agent-runs/${runId}`);
    if (gen !== inspectGen.current) return;
    const data = (await res.json().catch(() => null)) as { run?: AgentRunView; error?: string } | null;
    if (gen !== inspectGen.current) return;
    if (!res.ok || !data?.run) {
      setError(typeof data?.error === "string" ? data.error : "Run lookup failed");
      return;
    }
    setOpenRun(data.run);
  }

  async function newThread() {
    if (!projectId) return;
    setError(null);
    const res = await request("/api/seo-chat/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: Number(projectId) }),
    });
    if (!res.ok) {
      setError("Could not start a thread");
      return;
    }
    const data = (await res.json()) as { thread: Thread };
    setThreads((prev) => [data.thread, ...prev]);
    setThreadId(data.thread.id);
    setMessages([]);
    setOpenRun(null);
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !projectId || busy) return;
    const gen = ++sendGen.current;
    setBusy(true);
    setError(null);
    setDraft("");
    setLiveChips([]);
    setLiveRunId(null);
    try {
      let activeId = threadId;
      if (!activeId) {
        const res = await request("/api/seo-chat/threads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: Number(projectId), title: trimmed.slice(0, 72) }),
        });
        if (!res.ok) throw new Error("Could not start a thread");
        const data = (await res.json()) as { thread: Thread };
        activeId = data.thread.id;
        setThreadId(activeId);
        setThreads((prev) => [data.thread, ...prev.filter((row) => row.id !== data.thread.id)]);
      }

      setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: trimmed }]);
      const res = await request(`/api/seo-chat/threads/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (!res.ok || !res.body) throw new Error("Chat request failed");

      let assistant = "";
      let agentRunId: number | null = null;
      const cards: SeoChatCard[] = [];
      const chips: SeoChatChip[] = [];
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let pendingEvent: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            pendingEvent = line.slice(7).trim();
            continue;
          }
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          let data: unknown = payload;
          try {
            data = JSON.parse(payload);
          } catch {
            // keep string
          }
          if (pendingEvent === "run" && data && typeof data === "object" && "agentRunId" in data) {
            const id = Number((data as { agentRunId: number }).agentRunId);
            if (Number.isInteger(id) && id > 0) {
              agentRunId = id;
              setLiveRunId(id);
            }
          }
          if (pendingEvent === "loop_step" && data && typeof data === "object") {
            const step = data as { tool?: string; label: string; ok?: boolean; agentRunId?: number };
            const chip = { tool: step.tool ?? "stop", label: step.label, ok: step.ok };
            chips.push(chip);
            setLiveChips([...chips]);
            if (typeof step.agentRunId === "number") {
              agentRunId = step.agentRunId;
              setLiveRunId(step.agentRunId);
            }
          }
          if (pendingEvent === "delta" && data && typeof data === "object" && "text" in data) {
            assistant += String((data as { text: string }).text);
            setMessages((prev) => {
              const next = [...prev];
              const last = next.at(-1);
              if (last?.role === "assistant" && String(last.id).startsWith("a-live")) {
                next[next.length - 1] = { ...last, content: assistant, chips: [...chips], cards: [...cards], agentRunId };
              } else {
                next.push({
                  id: "a-live",
                  role: "assistant",
                  content: assistant,
                  chips: [...chips],
                  cards: [...cards],
                  agentRunId,
                });
              }
              return next;
            });
          }
          if (pendingEvent === "card" && data && typeof data === "object" && "kind" in data) {
            cards.push(data as SeoChatCard);
          }
          if (pendingEvent === "error" && data && typeof data === "object" && "error" in data) {
            throw new Error(String((data as { error: string }).error));
          }
          if (pendingEvent === "done" && data && typeof data === "object") {
            const doneData = data as {
              assistantId?: number;
              content?: string;
              chips?: SeoChatChip[];
              cards?: SeoChatCard[];
              agentRunId?: number | null;
            };
            const doneRunId = typeof doneData.agentRunId === "number" ? doneData.agentRunId : agentRunId;
            setMessages((prev) => {
              const next = prev.filter((row) => row.id !== "a-live" && !String(row.id).startsWith("a-live"));
              next.push({
                id: doneData.assistantId ?? `a-${Date.now()}`,
                role: "assistant",
                content: doneData.content ?? assistant,
                chips: doneData.chips ?? chips,
                cards: doneData.cards ?? cards,
                agentRunId: doneRunId,
              });
              return next;
            });
          }
          pendingEvent = null;
        }
      }
      await loadThreads();
    } catch (err) {
      if (gen !== sendGen.current) return;
      setError(err instanceof Error ? err.message : "Chat failed");
    } finally {
      if (gen !== sendGen.current) return;
      setBusy(false);
      setLiveChips([]);
      setLiveRunId(null);
    }
  }

  const empty = messages.length === 0 && !busy;
  const selectedProject = useMemo(
    () => projects.find((row) => String(row.id) === String(projectId)),
    [projects, projectId],
  );

  return (
    <div className={cn(APP_SHELL_PAGE_WIDE, "flex min-h-[calc(100vh-3.5rem)] flex-col")}>
      <div className="flex min-h-0 flex-1 gap-4">
        <aside className="hidden w-52 shrink-0 flex-col border-r border-border pr-3 lg:flex">
          <button
            type="button"
            className="mb-3 flex h-8 items-center justify-center gap-1 border border-border px-2 text-xs"
            onClick={() => void newThread()}
          >
            <Plus className="h-3.5 w-3.5" />
            New chat
          </button>
          <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto text-sm">
            {threads.map((thread) => (
              <li key={thread.id}>
                <button
                  type="button"
                  className={cn(
                    "w-full truncate px-2 py-1.5 text-left",
                    thread.id === threadId ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60",
                  )}
                  onClick={() => void loadThread(thread.id)}
                >
                  {thread.title}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="seo-chat-project">
              Site
            </label>
            <select
              id="seo-chat-project"
              className="h-9 max-w-xs border border-border bg-background px-2 text-sm"
              value={projectId}
              onChange={(event) => onProjectChange(event.target.value)}
            >
              {projects.length === 0 ? <option value="">No sites</option> : null}
              {projects.map((project) => (
                <option key={String(project.id)} value={String(project.id)}>
                  {project.name}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">SEO coworker · AgentLoop control plane</span>
          </div>

          <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-prose space-y-6 py-6">
              {empty ? (
                <div className="pt-16 text-center">
                  <p className="text-lg font-medium text-foreground">What should we work on?</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedProject?.name ?? "Pick a site"}. Tools run the employee loop — not a second brain.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {SUGGESTIONS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        className="border border-border px-3 py-1.5 text-xs text-foreground hover:border-primary"
                        onClick={() => void send(prompt)}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {messages.map((message) => (
                <article key={String(message.id)} className="space-y-2">
                  {message.role === "user" ? (
                    <p className="ml-auto max-w-[90%] bg-secondary px-3 py-2 text-sm">{message.content}</p>
                  ) : (
                    <>
                      {message.chips && message.chips.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {message.chips.map((chip) => (
                            <span
                              key={`${chip.tool}-${chip.label}`}
                              className="border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
                            >
                              {chip.label}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
                      {message.cards?.map((card, index) => (
                        <ChatCard
                          key={`${card.kind}-${index}`}
                          card={card}
                          studioHref={studioHref}
                          actionsHref={actionsHref}
                          onAction={(text) => void send(text)}
                          onInspectRun={(id) => void inspectRun(id)}
                        />
                      ))}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 border border-border px-2 py-1 text-[11px]"
                          onClick={() => void send("Draft this")}
                        >
                          <PenLine className="h-3 w-3" />
                          Draft this
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 border border-border px-2 py-1 text-[11px]"
                          onClick={() => void send("Add to Action Queue")}
                        >
                          <ListPlus className="h-3 w-3" />
                          Add to Action Queue
                        </button>
                        <button
                          type="button"
                          className="border border-border px-2 py-1 text-[11px]"
                          onClick={() => void send("Show trajectory")}
                        >
                          Show trajectory
                        </button>
                        {message.agentRunId ? (
                          <>
                            <button
                              type="button"
                              className="border border-border px-2 py-1 text-[11px]"
                              onClick={() => void inspectRun(message.agentRunId!)}
                            >
                              Inspect run
                            </button>
                            <a
                              href={runInspectorHref(actionsHref, message.agentRunId)}
                              className="border border-border px-2 py-1 text-[11px]"
                            >
                              Open in Actions
                            </a>
                          </>
                        ) : (
                          <a href={actionsHref} className="border border-border px-2 py-1 text-[11px]">
                            Open in Actions
                          </a>
                        )}
                        <a href={studioHref()} className="border border-border px-2 py-1 text-[11px]">
                          Continue in Studio
                        </a>
                      </div>
                    </>
                  )}
                </article>
              ))}

              {busy && (liveChips.length > 0 || liveRunId) ? (
                <div className="flex flex-wrap items-center gap-2">
                  {liveChips.map((chip) => (
                    <span key={`${chip.tool}-${chip.label}`} className="border border-primary/40 px-2 py-0.5 text-[11px]">
                      {chip.label}
                    </span>
                  ))}
                  {liveRunId ? (
                    <button
                      type="button"
                      className="border border-border px-2 py-1 text-[11px]"
                      onClick={() => void inspectRun(liveRunId)}
                    >
                      Inspect run {liveRunId}
                    </button>
                  ) : null}
                </div>
              ) : null}
              {openRun ? <AgentRunInspector run={openRun} onClose={() => setOpenRun(null)} /> : null}
            </div>
          </div>

          {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}

          <form
            className="mt-auto flex gap-2 border-t border-border pt-3"
            onSubmit={(event) => {
              event.preventDefault();
              void send(draft);
            }}
          >
            <label className="sr-only" htmlFor="seo-chat-input">
              Message
            </label>
            <textarea
              id="seo-chat-input"
              rows={1}
              value={draft}
              disabled={busy || !projectId}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(draft);
                }
              }}
              placeholder={projectId ? "Ask about this site’s search work…" : "Select a site first"}
              className="min-h-11 flex-1 resize-none border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim() || !projectId}
              className="inline-flex h-11 w-11 items-center justify-center bg-primary text-primary-foreground disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

function ChatCard({
  card,
  studioHref,
  actionsHref,
  onAction,
  onInspectRun,
}: {
  card: SeoChatCard;
  studioHref: (pieceId?: number) => string;
  actionsHref: string;
  onAction: (text: string) => void;
  onInspectRun: (runId: number) => void;
}) {
  const inspectId = cardRunId(card);
  if (card.kind === "opportunity") {
    return (
      <div className="border border-border p-3 text-sm">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Opportunity</p>
        <p className="mt-1 font-medium">{card.title}</p>
        <p className="text-muted-foreground">{card.keyword}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className="border px-2 py-1 text-[11px]" onClick={() => onAction("Add to Action Queue")}>
            Approve
          </button>
          <a href={actionsHref} className="border px-2 py-1 text-[11px]">
            Edit
          </a>
          <button type="button" className="border px-2 py-1 text-[11px]" onClick={() => onAction("decision: dismissed opportunity")}>
            Discard
          </button>
        </div>
      </div>
    );
  }
  if (card.kind === "draft_preview") {
    return (
      <div className="border border-border p-3 text-sm">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Draft</p>
        <p className="mt-1 font-medium">{card.title}</p>
        <p className="mt-2 font-serif text-[15px] leading-relaxed text-foreground/90">{card.excerpt}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className="border px-2 py-1 text-[11px]" onClick={() => onAction(`decision: approved draft ${card.contentPieceId}`)}>
            Approve
          </button>
          <a href={studioHref(card.contentPieceId)} className="border px-2 py-1 text-[11px]">
            Edit
          </a>
          <button type="button" className="border px-2 py-1 text-[11px]" onClick={() => onAction(`decision: discarded draft ${card.contentPieceId}`)}>
            Discard
          </button>
        </div>
      </div>
    );
  }
  if (card.kind === "readiness") {
    return (
      <div className="border border-border p-3 text-sm">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Readiness</p>
        <p className="mt-1 font-medium">{card.label}</p>
        {card.blockers.length > 0 ? <p className="text-muted-foreground">{card.blockers.join(" · ")}</p> : null}
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className="border px-2 py-1 text-[11px]" onClick={() => onAction("publish live")}>
            Approve
          </button>
          <a href={card.contentPieceId ? studioHref(card.contentPieceId) : studioHref()} className="border px-2 py-1 text-[11px]">
            Edit
          </a>
          <button type="button" className="border px-2 py-1 text-[11px]" onClick={() => onAction("decision: hold publish")}>
            Discard
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="border border-primary/50 p-3 text-sm">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Live publish gate</p>
      <p className="mt-1">Approve-first. The loop will not push live until you say so, and CMS publish still happens in Studio.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className="border border-primary px-2 py-1 text-[11px]" onClick={() => onAction("decision: approved live publish")}>
          Approve
        </button>
        {inspectId ? (
          <>
            <button type="button" className="border px-2 py-1 text-[11px]" onClick={() => onInspectRun(inspectId)}>
              Inspect run
            </button>
            <a href={runInspectorHref(actionsHref, inspectId)} className="border px-2 py-1 text-[11px]">
              Open in Actions
            </a>
          </>
        ) : (
          <a href={card.contentPieceId ? studioHref(card.contentPieceId) : studioHref()} className="border px-2 py-1 text-[11px]">
            Continue in Studio
          </a>
        )}
        <button type="button" className="border px-2 py-1 text-[11px]" onClick={() => onAction("decision: rejected live publish")}>
          Discard
        </button>
      </div>
    </div>
  );
}
