import type { SeoChatCard } from "./seo-chat-format";
import {
  GOAL_CHOICE,
  VERTICAL_CHOICE,
  choiceCard,
  extractHttpUrl,
  hostnameFromUrl,
  parseGoal,
  parseSkip,
  parseVertical,
  type ChatPlaybookState,
} from "./playbooks";
import {
  createProjectForChatOnboard,
  listTopicKeywords,
  loadLearnSummary,
  patchChatProjectName,
  styleNeedsQuestions,
  wordpressConnected,
} from "./chat-onboard";

export type OnboardAdvance = {
  reply: string;
  cards: SeoChatCard[];
  state: ChatPlaybookState | null;
  projectId?: number;
};

export async function advanceOnboard(input: {
  userId: number;
  text: string;
  state: ChatPlaybookState;
  projectId?: number;
}): Promise<OnboardAdvance> {
  const payload = { ...input.state.payload };
  const text = input.text.trim();
  let projectId = input.projectId ?? num(payload.projectId);
  const step = input.state.step;

  const next = (
    nextStep: string,
    reply: string,
    cards: SeoChatCard[] = [],
  ): OnboardAdvance => ({
    reply,
    cards,
    state: { id: "onboard", step: nextStep, payload },
    projectId,
  });

  if (step === "ask_url") {
    const url = extractHttpUrl(text);
    if (!url) return next("ask_url", "Paste the site URL to onboard (including https://).");
    payload.websiteUrl = url;
    return next("ask_name", `What's the name of the firm for ${hostnameFromUrl(url)}?`);
  }

  if (step === "ask_name") {
    const urlInText = extractHttpUrl(text);
    if (urlInText) {
      payload.websiteUrl = payload.websiteUrl ?? urlInText;
      payload.orgName = hostnameFromUrl(urlInText);
      return next("ask_vertical", "Which vertical fits this firm?", [VERTICAL_CHOICE]);
    }
    if (!looksLikeName(text)) {
      return next("ask_name", "Firm name, in a few words?");
    }
    payload.orgName = text;
    return next("ask_vertical", "Which vertical fits this firm?", [VERTICAL_CHOICE]);
  }

  if (step === "ask_vertical") {
    const vertical = parseVertical(text);
    if (!vertical) return next("ask_vertical", "Pick a vertical.", [VERTICAL_CHOICE]);
    payload.vertical = vertical;
    const url = String(payload.websiteUrl ?? "");
    if (!projectId) {
      if (!url) return next("ask_url", "I still need the site URL (https://…).");
      const created = await createProjectForChatOnboard({
        userId: input.userId,
        url,
        name: str(payload.orgName),
      });
      projectId = created.projectId;
      payload.projectId = projectId;
    }
    if (projectId && str(payload.orgName)) await patchChatProjectName(projectId, str(payload.orgName)!);
    return next("ask_goal", "What should this site's content primarily do?", [GOAL_CHOICE]);
  }

  if (step === "ask_goal") {
    const goal = parseGoal(text);
    if (!goal) return next("ask_goal", "Leads, traffic, or authority?", [GOAL_CHOICE]);
    payload.goal = goal;
    return next("ask_audience", "Who is the primary audience, in one sentence?");
  }

  if (step === "ask_audience") {
    payload.audience = text;
    return next("ask_competitors", "Competitor URLs (comma-separated), or skip.");
  }

  if (step === "ask_competitors") {
    payload.competitors = parseSkip(text)
      ? []
      : text.split(/[\s,]+/).filter((part) => /^https?:\/\//i.test(part));
    return next("ask_voice", "Paste a few writing samples, or skip. Scrape already started on the site.", [
      choiceCard("Voice", "Paste samples or skip.", [{ id: "skip", label: "Skip", send: "skip" }]),
    ]);
  }

  if (step === "ask_voice") {
    payload.voiceDone = parseSkip(text) ? "skipped" : "paste";
    return next(
      "connect_gsc",
      "Connect Search Console if you have it. I will not invent rankings without it.",
      [
        {
          kind: "nav_link",
          title: "Search Console",
          href: projectId ? `/projects/${projectId}` : "/projects",
          reason: "Open the project to connect GSC, then say skip or connected.",
        },
        choiceCard("Search Console", "Connected, or skip for now?", [
          { id: "skip", label: "Skip", send: "skip" },
          { id: "done", label: "Connected", send: "connected" },
        ]),
      ],
    );
  }

  if (step === "connect_gsc") {
    payload.gscDone = true;
    return next("connect_wp", "Connect WordPress so chat can push drafts later.", [
      {
        kind: "nav_link",
        title: "WordPress",
        href: projectId ? `/projects/${projectId}` : "/projects",
        reason: "Open Publishing settings, then say skip or connected.",
      },
      choiceCard("WordPress", "Connected, or skip for now?", [
        { id: "skip", label: "Skip", send: "skip" },
        { id: "done", label: "Connected", send: "connected" },
      ]),
    ]);
  }

  if (step === "connect_wp") {
    payload.wpDone = true;
    if (projectId) payload.wpConnected = await wordpressConnected(projectId);
    if (!projectId) return finish(payload, undefined);
    const learn = await loadLearnSummary(projectId);
    payload.learn = learn;
    if (await styleNeedsQuestions(projectId)) {
      return next(
        "style_pitch",
        `${learn.bullets.join("\n")}\n\nThe site did not give enough voice material. How should this brand sound in one sentence?`,
        [{ kind: "learn_summary", title: learn.title, bullets: learn.bullets }],
      );
    }
    return topicsPrompt(projectId, payload, learn);
  }

  if (step === "style_pitch") {
    payload.stylePitch = text;
    if (!projectId) return finish(payload, undefined);
    const learn = (payload.learn as { title: string; bullets: string[] } | undefined) ?? (await loadLearnSummary(projectId));
    return topicsPrompt(projectId, payload, learn);
  }

  if (step === "topics") {
    return finish(payload, projectId);
  }

  return finish(payload, projectId);
}

async function topicsPrompt(
  projectId: number,
  payload: Record<string, unknown>,
  learn: { title: string; bullets: string[] },
): Promise<OnboardAdvance> {
  const topics = await listTopicKeywords(projectId);
  payload.topics = topics;
  return {
    reply: topics.length
      ? `I found these topic seeds: ${topics.join(", ")}. Pick one later in chat, or skip.`
      : "No keyword opportunities yet. Skip and ask me to research a topic when you are ready.",
    cards: [
      { kind: "learn_summary", title: learn.title, bullets: learn.bullets },
      choiceCard("Topics", "Looks good, or skip?", [
        { id: "skip", label: "Skip", send: "skip" },
        { id: "done", label: "Looks good", send: "done" },
      ]),
    ],
    state: { id: "onboard", step: "topics", payload },
    projectId,
  };
}

function finish(payload: Record<string, unknown>, projectId?: number): OnboardAdvance {
  const learn = payload.learn as { bullets?: string[] } | undefined;
  return {
    reply: learn?.bullets?.length
      ? `Onboarding is in place. ${learn.bullets.join(" ")} Ask me to research a topic next.`
      : "Onboarding is in place. Ask me to research a topic next.",
    cards: learn?.bullets ? [{ kind: "learn_summary", title: "Learned", bullets: learn.bullets }] : [],
    state: null,
    projectId,
  };
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function num(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

function looksLikeName(text: string): boolean {
  if (extractHttpUrl(text)) return false;
  const trimmed = text.trim();
  return trimmed.length >= 2 && trimmed.length <= 80 && !parseVertical(trimmed) && !parseGoal(trimmed);
}
