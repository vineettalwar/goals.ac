import { z } from "zod";
import type { OnboardingAnswers, OnboardingStepId } from "@workspace/db/schema";
import { VERTICAL_IDS } from "@workspace/content-engine/vertical-presets";

/** Loosely accepts "example.com" and normalizes it to a full https URL before validating. */
function normalizeUrlInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const urlField = z.preprocess(
  (v) => (typeof v === "string" ? normalizeUrlInput(v) : v),
  z.string().url(),
);

const verticalField = z.enum(VERTICAL_IDS as [string, ...string[]]);

const goalField = z.enum(["leads", "traffic", "authority"]);

const linkedinField = z.object({
  mode: z.enum(["oauth", "paste", "skipped"]),
  postCount: z.number().int().nonnegative().optional(),
});

const searchConsoleField = z.object({
  mode: z.enum(["connected", "skipped"]),
  propertyUrl: z.string().optional(),
});

const wordpressField = z.object({
  mode: z.enum(["plugin", "app_password", "skipped"]),
  siteUrl: z.string().optional(),
});

/**
 * Per-step zod schema for the raw `answer` value the client sends in
 * `PATCH /api/onboarding/session { step, answer }`. The client sends the plain
 * value for the question asked (a string, an array, a small object) — it never
 * needs to know the internal `OnboardingAnswers` key names, those are an
 * implementation detail this module maps to via `STEP_ANSWER_KEY`.
 *
 * Steps with no answer field of their own (review, terminal) have no entry —
 * the route just records step status for those.
 */
const STEP_ANSWER_SCHEMAS = {
  firm_name: z.string().trim().min(1).max(200),
  vertical: verticalField,
  website: urlField,
  goal: goalField,
  audience: z.string().trim().min(3).max(500),
  competitors: z.array(urlField).max(5),
  linkedin: linkedinField,
  search_console: searchConsoleField,
  wordpress: wordpressField,
  style_pitch: z.string().trim().min(3).max(1000),
  style_rivals: z.array(urlField).max(5),
  style_jargon: z.string().trim().min(3).max(1000),
  topics: z.array(z.number().int().positive()).min(1),
} satisfies Partial<Record<OnboardingStepId, z.ZodType>>;

const STEP_ANSWER_KEY: Record<keyof typeof STEP_ANSWER_SCHEMAS, keyof OnboardingAnswers> = {
  firm_name: "orgName",
  vertical: "vertical",
  website: "websiteUrl",
  goal: "goal",
  audience: "audience",
  competitors: "competitors",
  linkedin: "linkedin",
  search_console: "searchConsole",
  wordpress: "wordpress",
  style_pitch: "stylePitch",
  style_rivals: "styleRivals",
  style_jargon: "styleJargon",
  topics: "topicIds",
};

export type StepWithAnswer = keyof typeof STEP_ANSWER_SCHEMAS;

export function stepHasAnswerField(step: OnboardingStepId): step is StepWithAnswer {
  return step in STEP_ANSWER_SCHEMAS;
}

export class InvalidOnboardingAnswerError extends Error {
  constructor(
    public readonly step: OnboardingStepId,
    public readonly issues: z.ZodIssue[],
  ) {
    super(`Invalid answer for onboarding step "${step}"`);
    this.name = "InvalidOnboardingAnswerError";
  }
}

/**
 * Validates a raw client answer against the shape this step expects and returns
 * the `OnboardingAnswers` patch to merge in. Never trust the client past this
 * point. Throws `InvalidOnboardingAnswerError` on a bad shape.
 */
export function validateStepAnswer(
  step: OnboardingStepId,
  rawAnswer: unknown,
): Partial<OnboardingAnswers> {
  if (!stepHasAnswerField(step)) return {};

  const schema = STEP_ANSWER_SCHEMAS[step];
  const result = schema.safeParse(rawAnswer);
  if (!result.success) {
    throw new InvalidOnboardingAnswerError(step, result.error.issues);
  }

  const key = STEP_ANSWER_KEY[step];
  return { [key]: result.data } as Partial<OnboardingAnswers>;
}
