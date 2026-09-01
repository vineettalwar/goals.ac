import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { onboardingSessionsTable, companiesTable, organizationsTable, brandProfilesTable } from "@workspace/db/schema";
import { getVerticalPreset } from "@workspace/content-engine/vertical-presets";
import { dispatchFirstArticleGeneration } from "./first-article";
import { getOrCreateSession } from "./session-service";
import { initCompanyAndProject } from "./project-init";

export class OnboardingIncompleteError extends Error {}

export type CompleteSessionResult = {
  projectId: number;
  contentItemId: number | null;
  generationDispatched: boolean;
  generationError?: string;
};

/**
 * Runs the completion sequence in order (PRD B4):
 *   1-2. company + website project (usually already created eagerly at the
 *        `website` step by `initCompanyAndProject` — see session-service.ts —
 *        this is the fallback for a session that skipped straight to completion)
 *   3. vertical preset -> brand profile  4. organizations.vertical
 *   5. first-article dispatch (background, tolerant)  6. mark done
 *
 * Idempotent by design: reuses whatever the session already has recorded rather
 * than duplicating it, so completion can be safely retried after a partial
 * failure.
 */
export async function completeSession(userId: number): Promise<CompleteSessionResult> {
  const session = await getOrCreateSession(userId);
  const { answers } = session;

  if (!answers.orgName || !answers.vertical || !answers.websiteUrl) {
    throw new OnboardingIncompleteError(
      "firm_name, vertical, and website are required before completing onboarding",
    );
  }

  const preset = getVerticalPreset(answers.vertical);

  // 1-2. Company + website project.
  const { companyId, projectId, organizationId } = await initCompanyAndProject(userId, session);

  // 3. Vertical preset -> brand profile. The scrape kicked off by project creation
  // may not have written a row yet, or may still be running — upsert rather than
  // assume one exists, and never clobber tone the scrape already found.
  const [existingBrand] = await db
    .select()
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .limit(1);

  if (existingBrand) {
    await db
      .update(brandProfilesTable)
      .set({
        voiceTone: existingBrand.voiceTone
          ? `${existingBrand.voiceTone}\n\n${preset.toneGuidance}`
          : preset.toneGuidance,
        targetAudience: existingBrand.targetAudience || answers.audience || preset.defaultAudience,
      })
      .where(eq(brandProfilesTable.websiteProjectId, projectId));
  } else {
    await db
      .insert(brandProfilesTable)
      .values({
        websiteProjectId: projectId,
        companyName: answers.orgName,
        industry: preset.label,
        targetAudience: answers.audience || preset.defaultAudience,
        voiceTone: preset.toneGuidance,
      })
      .onConflictDoNothing({ target: brandProfilesTable.websiteProjectId });
  }

  // 4. organizations.vertical
  if (organizationId) {
    await db
      .update(organizationsTable)
      .set({ vertical: answers.vertical })
      .where(eq(organizationsTable.id, organizationId));
  }

  // 5. First-article dispatch. This only creates the content-item row and enqueues
  // the worker job — it does not await generation itself, so it stays fast. It is
  // tolerant of its own failures: a bad dispatch never fails onboarding.
  const dispatch = await dispatchFirstArticleGeneration({
    projectId,
    userId,
    vertical: answers.vertical,
    topicIds: answers.topicIds,
    competitorUrls: answers.competitors,
  });

  // 6. Mark done.
  await db
    .update(onboardingSessionsTable)
    .set({ completedAt: new Date(), currentStep: "done" })
    .where(eq(onboardingSessionsTable.id, session.id));

  await db.update(companiesTable).set({ onboardingComplete: true }).where(eq(companiesTable.id, companyId));

  return {
    projectId,
    contentItemId: dispatch.dispatched ? dispatch.contentItemId : null,
    generationDispatched: dispatch.dispatched,
    generationError: dispatch.dispatched ? undefined : dispatch.error,
  };
}
