/**
 * Local mirror of the onboarding step registry contract.
 *
 * The PRD (docs/prd/production-firm-onboarding.md, "Step registry") specifies
 * `src/lib/onboarding/steps.ts` as the source of truth, owned by a parallel stream
 * (S3) building the session API and step engine. That module does not exist on disk
 * yet, so this file mirrors its documented shape well enough for the Typeform shell
 * to compile and run against today. Once `@/lib/onboarding/steps` lands, the step
 * *data* here should be deleted and this file reduced to re-exporting from there:
 * the shell only depends on the `OnboardingStepDef` shape, not on this file's name.
 *
 * Answer/id/status types are NOT re-declared here: they are imported straight from
 * the schema package, which is the real contract and is safe to read.
 */
import type {
  OnboardingAnswers,
  OnboardingStepId,
  OnboardingStepStatus,
  OnboardingGoal,
} from "@workspace/db/schema/onboarding_sessions";
import type { OrgVertical } from "@workspace/db/schema/org_invites";

export type {
  OnboardingAnswers,
  OnboardingStepId,
  OnboardingStepStatus,
  OnboardingGoal,
  OrgVertical,
};

/** Screen kinds the Typeform shell knows how to render. */
export type OnboardingStepKind =
  | "text"
  | "url"
  | "choice"
  | "multi"
  | "connect"
  | "review"
  | "terminal";

export type OnboardingChoiceOption = {
  value: string;
  label: string;
  helper?: string;
};

export type OnboardingStepDef = {
  id: OnboardingStepId;
  question: string;
  helper?: string;
  kind: OnboardingStepKind;
  required: boolean;
  placeholder?: string;
  choices?: OnboardingChoiceOption[];
  /** True when `answers` already carries everything this step needs, so it never renders. */
  isSatisfied: (answers: OnboardingAnswers) => boolean;
  /** Which prefill field (from the firm invite) can satisfy this step without asking. */
  prefillFrom?: keyof OnboardingAnswers;
};

const has = (v: unknown) => v !== undefined && v !== null && v !== "";

export const VERTICAL_CHOICES: OnboardingChoiceOption[] = [
  { value: "law", label: "Law firm", helper: "Litigation, family, corporate, or a mixed practice" },
  { value: "dental", label: "Dental practice", helper: "General, orthodontic, or specialty care" },
  { value: "software", label: "Software / development", helper: "Product studio, SaaS, or dev shop" },
  { value: "marketing", label: "Marketing agency", helper: "Full-service, performance, or niche agency" },
  { value: "other", label: "Something else", helper: "We will still tailor the plan to you" },
];

export const GOAL_CHOICES: OnboardingChoiceOption[] = [
  { value: "leads", label: "More qualified leads", helper: "Content that turns readers into inquiries" },
  { value: "traffic", label: "More organic traffic", helper: "Rank for the searches your buyers already run" },
  { value: "authority", label: "Reputation and authority", helper: "Be the name people trust in your field" },
];

export const ONBOARDING_STEPS: OnboardingStepDef[] = [
  {
    id: "firm_name",
    question: "What is your firm called?",
    helper: "The name we will use across your site and articles.",
    kind: "text",
    required: true,
    placeholder: "Acme Legal Group",
    isSatisfied: (a) => has(a.orgName),
    prefillFrom: "orgName",
  },
  {
    id: "vertical",
    question: "What kind of firm are you?",
    helper: "This shapes tone, review rules, and the topics we suggest.",
    kind: "choice",
    required: true,
    choices: VERTICAL_CHOICES,
    isSatisfied: (a) => has(a.vertical),
    prefillFrom: "vertical",
  },
  {
    id: "website",
    question: "What is your website address?",
    helper: "We will scan it to learn your voice and services.",
    kind: "url",
    required: true,
    placeholder: "https://www.yourfirm.com",
    isSatisfied: (a) => has(a.websiteUrl),
    prefillFrom: "websiteUrl",
  },
  {
    id: "goal",
    question: "What matters most right now?",
    helper: "We will weight your content plan toward this.",
    kind: "choice",
    required: true,
    choices: GOAL_CHOICES,
    isSatisfied: (a) => has(a.goal),
  },
  {
    id: "audience",
    question: "Who are you trying to reach?",
    helper: "A sentence or two is plenty. Think about who searches for you.",
    kind: "text",
    required: true,
    placeholder: "Homeowners in the Austin area dealing with a personal injury claim",
    isSatisfied: (a) => has(a.audience),
  },
  {
    id: "competitors",
    question: "Any firms you would like to outrank?",
    helper: "Optional. Add up to five competitor websites.",
    kind: "multi",
    required: false,
    placeholder: "https://competitor.com",
    isSatisfied: (a) => Array.isArray(a.competitors) && a.competitors.length > 0,
  },
  {
    id: "linkedin",
    question: "Connect LinkedIn to learn your voice",
    helper: "We read your recent posts so drafts sound like you, not a template.",
    kind: "connect",
    required: false,
    isSatisfied: (a) => has(a.linkedin?.mode),
  },
  {
    id: "search_console",
    question: "Connect Google Search Console",
    helper: "Optional, but it gives us real search data instead of a guess.",
    kind: "connect",
    required: false,
    isSatisfied: (a) => has(a.searchConsole?.mode),
  },
  {
    id: "wordpress",
    question: "Connect your WordPress site",
    helper: "So published articles land where your readers already are.",
    kind: "connect",
    required: false,
    isSatisfied: (a) => has(a.wordpress?.mode),
  },
  {
    id: "voice_review",
    question: "Here is what we learned about you",
    helper: "A quick look before we put it to work.",
    kind: "review",
    required: false,
    isSatisfied: () => false,
  },
  {
    id: "topics",
    question: "Pick a few topics to start with",
    helper: "We will write the first one now and queue the rest.",
    kind: "multi",
    // Not hard-required: candidate topics depend on background discovery that may
    // still be running (D6 cold-start fallback), and the flow must never block on it.
    required: false,
    isSatisfied: (a) => Array.isArray(a.topicIds) && a.topicIds.length > 0,
  },
  {
    id: "done",
    question: "Your first article is being written",
    helper: "Live, from your own voice.",
    kind: "terminal",
    required: false,
    isSatisfied: () => false,
  },
];

export function getStepDef(id: OnboardingStepId): OnboardingStepDef {
  const step = ONBOARDING_STEPS.find((s) => s.id === id);
  if (!step) throw new Error(`Unknown onboarding step: ${id}`);
  return step;
}
