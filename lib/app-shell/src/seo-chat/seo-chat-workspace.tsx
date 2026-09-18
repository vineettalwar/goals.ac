"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, ChevronDown, ListPlus, PenLine, Plus } from "lucide-react";
import { cn } from "../cn";
import type { SeoChatCard } from "@workspace/content-engine/agent-loop/seo-chat-format";
import { AgentRunInspector, type AgentRunView } from "../agent-loop/agent-run-inspector";
import { StudioAiReadinessBanner } from "../studio/brand-ai-profile-card";
import {
  parseChatAiStatus,
  providerPatchBody,
  readApiError,
  type ChatAiProviderId,
  type ChatAiStatus,
} from "./chat-ai-gate";
import { ChatAiPicker } from "./chat-ai-picker";

type Thread = { id: number; title: string; updatedAt?: string | Date };
type ProjectOption = { id: number | string; name: string };

type ChatMessage = {
  id: number | string;
  role: "user" | "assistant";
  content: string;
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
  aiSettingsHref?: string;
};

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
  aiSettingsHref = "/integrations/ai",
}: SeoChatWorkspaceProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadId, setThreadId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<ChatAiStatus | null>(null);
  const [aiSaving, setAiSaving] = useState(false);

  const [liveRunId, setLiveRunId] = useState<number | null>(null);
  const [openRun, setOpenRun] = useState<AgentRunView | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const inspectGen = useRef(0);
  const sendGen = useRef(0);

  const loadThreads = useCallback(async () => {
    if (!projectId) return;
    const res = await request(`/api/seo-chat/threads?projectId=${projectId}`);
    if (!res.ok) throw new Error(await readApiError(res, "Could not load threads"));
    const data = (await res.json()) as { threads?: Thread[] };
    setThreads(data.threads ?? []);
  }, [projectId, request]);

  const loadAiStatus = useCallback(async () => {
    const res = await request("/api/ai-providers/status");
    if (!res.ok) {
      setAiStatus(null);
      return;
    }
    const data = (await res.json().catch(() => null)) as Parameters<typeof parseChatAiStatus>[0];
    setAiStatus(parseChatAiStatus(data));
  }, [request]);

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
    void loadAiStatus().catch(() => setAiStatus(null));
  }, [loadAiStatus]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: busy ? "auto" : "smooth" });
  }, [messages, busy, openRun]);

  function requireAiReady(): boolean {
    if (aiStatus?.ready === false) {
      setError(aiStatus.detail ?? "Configure an AI model in Integrations → AI first.");
      return false;
    }
    return true;
  }

  async function saveAiProvider(provider: ChatAiProviderId, model?: string | null) {
    if (!aiStatus) return;
    const option = aiStatus.options.find((row) => row.id === provider);
    setAiSaving(true);
    setError(null);
    try {
      const res = await request("/api/ai-providers/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          providerPatchBody({
            provider,
            model: model ?? option?.model,
            ollamaBaseUrl: aiStatus.ollamaBaseUrl,
          }),
        ),
      });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Could not update AI provider"));
      }
      await loadAiStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update AI provider");
      await loadAiStatus().catch(() => undefined);
    } finally {
      setAiSaving(false);
    }
  }

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
    if (!requireAiReady()) return;
    setError(null);
    const res = await request("/api/seo-chat/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: Number(projectId) }),
    });
    if (!res.ok) {
      setError(await readApiError(res, "Could not start a thread"));
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
    const onboard = /onboard|https?:\/\//i.test(trimmed);
    if (!trimmed || busy) return;
    if (!projectId && !onboard) return;
    if (!requireAiReady()) return;
    const gen = ++sendGen.current;
    setBusy(true);
    setError(null);
    setDraft("");
    setLiveChips([]);
    setLiveRunId(null);
    try {
      let activeId = threadId;
      let activeProject = projectId;
      if (!activeProject) {
        const boot = await request("/api/seo-chat/threads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ onboard: true, text: trimmed }),
        });
        const data = (await boot.json()) as { thread: Thread; projectId?: number; error?: string };
        if (!boot.ok) {
          throw new Error(data?.error || "Could not start onboarding");
        }
        if (!data.projectId) throw new Error("Could not start onboarding");
        activeId = data.thread.id;
        activeProject = String(data.projectId);
        setThreadId(activeId);
        setThreads((prev) => [data.thread, ...prev.filter((row) => row.id !== data.thread.id)]);
        onProjectChange(activeProject);
      }
      if (!activeId) {
        const res = await request("/api/seo-chat/threads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: Number(activeProject), title: trimmed.slice(0, 72) }),
        });
        if (!res.ok) throw new Error(await readApiError(res, "Could not start a thread"));
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
      if (!res.ok) throw new Error(await readApiError(res, "Chat request failed"));
      if (!res.body) throw new Error("Chat request failed");

       let assistant = "";
       let agentRunId: number | null = null;
       const cards: SeoChatCard[] = [];
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
                 next[next.length - 1] = { ...last, content: assistant, cards: [...cards], agentRunId };
               } else {
                 next.push({
                   id: "a-live",
                   role: "assistant",
                   content: assistant,
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
               cards?: SeoChatCard[];
               agentRunId?: number | null;
               projectId?: number;
             };
             const doneRunId = typeof doneData.agentRunId === "number" ? doneData.agentRunId : agentRunId;
             if (typeof doneData.projectId === "number" && String(doneData.projectId) !== projectId) {
               onProjectChange(String(doneData.projectId));
             }
             setMessages((prev) => {
               const next = prev.filter((row) => row.id !== "a-live" && !String(row.id).startsWith("a-live"));
               next.push({
                 id: doneData.assistantId ?? `a-${Date.now()}`,
                 role: "assistant",
                 content: doneData.content ?? assistant,
                 cards: doneData.cards ?? [],
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
       setLiveRunId(null);
     }
  }

  const empty = messages.length === 0 && !busy;

  const aiGate = (
    <div className="mt-3 w-full max-w-3xl space-y-2">
      <StudioAiReadinessBanner
        ready={aiStatus ? aiStatus.ready : null}
        activeProvider={aiStatus?.activeProvider ?? "gemini"}
        settingsHref={aiSettingsHref}
        renderLink={({ href, className, children }) => (
          <a href={href} className={className}>
            {children}
          </a>
        )}
      />
      {aiStatus ? (
        <ChatAiPicker
          status={aiStatus}
          saving={aiSaving}
          aiSettingsHref={aiSettingsHref}
          onSelectProvider={(provider) => void saveAiProvider(provider)}
          onSaveModel={(provider, model) => void saveAiProvider(provider, model)}
        />
      ) : null}
    </div>
  );

  const composer = (
    <ChatComposer
      draft={draft}
      busy={busy || aiStatus?.ready === false}
      projectId={projectId}
      projects={projects}
      threads={threads}
      threadId={threadId}
      onDraftChange={setDraft}
      onProjectChange={onProjectChange}
      onNewChat={() => void newThread()}
      onSelectThread={(id) => void loadThread(id)}
      onSend={() => void send(draft)}
    />
  );

  return (
    <div className="seo-chat-shell flex min-h-0 w-full flex-1 overflow-hidden text-foreground">
      <section className="seo-chat-stage relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {empty ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4">
            <h1 className="mb-7 text-center text-4xl font-normal tracking-tight text-foreground">
              Where should we start?
            </h1>
            <div className="w-full max-w-3xl">{composer}</div>
            {aiGate}
            {!projectId ? (
              <p className="mt-4 text-sm text-muted-foreground">Pick a site, or paste a URL to onboard.</p>
            ) : null}
            {error ? <p className="mt-3 text-center text-sm text-destructive">{error}</p> : null}
          </div>
        ) : (
          <>
            <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth">
              <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8">
                {messages.map((message) => (
                  <article key={String(message.id)} className="space-y-2">
                    {message.role === "user" ? (
                      <p className="seo-chat-user ml-auto max-w-[85%] rounded-sm border border-border px-4 py-2.5 text-[15px] leading-relaxed">
                        {message.content}
                      </p>
         ) : (
                       <>
                         <div className="whitespace-pre-wrap font-serif text-[17px] leading-7 text-foreground/95">{message.content}</div>
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
                            className="inline-flex items-center gap-1 rounded-sm px-2.5 py-1 text-[11px] text-muted-foreground transition-colors duration-150 ease-out hover:bg-secondary hover:text-foreground"
                            onClick={() => void send("Draft this")}
                          >
                            <PenLine className="h-3 w-3" />
                            Draft this
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-sm px-2.5 py-1 text-[11px] text-muted-foreground transition-colors duration-150 ease-out hover:bg-secondary hover:text-foreground"
                            onClick={() => void send("Add to Action Queue")}
                          >
                            <ListPlus className="h-3 w-3" />
                            Add to Action Queue
                          </button>
                          <button
                            type="button"
                            className="rounded-sm px-2.5 py-1 text-[11px] text-muted-foreground transition-colors duration-150 ease-out hover:bg-secondary hover:text-foreground"
                            onClick={() => void send("Show trajectory")}
                          >
                            Show trajectory
                          </button>
                          {message.agentRunId ? (
                            <>
                              <button
                                type="button"
                                className="rounded-sm px-2.5 py-1 text-[11px] text-muted-foreground transition-colors duration-150 ease-out hover:bg-secondary hover:text-foreground"
                                onClick={() => void inspectRun(message.agentRunId!)}
                              >
                                Inspect run
                              </button>
                              <a
                                href={runInspectorHref(actionsHref, message.agentRunId)}
                                className="rounded-sm px-2.5 py-1 text-[11px] text-muted-foreground transition-colors duration-150 ease-out hover:bg-secondary hover:text-foreground"
                              >
                                Open in Actions
                              </a>
                            </>
                          ) : (
                            <a
                              href={actionsHref}
                              className="rounded-sm px-2.5 py-1 text-[11px] text-muted-foreground transition-colors duration-150 ease-out hover:bg-secondary hover:text-foreground"
                            >
                              Open in Actions
                            </a>
                          )}
                          <a
                            href={studioHref()}
                            className="rounded-sm px-2.5 py-1 text-[11px] text-muted-foreground transition-colors duration-150 ease-out hover:bg-secondary hover:text-foreground"
                          >
                            Continue in Studio
                          </a>
                        </div>
                      </>
                    )}
                  </article>
                ))}

                 {busy && liveRunId ? (
                   <div className="flex flex-wrap items-center gap-2">
                     {liveRunId ? (
                       <button
                         type="button"
                         className="rounded-sm px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground"
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
            {error ? <p className="px-4 pb-2 text-center text-sm text-destructive">{error}</p> : null}
            <div className="seo-chat-composer-dock shrink-0 px-4 pb-6 pt-4">
              <div className="mx-auto w-full max-w-3xl">
                {composer}
                {aiGate}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function closeDetails(el: HTMLElement) {
  el.closest("details")?.removeAttribute("open");
}

function ChatComposer({
  draft,
  busy,
  projectId,
  projects,
  threads,
  threadId,
  onDraftChange,
  onProjectChange,
  onNewChat,
  onSelectThread,
  onSend,
}: {
  draft: string;
  busy: boolean;
  projectId: string;
  projects: ProjectOption[];
  threads: Thread[];
  threadId: number | null;
  onDraftChange: (value: string) => void;
  onProjectChange: (id: string) => void;
  onNewChat: () => void;
  onSelectThread: (id: number) => void;
  onSend: () => void;
}) {
  const canSend = Boolean(draft.trim() && !busy && (projectId || /onboard|https?:\/\//i.test(draft)));
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft]);

  return (
    <form
      className="seo-chat-composer flex items-end gap-2 rounded-sm px-3 py-2.5 ring-1 ring-border"
      onSubmit={(event) => {
        event.preventDefault();
        onSend();
      }}
    >
      <details className="relative mb-0.5 shrink-0">
        <summary
          className="inline-flex size-11 cursor-pointer list-none items-center justify-center rounded-sm text-foreground hover:bg-secondary [&::-webkit-details-marker]:hidden"
          aria-label="Conversations"
        >
          <Plus className="h-5 w-5" />
        </summary>
        <div className="hairline-panel absolute bottom-full left-0 z-20 mb-2 w-56 bg-background py-1">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors duration-150 ease-out hover:bg-secondary"
            onClick={(event) => {
              closeDetails(event.currentTarget);
              onNewChat();
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            New chat
          </button>
          {threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              className={cn(
                "w-full truncate px-3 py-2 text-left text-sm transition-colors duration-150 ease-out hover:bg-secondary",
                thread.id === threadId ? "text-foreground" : "text-muted-foreground",
              )}
              onClick={(event) => {
                closeDetails(event.currentTarget);
                onSelectThread(thread.id);
              }}
            >
              {thread.title}
            </button>
          ))}
        </div>
      </details>
      <label className="sr-only" htmlFor="seo-chat-input">
        Message
      </label>
      <textarea
        id="seo-chat-input"
        ref={inputRef}
        rows={1}
        value={draft}
        disabled={busy}
        onChange={(event) => onDraftChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSend();
          }
        }}
        placeholder={projectId ? "Ask about this site" : "Add a site URL or pick a site"}
        className="max-h-40 min-h-11 flex-1 resize-none bg-transparent py-2.5 text-base leading-snug text-foreground caret-foreground outline-none placeholder:text-muted-foreground selection:bg-primary/30 disabled:opacity-50"
      />
      <div className="relative mb-0.5 shrink-0">
        <label className="sr-only" htmlFor="seo-chat-project">
          Site
        </label>
        <select
          id="seo-chat-project"
          className="h-11 max-w-32 cursor-pointer appearance-none bg-transparent py-1 pl-2 pr-6 text-sm text-muted-foreground outline-none"
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
        <ChevronDown className="pointer-events-none absolute right-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      </div>
      <button
        type="submit"
        disabled={!canSend}
        className="mb-0.5 inline-flex size-11 shrink-0 items-center justify-center rounded-sm bg-foreground text-background disabled:bg-transparent disabled:text-muted-foreground disabled:opacity-40"
        aria-label="Send"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </form>
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
  if (card.kind === "choice") {
    return (
      <div className="hairline-panel p-3 text-sm">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{card.title}</p>
        <p className="mt-1 text-muted-foreground">{card.prompt}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {card.options.map((option) => (
            <button
              key={option.id}
              type="button"
              className="border px-2 py-1 text-[11px]"
              onClick={() => onAction(option.send)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (card.kind === "learn_summary") {
    return (
      <div className="hairline-panel p-3 text-sm">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{card.title}</p>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
          {card.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </div>
    );
  }
  if (card.kind === "opportunity") {
    return (
      <div className="hairline-panel p-3 text-sm">
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
      <div className="hairline-panel p-3 text-sm">
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
  if (card.kind === "nav_link") {
    return (
      <div className="hairline-panel p-3 text-sm">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{card.title}</p>
        <p className="mt-1 text-muted-foreground">{card.reason}</p>
        <div className="mt-2">
          <a href={card.href} className="border px-2 py-1 text-[11px]">
            Open
          </a>
        </div>
      </div>
    );
  }
  if (card.kind === "readiness") {
    return (
      <div className="hairline-panel p-3 text-sm">
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
    <div className="hairline-panel border-primary p-3 text-sm">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Live publish gate</p>
      <p className="mt-1">Approve-first. Approve here to enqueue a live WordPress publish.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className="border border-primary px-2 py-1 text-[11px]" onClick={() => onAction("approve live publish")}>
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
