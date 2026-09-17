import { trajectoryHasVerifiedEvidence, type AgentGoal, type TrajectoryStep } from "./types";
import { chatCapabilityPromptList } from "./chat-catalog";

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
  publish_cms: "Queued WordPress draft",
  suggest_ctr_title: "Suggested CTR titles",
  suggest_internal_links: "Suggested internal links",
  strategy_overview: "Loaded strategy",
  calendar_overview: "Loaded calendar",
  performance_overview: "Loaded performance",
  visibility_overview: "Loaded visibility",
  geo_last_audit: "Loaded GEO audit",
  social_queue_status: "Loaded social queue",
  autopilot_status: "Loaded Autopilot",
  integrations_health: "Checked integrations",
  generate_roadmap: "Generated roadmap",
  generate_topical_map: "Generated topical map",
  run_geo_audit: "Ran GEO audit",
  run_visibility_check: "Queued visibility check",
  start_daily_five: "Started Daily Five",
  draft_social: "Drafted social",
  brand_rescan: "Queued brand rescan",
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
  | { kind: "publish_gate"; runId: number; contentPieceId?: number | null }
  | { kind: "nav_link"; title: string; href: string; reason: string }
  | {
      kind: "choice";
      title: string;
      prompt: string;
      options: Array<{ id: string; label: string; send: string }>;
    }
  | { kind: "learn_summary"; title: string; bullets: string[] };

export type SeoChatChip = { tool: string; label: string; ok?: boolean };

export type ChatIntent =
  | { kind: "opportunity_scan" }
  | { kind: "research_then_draft"; keyword: string; userPrompt?: string }
  | { kind: "execute_action"; actionType: "inspect_url"; targetUrl: string; keyword?: string }
  | { kind: "publish_check"; contentPieceId?: number; cmsStatus?: "draft" | "publish" }
  | { kind: "approve_live" }
  | { kind: "onboard" }
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
        projectId?: number;
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

  if (/^(approve(d)? live publish|decision:\s*approved live publish)\.?$/i.test(raw)) {
    return { kind: "approve_live" };
  }

  if (/\b(go\s+live|publish\s+live|live\s+publish|push wordpress live|push to wordpress live)\b/.test(lower)) {
    return { kind: "publish_check", contentPieceId: opts?.contentPieceId, cmsStatus: "publish" };
  }

  if (/\b(push (to )?(wordpress|wp) as draft|wordpress draft|push as draft)\b/.test(lower)) {
    return { kind: "publish_check", contentPieceId: opts?.contentPieceId, cmsStatus: "draft" };
  }

  if (/\bpush to (wordpress|wp)\b/.test(lower)) {
    return { kind: "publish_check", contentPieceId: opts?.contentPieceId };
  }

  if (/\b(onboard|new (site|project)|add (a |this )?site|set up (a |this )?site)\b/.test(lower)) {
    return { kind: "onboard" };
  }

  if (/\bctr\b/.test(lower) && /\b(title|meta|rewrite|suggest)\b/.test(lower) && !/\bgaps?\b/.test(lower)) {
    return { kind: "chat_turn", actionType: "ctr_title", keyword: keywordFrom(raw) ?? draftKeyword(raw), targetUrl: url };
  }

  if (/\bctr(\s+gap)?s?\b|\blow ctr\b/.test(lower) || /\bwhat'?s slipping\b|\bslipping\b|\bposition slip\b/.test(lower)) {
    return { kind: "opportunity_scan" };
  }

  if (/\binternal links?\b/.test(lower)) {
    return { kind: "chat_turn", actionType: "internal_link", keyword: keywordFrom(raw), targetUrl: url };
  }

  if (/\bbacklinks?\b/.test(lower)) {
    return { kind: "chat_turn", actionType: "backlinks", keyword: keywordFrom(raw) };
  }

  if (/\b(publish )?readiness\b|\bready to publish\b/.test(lower)) {
    return { kind: "chat_turn", actionType: "readiness", contentPieceId: opts?.contentPieceId };
  }

  if (/\badd to (the\s+)?action queue\b|\benqueue\b/.test(lower)) {
    return { kind: "chat_turn", actionType: "enqueue", keyword: keywordFrom(raw) };
  }

  if (/\b(generate|create|build|write)\b.{0,24}\b(roadmap|plan)\b/.test(lower)) {
    return { kind: "chat_turn", actionType: "generate_roadmap" };
  }
  if (/\b(show|open|load)\b.{0,24}\b(roadmap|strategy)\b/.test(lower) || /\bshow the roadmap\b/.test(lower)) {
    return { kind: "chat_turn", actionType: "strategy_overview" };
  }

  if (/\b(generate|create|build)\b.{0,24}\btopical map\b/.test(lower)) {
    return { kind: "chat_turn", actionType: "generate_topical_map" };
  }

  if (/\bcalendar\b/.test(lower)) {
    return { kind: "chat_turn", actionType: "calendar_overview" };
  }

  if (/\bperformance\b/.test(lower)) {
    return { kind: "chat_turn", actionType: "performance_overview" };
  }

  if (/\b(run|check|refresh)\b.{0,24}\b(ai )?visibility\b/.test(lower)) {
    return { kind: "chat_turn", actionType: "run_visibility_check" };
  }
  if (/\b(ai )?visibility\b/.test(lower)) {
    return { kind: "chat_turn", actionType: "visibility_overview" };
  }

  if (/\b(run|start)\b.{0,20}\bgeo\b/.test(lower) || /\bgeo audit for\b/.test(lower)) {
    return { kind: "chat_turn", actionType: "run_geo_audit", targetUrl: url };
  }
  if (/\bgeo\b/.test(lower)) {
    return { kind: "chat_turn", actionType: "geo_last_audit", targetUrl: url };
  }

  if (/\bdraft\b.{0,20}\b(linkedin|twitter|instagram|facebook|bluesky|mastodon|social)\b/.test(lower) || /\b(linkedin|twitter) post\b/.test(lower)) {
    return { kind: "chat_turn", actionType: "draft_social", keyword: keywordFrom(raw) ?? draftKeyword(raw) };
  }
  if (/\bsocial( queue)?\b/.test(lower)) {
    return { kind: "chat_turn", actionType: "social_queue_status" };
  }

  if (/\bautopilot\b/.test(lower)) {
    return { kind: "chat_turn", actionType: "autopilot_status" };
  }

  if (/\bintegrations?\b/.test(lower)) {
    return { kind: "chat_turn", actionType: "integrations_health" };
  }

  if (/\bdaily five\b/.test(lower)) {
    return { kind: "chat_turn", actionType: "start_daily_five", keyword: dailyFiveKeywords(raw) };
  }

  if (/\b(re)?scan (the )?brand\b|\bbrand (re)?scan\b/.test(lower)) {
    return { kind: "chat_turn", actionType: "brand_rescan" };
  }

  if (/\bcompetitors?\b/.test(lower) && !wantsStudioDraft(lower)) {
    return { kind: "chat_turn", actionType: "competitor_overview" };
  }

  const keyword = draftKeyword(raw);
  if (keyword && wantsStudioDraft(lower) && !/^draft this\.?$/i.test(raw)) {
    return { kind: "research_then_draft", keyword };
  }

  if (raw.length >= 280 && !url) {
    const topic = keywordFrom(raw) ?? stripTopic(raw.slice(0, 80));
    return { kind: "research_then_draft", keyword: topic || "untitled", userPrompt: raw };
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

function dailyFiveKeywords(text: string): string | undefined {
  const match = text.match(/\bdaily five(?:\s+for)?\s*[:—-]?\s*(.+)$/i);
  const topic = stripTopic(match?.[1] ?? "");
  if (!topic || /^\[keyword\]$/i.test(topic)) return undefined;
  return topic;
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
  if (intent.kind === "show_trajectory" || intent.kind === "memory" || intent.kind === "onboard" || intent.kind === "approve_live") {
    return null;
  }
  if (intent.kind === "opportunity_scan") {
    return { kind: "opportunity_scan", text, projectId };
  }
  if (intent.kind === "research_then_draft") {
    return {
      kind: "research_then_draft",
      text,
      projectId,
      keyword: intent.keyword,
      userPrompt: intent.userPrompt,
      askBeforeDraft: true,
    };
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
    return {
      kind: "publish_check",
      text,
      projectId,
      contentPieceId: intent.contentPieceId,
      cmsStatus: intent.cmsStatus,
    };
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
    lines.push("Live WordPress publish is gated. Approve in this thread to enqueue the live CMS job.");
  } else if (input.run.status === "awaiting_user") {
    lines.push(input.run.stopReason ?? "Research finished. Tell me the angle, or say Draft this.");
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
  return chatCapabilityPromptList("full", keyword, url);
}
