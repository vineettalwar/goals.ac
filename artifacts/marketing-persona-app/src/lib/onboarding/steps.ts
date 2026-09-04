import {
  ONBOARDING_STEP_IDS,
  type OnboardingAnswers,
  type OnboardingStepId,
  type OnboardingStepStatus,
} from "@workspace/db/schema";
import { VERTICAL_PRESETS, VERTICAL_IDS } from "@workspace/content-engine/vertical-presets";

/**
 * Steps are data, not hardcoded pages. The UI stream renders whatever this array
 * says, in order. Question copy is the product's first impression on a firm paying
 * ~500 EUR/month, so it reads like a sharp consultant asking one thing at a time,
 * not a form label.
 */
export interface OnboardingStepOption {
  value: string;
  label: string;
  blurb?: string;
}

/**
 * Context resolveNextStep needs beyond the session's own answers/status to decide
 * a conditional step. Kept to a single field today (the style-sufficiency signal)
 * but shaped as its own type so a future conditional step does not have to grow
 * resolveNextStep's parameter list again.
 *
 * `styleSufficiency` is read off the project's brand profile
 * (`brand_profiles.brand_memory.styleSufficiency`), written by a separate work
 * stream's `evaluateStyleSufficiency()`. This module never imports that function,
 * it only knows the shape of what it writes, declared structurally wherever the
 * value is read off the database (see `style-context.ts`), so this registry does
 * not depend on that stream's build order.
 *
 * `undefined`/`null` means "not recorded yet": the scan may still be running, or
 * the firm skipped past `website` entirely. Steps that key off this context must
 * treat that case as "do not ask" rather than "block until it arrives". The scan
 * finishing is not an onboarding-flow dependency, `voice_review` and the terminal
 * step already carry their own "still learning" state for a scan in flight, and a
 * step that blocked here could strand a firm behind a scan that never completes.
 */
export interface OnboardingStepContext {
  styleSufficiency?: { sufficient: boolean } | null;
}

export interface OnboardingStepDefinition {
  id: OnboardingStepId;
  /** The single question shown on screen. */
  question: string;
  /** One supporting line under the question. */
  helper?: string;
  kind: "text" | "url" | "choice" | "multi" | "connect" | "review" | "terminal";
  /** false = the firm can move on without answering. */
  required: boolean;
  /** Present for `choice` steps. */
  options?: OnboardingStepOption[];
  /** Input placeholder for `text`, `url` and `multi` steps. */
  placeholder?: string;
  /** True once the answers already cover this step — invite prefill or a prior answer. */
  isSatisfied(answers: OnboardingAnswers): boolean;
  /**
   * Whether this step is even in play for this session. Default (omitted) is
   * "always ask": only a step that is genuinely conditional on something outside
   * the answers themselves (a style-sufficiency signal, say) needs to define this.
   * A step that returns false here is treated exactly like one satisfied by invite
   * prefill: resolveNextStep skips past it without ever rendering it or writing a
   * stepStatus entry for it.
   */
  shouldAsk?(context: OnboardingStepContext): boolean;
}

const verticalOptions: OnboardingStepOption[] = VERTICAL_IDS.map((id) => ({
  value: id,
  label: VERTICAL_PRESETS[id].label,
  blurb: VERTICAL_PRESETS[id].blurb,
}));

export const ONBOARDING_STEPS: OnboardingStepDefinition[] = [
  {
    id: "firm_name",
    question: "What's the name of your firm?",
    helper: "This is how we'll refer to you across the app.",
    kind: "text",
    required: true,
    placeholder: "Thompson & Partners",
    isSatisfied: (a) => Boolean(a.orgName?.trim()),
  },
  {
    id: "vertical",
    question: "Which of these is closest to what you do?",
    helper: "This sets the tone and topics we write for you.",
    kind: "choice",
    required: true,
    options: verticalOptions,
    isSatisfied: (a) => Boolean(a.vertical),
  },
  {
    id: "website",
    question: "What's your website address?",
    helper: "We'll scan it so your content sounds like you from the first article.",
    kind: "url",
    required: true,
    placeholder: "https://yourfirm.com",
    isSatisfied: (a) => Boolean(a.websiteUrl?.trim()),
  },
  {
    id: "goal",
    question: "What do you most want out of this?",
    helper: "Pick the one that matters most right now. You can change your mind later.",
    kind: "choice",
    required: true,
    options: [
      { value: "leads", label: "More leads", blurb: "Content built to get people to reach out." },
      { value: "traffic", label: "More traffic", blurb: "Content built to rank and get found." },
      { value: "authority", label: "Being known as the expert", blurb: "Content built to earn trust in your field." },
    ],
    isSatisfied: (a) => Boolean(a.goal),
  },
  {
    id: "audience",
    question: "Who are you writing for?",
    helper: "A sentence is plenty. We'll refine it as we learn more.",
    kind: "text",
    required: true,
    placeholder: "Homeowners in Berlin dealing with a rental dispute",
    isSatisfied: (a) => Boolean(a.audience?.trim()),
  },
  {
    id: "competitors",
    question: "Any firms you'd like us to keep an eye on?",
    helper: "Add a few competitor websites, or skip this and add them later.",
    kind: "multi",
    required: false,
    placeholder: "https://acompetitor.com",
    isSatisfied: (a) => Boolean(a.competitors && a.competitors.length > 0),
  },
  {
    id: "linkedin",
    question: "Want us to learn your voice from your LinkedIn posts?",
    helper: "Connect LinkedIn, or paste a few posts instead. Skip it and we'll learn from your site alone.",
    kind: "connect",
    required: false,
    isSatisfied: (a) => Boolean(a.linkedin),
  },
  {
    id: "search_console",
    question: "Can we connect Google Search Console?",
    helper: "This shows us what people already search for on your site. Skip it if you don't have access handy.",
    kind: "connect",
    required: false,
    isSatisfied: (a) => Boolean(a.searchConsole),
  },
  {
    id: "wordpress",
    question: "Where should we publish?",
    helper: "Connect WordPress now, or set it up later from Integrations.",
    kind: "connect",
    required: false,
    isSatisfied: (a) => Boolean(a.wordpress),
  },
  // The style questionnaire fallback (PRD 2.2/2.3). All three only render when
  // the website scan did not yield enough material to learn a voice from, see
  // `shouldAsk` on each. When the scan was sufficient, none of these three
  // are ever shown and nothing about them is written to the session.
  {
    id: "style_pitch",
    question: "How would you describe your firm to someone you just met?",
    helper: "Answer the way you'd actually say it out loud. That's the whole point of the question.",
    kind: "text",
    required: true,
    placeholder: "We help homeowners get their deposit back when a landlord won't play fair.",
    isSatisfied: (a) => Boolean(a.stylePitch?.trim()),
    shouldAsk: (ctx) => ctx.styleSufficiency?.sufficient === false,
  },
  {
    id: "style_rivals",
    question: "Which firms should we make sure you sound sharper than?",
    // Deliberately distinct from `competitors` (which feeds opportunity scoring on
    // content gaps): this is purely about tone. Prefilled from the competitors
    // answer in the UI when one exists, since most firms mean the same names by
    // both questions and re-typing them would be busywork, but it stays its own
    // step and its own field, and either can be edited without touching the other.
    helper: "Reuse the competitors you already gave us, or name different ones. This is about how you read next to them, not what they publish.",
    kind: "multi",
    required: false,
    placeholder: "https://acompetitor.com",
    isSatisfied: (a) => Boolean(a.styleRivals && a.styleRivals.length > 0),
    shouldAsk: (ctx) => ctx.styleSufficiency?.sufficient === false,
  },
  {
    id: "style_jargon",
    question: "What words do your people love, and which should we never write?",
    helper: "Say it however you like. Naming them as lists helps us hold you to it.",
    kind: "text",
    required: true,
    placeholder: "Love: fiduciary, counsel. Never: boilerplate, turnkey.",
    isSatisfied: (a) => Boolean(a.styleJargon?.trim()),
    shouldAsk: (ctx) => ctx.styleSufficiency?.sufficient === false,
  },
  {
    id: "voice_review",
    question: "Here's what we picked up about how you write.",
    helper: "Take a look, then say the word and we'll get moving.",
    kind: "review",
    required: false,
    // No answer field of its own — stays on screen until the firm explicitly continues,
    // which the route records as stepStatus "done".
    isSatisfied: () => false,
  },
  {
    id: "topics",
    question: "Pick a few article ideas to start with.",
    helper: "We'll keep finding more as we learn about your site.",
    kind: "multi",
    // Not hard-required: candidate topics depend on discovery (GSC, competitor
    // gaps, or the cold-start fallback) that may still be running when this step
    // is reached, and the flow must never block on it. completeSession() falls
    // back to the top scored (or freshly cold-started) opportunity on its own.
    required: false,
    isSatisfied: (a) => Boolean(a.topicIds && a.topicIds.length > 0),
  },
  {
    id: "done",
    question: "Your first article is on its way.",
    helper: "Sit tight, we're writing it from everything you just told us.",
    kind: "terminal",
    required: false,
    isSatisfied: () => false,
  },
];

const STEP_BY_ID: Record<OnboardingStepId, OnboardingStepDefinition> = Object.fromEntries(
  ONBOARDING_STEPS.map((step) => [step.id, step]),
) as Record<OnboardingStepId, OnboardingStepDefinition>;

export function getStepDefinition(id: OnboardingStepId): OnboardingStepDefinition {
  const step = STEP_BY_ID[id];
  if (!step) throw new Error(`Unknown onboarding step: ${id}`);
  return step;
}

/**
 * First step that is neither already satisfied by the answers on file nor marked
 * done/skipped. A step satisfied by invite prefill auto-advances here without ever
 * rendering — this is what makes admin prefill cost one code path, not two.
 */
export function resolveNextStep(
  answers: OnboardingAnswers,
  stepStatus: OnboardingStepStatus,
  context: OnboardingStepContext = {},
): OnboardingStepId {
  for (const step of ONBOARDING_STEPS) {
    const state = stepStatus[step.id];
    if (state === "done" || state === "skipped") continue;
    if (step.isSatisfied(answers)) continue;
    if (step.shouldAsk && !step.shouldAsk(context)) continue;
    return step.id;
  }
  return "done";
}

// Sanity check at module load: every schema-declared step id must have a definition.
// A missing id here is a build-time bug, not a runtime one, but this keeps the two
// lists honest without requiring a separate test to catch drift.
for (const id of ONBOARDING_STEP_IDS) {
  if (!STEP_BY_ID[id]) throw new Error(`Onboarding step registry is missing "${id}"`);
}
