import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { brandProfilesTable } from "@workspace/db/schema";
import type { OnboardingStepContext } from "./steps";

/**
 * Structural shape of the signal a parallel work stream's `evaluateStyleSufficiency()`
 * (in `lib/content-engine`) writes to `brand_profiles.brand_memory.styleSufficiency`
 * after a scan. Declared locally, not imported from content-engine, so this module
 * never depends on that stream's build order or even its existence yet. A brand
 * memory with no `styleSufficiency` key at all reads back as `undefined`, same as
 * one written by a version of that function that hasn't shipped.
 */
type StyleSufficiencyMemory = {
  styleSufficiency?: { sufficient: boolean } | null;
};

/**
 * Reads the style-sufficiency signal off a website project's brand profile, for
 * resolveNextStep's `context` argument. Returns an empty context (read by
 * `shouldAsk` as "not recorded yet") whenever there is nothing to go on: no
 * project yet, no brand profile row yet, or a brand profile whose scan hasn't
 * written the signal. Never throws: a missing or malformed signal must not be
 * able to block onboarding.
 */
export async function loadStyleSufficiencyContext(
  websiteProjectId: number | null | undefined,
): Promise<OnboardingStepContext> {
  if (!websiteProjectId) return {};

  const [profile] = await db
    .select({ brandMemory: brandProfilesTable.brandMemory })
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, websiteProjectId))
    .limit(1);

  const memory = (profile?.brandMemory ?? null) as StyleSufficiencyMemory | null;
  return { styleSufficiency: memory?.styleSufficiency ?? null };
}
