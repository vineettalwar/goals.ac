import { trajectoryHasVerifiedEvidence, type AgentGoal, type TrajectoryStep } from "./types";

export const CHAT_AGENT_LOOP_CAPS = { stepBudget: 8, maxCredits: 12 } as const;

export const TOOL_CHIP_LABELS: Record<string, string> = {
  gsc_query: "Queried GSC",
  site_context: "Loaded site",
  keyword_context: "Loaded keywords",
  competitor_context: "Loaded competitors",
  inspect_url: "Inspected URL",
  get_backlinks_overview: "Checked backlinks",
  publish_readiness: "Scored readiness",
  upsert_action_queue: "Updated Action Queue",
  generate_draft: "Drafted piece",
  publish_live: "Live publish gated",
};

export type SeoChatCard =
  | {
      kind: "opportunity";
      title: string;
      keyword: string;
      actionItemId?: number;
      score?: number;
      url?: string | null;
    }
  | { kind: "draft_preview"; title: string; excerpt: string; contentPieceId: number }
  | { kind: "readiness"; ok: boolean; label: string; blockers: string[]; contentPieceId?: number }
  | { kind: "publish_gate"; runId: number; contentPieceId?: number | null };

export type SeoChatChip = { tool: string; label: string; ok?: boolean };

export type ChatIntent =
  | { kind: "opportunity_scan" }
  | { kind: "research_then_draft"; keyword: string }
  | { kind: "execute_action"; actionType: "inspect_url"; targetUrl: string; keyword?: string }
  | { kind: "publish_check"; contentPieceId?: number }
  | { kind: "chat_turn"; actionType?: string; keyword?: string; targetUrl?: string; contentPieceId?: number }
  | { kind: "show_trajectory" }
  | { kind: "memory"; field: "brandVoiceNotes" | "bannedClaims" | "lastDecisions"; text: string };

export type SeoChatStreamEvent =
  | { event: "user"; data: { id: number; content: string } }
  | { event: "run"; data: { agentRunId: number; status: string } }
  | { event: "loop_step"; data: { tool?: string; label: string; summary?: string; ok?: boolean; agentRunId?: number } }
  | { event: "delta"; data: { text: string } }
  | { event: "card"; data: SeoChatCard }
  | {
      event: "done";
      data: {
        assistantId: number;
        agentRunId: number | null;
        content: string;
        chips: SeoChatChip[];
        cards: SeoChatCard[];
        missing: string[];
        citations: string[];
      };
    }
  | { event: "error"; data: { error: string } };

export function runInspectorHref(actionsHref: string, runId: number): string {
  const join = actionsHref.includes("?") ? "&" : "?";
  return `${actionsHref}${join}runId=${runId}`;
}

const URL_RE = /https?:\/\/[^\s)]+/i;

export function parseChatIntent(text: string, opts?: { contentPieceId?: number }): ChatIntent {
  const raw = text.trim();
  const lower = raw.toLowerCase();

  const voice = raw.match(/^(?:remember\s+)?voice(?:\s+notes?)?\s*[:—-]\s*(.+)$/i);
  if (voice?.[1]) return { kind: "memory", field: "brandVoiceNotes", text: voice[1].trim() };

  const banned = raw.match(/^(?:remember\s+)?(?:never claim|banned(?:\s+claims?)?)\s*[:—-]\s*(.+)$/i);
  if (banned?.[1]) return { kind: "memory", field: "bannedClaims", text: banned[1].trim() };

  const decided = raw.match(/^(?:remember\s+(?:that\s+)?(?:we\s+)?decided|decision)\s*[:—-]\s*(.+)$/i);
  if (decided?.[1]) return { kind: "memory", field: "lastDecisions", text: decided[1].trim() };

  if (/\b(show|open)\s+(the\s+)?trajectory\b|\blast run\b/.test(lower)) {
    return { kind: "show_trajectory" };
  }

  const url = raw.match(URL_RE)?.[0];
  if (/\brelaunch|\binspect(\s+url)?\b|\bcoverage\b/.test(lower) && url) {
    return { kind: "execute_action", actionType: "inspect_url", targetUrl: url, keyword: keywordFrom(raw) };
  }

  if (/\b(go\s+live|publish\s+live|live\s+publish)\b/.test(lower)) {
    return { kind: "publish_check", contentPieceId: opts?.contentPieceId };
  }

  if (/\bctr(\s+gap)?s?\b|\blow ctr\b/.test(lower) || /\bwhat'?s slipping\b|\bslipping\b|\bposition slip\b/.test(lower)) {
    return { kind: "opportunity_scan" };
  }

  if (/\badd to (the\s+)?action queue\b|\benqueue\b/.test(lower)) {
    return { kind: "chat_turn", actionType: "enqueue", keyword: keywordFrom(raw) };
  }

  const keyword = draftKeyword(raw);
  if (keyword && wantsStudioDraft(lower) && !/^draft this\.?$/i.test(raw)) {
    return { kind: "research_then_draft", keyword };
  }

  return {
    kind: "chat_turn",
    keyword: keywordFrom(raw),
    targetUrl: url,
    contentPieceId: opts?.contentPieceId,
  };
}

function stripTopic(value: string): string {
  return value.trim().replace(/[.?!]+$/, "").replace(/\s+/g, " ");
}

function wantsStudioDraft(lower: string): boolean {
  if (/\b(brief|draft|write)\b/.test(lower)) return true;
  return (
    /\b(create|make|generate)\b/.test(lower) && /\b(content|article|post|piece|blog)\b/.test(lower)
  );
}

function draftKeyword(text: string): string | undefined {
  const brief = text.match(/\b(?:brief|draft)\s+(?:this\s+)?(?:for\s+)?["“]?([^"”\n]+?)["”]?\s*$/i);
  const about = text.match(/\b(?:draft|write|brief|create|make|generate)\b.{0,48}\b(?:about|for|on)\s+(.+)$/i);
  const topic = stripTopic(brief?.[1] ?? about?.[1] ?? "");
  return topic || keywordFrom(text);
}

export function keywordFrom(text: string): string | undefined {
  const quoted = text.match(/["“]([^"”]+)["”]/);
  if (quoted?.[1]) return stripTopic(quoted[1]);
  const about = text.match(/\b(?:about|on)\s+([a-z0-9][\w\s-]{1,80})$/i);
  if (about?.[1] && !/^https?:/i.test(about[1])) return stripTopic(about[1]);
  const forKw = text.match(/\bfor\s+([a-z0-9][\w\s-]{1,80})$/i);
  if (forKw?.[1] && !/^https?:/i.test(forKw[1])) return stripTopic(forKw[1]);
  return undefined;
}

export function goalFromIntent(intent: ChatIntent, projectId: number, text: string): AgentGoal | null {
  if (intent.kind === "show_trajectory" || intent.kind === "memory") return null;
  if (intent.kind === "opportunity_scan") {
    return { kind: "opportunity_scan", text, projectId };
  }
  if (intent.kind === "research_then_draft") {
    return { kind: "research_then_draft", text, projectId, keyword: intent.keyword };
  }
  if (intent.kind === "execute_action") {
    return {
      kind: "execute_action",
      text,
      projectId,
      actionType: intent.actionType,
      targetUrl: intent.targetUrl,
      keyword: intent.keyword,
    };
  }
  if (intent.kind === "publish_check") {
    return { kind: "publish_check", text, projectId, contentPieceId: intent.contentPieceId };
  }
  return {
    kind: "chat_turn",
    text,
    projectId,
    keyword: intent.keyword,
    targetUrl: intent.targetUrl,
    actionType: intent.actionType,
    contentPieceId: intent.contentPieceId,
  };
}

export function chipLabel(tool?: string): string {
  if (!tool) return "Stopped";
  return TOOL_CHIP_LABELS[tool] ?? tool.replaceAll("_", " ");
}

export function composeGroundedReply(input: {
  intent: ChatIntent;
  text: string;
  run: {
    status: string;
    stopReason: string | null;
    trajectory: TrajectoryStep[];
    contentPieceId?: number | null;
    id?: number;
  } | null;
  missingExtras?: string[];
}): { content: string; citations: string[]; missing: string[]; verified: boolean } {
  const verified = input.run ? trajectoryHasVerifiedEvidence(input.run.trajectory) : false;
  const citations: string[] = [];
  const missing: string[] = [...(input.missingExtras ?? [])];

  for (const step of input.run?.trajectory ?? []) {
    if (step.evidenceRefs?.length) {
      for (const ref of step.evidenceRefs) {
        if (ref.verified && ref.source) citations.push(ref.source);
      }
    } else if (step.tool && step.summary && /not connected|no .*row|missing|empty|not configured/i.test(step.summary)) {
      missing.push(step.summary);
    }
  }

  const uniqueCitations = [...new Set(citations)].slice(0, 8);
  const uniqueMissing = [...new Set(missing)].slice(0, 8);

  const lines: string[] = [];
  if (!input.run) {
    lines.push(input.text);
  } else if (input.run.status === "no_evidence") {
    lines.push(
      input.run.stopReason ??
        "No connected research evidence (GSC, keywords, or competitors). I will not mark anything verified.",
    );
  } else if (input.run.status === "awaiting_approval") {
    lines.push(
      "Live CMS publish is gated. Approve in this thread, then push from Studio — the loop does not auto-publish.",
    );
  } else if (input.intent.kind === "opportunity_scan") {
    lines.push(
      verified
        ? "Scored Search Console and refresh signals into the Action Queue."
        : "Ran an opportunity scan. Queue items are only as good as the connected data.",
    );
  } else if (input.intent.kind === "research_then_draft") {
    lines.push(
      input.run.contentPieceId
        ? `Draft piece ${input.run.contentPieceId} is in Studio.`
        : "Research ran. No draft piece was stored.",
    );
  } else {
    lines.push(input.run.stopReason ?? "Finished a research turn on this project.");
  }

  if (uniqueCitations.length > 0) {
    lines.push("Evidence: " + uniqueCitations.join("; ") + ".");
  } else {
    lines.push("No tool evidence to cite. Nothing here is marked verified.");
  }

  if (uniqueMissing.length > 0) {
    lines.push("Missing: " + uniqueMissing.join("; ") + ".");
  }

  if (!verified) {
    lines.push("Grounding: not verified.");
  }

  return { content: lines.join("\n\n"), citations: uniqueCitations, missing: uniqueMissing, verified };
}

export function suggestionPrompts(keyword = "[keyword]", url = "[url]") {
  return ["What's slipping?", "CTR gaps", `Brief for ${keyword}`, `Relaunch risk for ${url}`];
}
