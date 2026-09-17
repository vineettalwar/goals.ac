import type { SeoChatCard } from "./seo-chat-format";

export type ChatPlaybookId = "onboard" | "research_ask_draft" | "publish_ask";

export type ChatPlaybookState = {
  id: ChatPlaybookId;
  step: string;
  payload: Record<string, unknown>;
};

export const ONBOARD_URL_RE = /https?:\/\/[^\s)]+/i;

export function extractHttpUrl(text: string): string | undefined {
  const match = text.match(ONBOARD_URL_RE)?.[0];
  return match?.replace(/[.,;]+$/, "");
}

export function wantsOnboard(text: string): boolean {
  const lower = text.toLowerCase();
  if (/\b(onboard|new (site|project)|add (a |this )?site|set up (a |this )?site)\b/.test(lower)) return true;
  return Boolean(extractHttpUrl(text)) && /\b(add|onboard|set up|connect|new project)\b/.test(lower);
}

export function wantsCancelPlaybook(text: string): boolean {
  return /^(cancel|stop|never mind|abort)(\s+playbook)?\.?$/i.test(text.trim());
}

export function parseVertical(text: string): "law" | "dental" | "software" | "marketing" | "other" | undefined {
  const lower = text.trim().toLowerCase();
  if (/\blaw\b|legal/.test(lower)) return "law";
  if (/\bdental\b|dentist/.test(lower)) return "dental";
  if (/\bsoftware\b|saas|tech/.test(lower)) return "software";
  if (/\bmarketing\b|agency/.test(lower)) return "marketing";
  if (/\bother\b/.test(lower)) return "other";
  return undefined;
}

export function parseGoal(text: string): "leads" | "traffic" | "authority" | undefined {
  const lower = text.trim().toLowerCase();
  if (/\bleads?\b/.test(lower)) return "leads";
  if (/\btraffic\b/.test(lower)) return "traffic";
  if (/\bauthority\b/.test(lower)) return "authority";
  return undefined;
}

export function parsePublishChoice(text: string): "draft" | "publish" | "skip" | null {
  const lower = text.trim().toLowerCase();
  if (/^(skip|not now|later|no)\.?$/.test(lower) || /\bskip (publish|wordpress|wp)\b/.test(lower)) return "skip";
  if (/\b(as )?draft\b/.test(lower) && /\b(wordpress|wp|cms|push|publish)\b/.test(lower)) return "draft";
  if (/^draft\.?$/.test(lower) || /^push as draft\.?$/.test(lower)) return "draft";
  if (/\b(live|publish live|go live)\b/.test(lower)) return "publish";
  if (/^live\.?$/.test(lower)) return "publish";
  return null;
}

export function parseSkip(text: string): boolean {
  return /^(skip|none|n\/a|no|not now|later)\.?$/i.test(text.trim());
}

export function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "") || url;
  } catch {
    return url;
  }
}

export function asPlaybookState(raw: unknown): ChatPlaybookState | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as { id?: unknown; step?: unknown; payload?: unknown };
  if (row.id !== "onboard" && row.id !== "research_ask_draft" && row.id !== "publish_ask") return null;
  if (typeof row.step !== "string" || !row.step) return null;
  const payload = row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
    ? (row.payload as Record<string, unknown>)
    : {};
  return { id: row.id, step: row.step, payload };
}

export function choiceCard(
  title: string,
  prompt: string,
  options: Array<{ id: string; label: string; send: string }>,
): SeoChatCard {
  return { kind: "choice", title, prompt, options };
}

export function onboardStartState(url?: string): ChatPlaybookState {
  if (url) {
    return { id: "onboard", step: "ask_name", payload: { websiteUrl: url } };
  }
  return { id: "onboard", step: "ask_url", payload: {} };
}

export function researchAskState(
  keyword: string,
  userPrompt?: string,
  step: "research" | "ask" | "draft" = "research",
): ChatPlaybookState {
  return {
    id: "research_ask_draft",
    step,
    payload: { keyword, ...(userPrompt ? { userPrompt } : {}) },
  };
}

export function publishAskState(contentPieceId: number): ChatPlaybookState {
  return { id: "publish_ask", step: "choose", payload: { contentPieceId } };
}

export const VERTICAL_CHOICE = choiceCard("Vertical", "What kind of firm is this?", [
  { id: "software", label: "Software", send: "software" },
  { id: "marketing", label: "Marketing", send: "marketing" },
  { id: "law", label: "Law", send: "law" },
  { id: "dental", label: "Dental", send: "dental" },
  { id: "other", label: "Other", send: "other" },
]);

export const GOAL_CHOICE = choiceCard("Goal", "What should content primarily do?", [
  { id: "leads", label: "Leads", send: "leads" },
  { id: "traffic", label: "Traffic", send: "traffic" },
  { id: "authority", label: "Authority", send: "authority" },
]);

export const WP_STATUS_CHOICE = choiceCard("WordPress", "Push this piece as a WordPress draft, or live?", [
  { id: "draft", label: "Draft", send: "push wordpress as draft" },
  { id: "live", label: "Live", send: "push wordpress live" },
  { id: "skip", label: "Not now", send: "skip publish" },
]);

export const RESEARCH_OPINION_CHOICE = (keyword: string): SeoChatCard =>
  choiceCard("Your call", `I researched “${keyword}”. Draft it, change the angle, or skip?`, [
    { id: "draft", label: "Draft this", send: "Draft this" },
    { id: "skip", label: "Skip", send: "skip" },
  ]);
