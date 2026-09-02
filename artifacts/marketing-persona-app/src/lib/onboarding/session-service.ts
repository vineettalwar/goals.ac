import { and, desc, eq, isNull } from "drizzle-orm";
import { db, isUniqueConstraintError } from "@workspace/db";
import {
  onboardingSessionsTable,
  orgInvitesTable,
  usersTable,
  type OnboardingAnswers,
  type OnboardingSession,
  type OnboardingStepId,
  type OnboardingStepState,
  type OnboardingStepStatus,
  type OrgInvitePrefill,
} from "@workspace/db/schema";
import { resolveOrganizationIdForUser } from "@/lib/org/org-access";
import { resolveNextStep } from "./steps";
import { validateStepAnswer } from "./answer-schema";
import { initCompanyAndProject } from "./project-init";
import { logger } from "@/lib/utils/logger";
import { mergeAnswers, mergeStepStatus } from "./merge";

export { mergeAnswers, mergeStepStatus } from "./merge";

/** Thrown when recordAnswer gives up after repeated optimistic-lock conflicts on
 *  the same session. Rare in practice (it needs sustained concurrent writes to the
 *  same session within milliseconds of each other) but must not surface as a raw
 *  500 with an internal message, so it gets its own type the route can catch. */
export class OnboardingConcurrentWriteError extends Error {
  constructor(public readonly sessionId: number) {
    super(`Onboarding session ${sessionId}: too many concurrent writes`);
    this.name = "OnboardingConcurrentWriteError";
  }
}

async function findActiveSession(userId: number): Promise<OnboardingSession | null> {
  const [session] = await db
    .select()
    .from(onboardingSessionsTable)
    .where(and(eq(onboardingSessionsTable.userId, userId), isNull(onboardingSessionsTable.completedAt)))
    .orderBy(desc(onboardingSessionsTable.id))
    .limit(1);
  return session ?? null;
}

type InviteSeed = {
  inviteId: number;
  answers: Partial<OnboardingAnswers>;
};

/**
 * Looks up the firm invite this user accepted, if any, and turns its prefill into
 * an answers patch. There is no `acceptedByUserId` column on `org_invites` — the
 * invite-acceptance stream records acceptance by email match and `acceptedAt`,
 * so that is what we key off here too. If that stream's acceptance mechanism ends
 * up different, this lookup degrades to "no prefill found" rather than failing.
 */
async function resolveInviteSeed(userId: number): Promise<InviteSeed | null> {
  const [user] = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!user?.email) return null;

  const invites = await db
    .select()
    .from(orgInvitesTable)
    .where(eq(orgInvitesTable.kind, "firm"))
    .orderBy(desc(orgInvitesTable.id));

  const matched = invites.find(
    (invite) =>
      invite.acceptedAt != null &&
      invite.email.toLowerCase() === user.email.toLowerCase(),
  );
  if (!matched) return null;

  const prefill = (matched.prefill ?? {}) as OrgInvitePrefill;
  const answers: Partial<OnboardingAnswers> = {};
  if (prefill.orgName) answers.orgName = prefill.orgName;
  if (prefill.vertical) answers.vertical = prefill.vertical;
  if (prefill.websiteUrl) answers.websiteUrl = prefill.websiteUrl;

  return { inviteId: matched.id, answers };
}

/**
 * Returns the active (uncompleted) onboarding session for this user, creating one
 * if none exists. A partial unique index allows only one uncompleted session per
 * user, so a race between two requests both trying to create is handled by
 * catching the unique violation and re-reading rather than failing the request.
 */
export async function getOrCreateSession(userId: number): Promise<OnboardingSession> {
  const existing = await findActiveSession(userId);
  if (existing) return existing;

  const seed = await resolveInviteSeed(userId);
  const answers: OnboardingAnswers = seed?.answers ?? {};
  const organizationId = await resolveOrganizationIdForUser(userId);

  try {
    const [created] = await db
      .insert(onboardingSessionsTable)
      .values({
        userId,
        organizationId: organizationId ?? null,
        inviteId: seed?.inviteId ?? null,
        vertical: answers.vertical ?? null,
        answers,
        stepStatus: {},
        currentStep: resolveNextStep(answers, {}),
      })
      .returning();
    return created;
  } catch (err) {
    if (!isUniqueConstraintError(err)) throw err;
    const raced = await findActiveSession(userId);
    if (raced) return raced;
    throw err;
  }
}

export type RecordAnswerResult = {
  session: OnboardingSession;
  nextStep: OnboardingStepId;
};

/**
 * Merges a validated answer into the session's `answers` (per key, never the
 * whole document) and advances `currentStep`. `status` defaults to "done" when
 * an answer is supplied, and must be passed explicitly ("skipped") for a
 * skippable step with no answer.
 */
const MAX_CONCURRENT_WRITE_RETRIES = 5;

/**
 * mergeAnswers/mergeStepStatus merge per key in JavaScript, but the write itself is
 * still a read-then-write against the database: fetch the session, merge in memory,
 * write the whole `answers`/`stepStatus` columns back. Two tabs answering *different*
 * steps within the same round trip would both read the pre-merge row, and whichever
 * write lands second would overwrite the first tab's answer with its own stale view
 * of everything else — exactly the whole-document clobber the PRD's "last write wins
 * on a per-step basis, not whole-doc" edge case rules out, even though the merge
 * function in isolation is per-key and correct.
 *
 * `updatedAt` is used as an optimistic-lock token rather than a raw jsonb `||` merge
 * in SQL: this table has to work on both the Postgres and D1/SQLite dialects
 * (`DB_DIALECT`, see lib/db/src/dialect.ts), and a conditional UPDATE with a bounded
 * retry-on-conflict is the one strategy that behaves identically on both without a
 * dialect branch. Losing the race means re-reading the now-current row and re-merging
 * against it, not losing the answer.
 */
export async function recordAnswer(
  userId: number,
  step: OnboardingStepId,
  rawAnswer: unknown,
  status?: OnboardingStepState,
): Promise<RecordAnswerResult> {
  let session = await getOrCreateSession(userId);

  const patch = rawAnswer === undefined ? {} : validateStepAnswer(step, rawAnswer);
  const resolvedStatus: OnboardingStepState = status ?? (rawAnswer === undefined ? "skipped" : "done");

  let updated: OnboardingSession | undefined;
  for (let attempt = 0; attempt < MAX_CONCURRENT_WRITE_RETRIES; attempt++) {
    const nextAnswers = mergeAnswers(session.answers, patch);
    const nextStepStatus = mergeStepStatus(session.stepStatus, step, resolvedStatus);
    const currentStep = resolveNextStep(nextAnswers, nextStepStatus);

    const rows = await db
      .update(onboardingSessionsTable)
      .set({
        answers: nextAnswers,
        stepStatus: nextStepStatus,
        currentStep,
        vertical: nextAnswers.vertical ?? session.vertical,
      })
      .where(and(eq(onboardingSessionsTable.id, session.id), eq(onboardingSessionsTable.updatedAt, session.updatedAt)))
      .returning();

    if (rows[0]) {
      updated = rows[0];
      break;
    }

    // Someone else wrote in between the read and this write. Re-read the row they
    // just wrote and merge this answer on top of it, rather than on top of stale data.
    const [current] = await db
      .select()
      .from(onboardingSessionsTable)
      .where(eq(onboardingSessionsTable.id, session.id))
      .limit(1);
    if (!current) throw new Error(`Onboarding session ${session.id} disappeared mid-write`);
    session = current;
  }

  if (!updated) {
    throw new OnboardingConcurrentWriteError(session.id);
  }

  // The connect steps that follow (linkedin, search_console, wordpress) key their
  // sync services off a website_projects row, so create it the moment we have
  // enough to (firm name, vertical, website) rather than waiting for completion.
  // Best-effort: a failure here does not fail the answer write, it just means
  // completion falls back to creating it there instead.
  if (!updated.websiteProjectId && updated.answers.orgName && updated.answers.vertical && updated.answers.websiteUrl) {
    try {
      const init = await initCompanyAndProject(userId, updated);
      updated.companyId = init.companyId;
      updated.websiteProjectId = init.projectId;
      updated.organizationId = init.organizationId;
    } catch (err) {
      logger.warn({ err, userId, sessionId: updated.id }, "Onboarding: eager project init failed, deferring to completion");
    }
  }

  return { session: updated, nextStep: updated.currentStep };
}
