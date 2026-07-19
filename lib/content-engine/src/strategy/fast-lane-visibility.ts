import { db } from "@workspace/db";
import { geoAuditsTable } from "@workspace/db/schema";
import { auditUrl } from "@workspace/seo-tools/geoAuditor";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import { seedPromptsForProject } from "./llm-visibility-service";

export type FastLaneVisibilityKickoff = {
  promptsSeeded: number;
  visibilityQueued: boolean;
  geoScore: number | null;
};

/**
 * Partner-demo kickoff after fast-lane queues articles:
 * seed LLM prompts, queue a visibility check, run one homepage GEO audit.
 * Failures are swallowed so content setup still succeeds.
 */
export async function kickOffFastLaneVisibility(input: {
  projectId: number;
  projectUrl: string;
  queueVisibilityCheck: () => Promise<void>;
}): Promise<FastLaneVisibilityKickoff> {
  let promptsSeeded = 0;
  let visibilityQueued = false;
  let geoScore: number | null = null;

  try {
    promptsSeeded = await seedPromptsForProject(input.projectId);
  } catch {
    // Brand profile may still be empty; visibility page can seed later.
  }

  try {
    await input.queueVisibilityCheck();
    visibilityQueued = true;
  } catch {
    // Worker may be offline in local/dev.
  }

  try {
    await assertPublicUrl(input.projectUrl);
    const auditResult = await auditUrl(input.projectUrl);
    const [audit] = await db
      .insert(geoAuditsTable)
      .values({
        url: auditResult.url,
        roadmapId: null,
        websiteProjectId: input.projectId,
        geoScore: auditResult.geoScore,
        issues: auditResult.issues,
        pageTitle: auditResult.pageTitle,
        metaDescription: auditResult.metaDescription,
        hasSchemaOrg: auditResult.hasSchemaOrg,
        schemaTypes: auditResult.schemaTypes,
        h1Count: auditResult.h1Count,
        imageCount: auditResult.imageCount,
        imagesMissingAlt: auditResult.imagesMissingAlt,
      })
      .returning({ geoScore: geoAuditsTable.geoScore });
    geoScore = audit.geoScore ?? null;
  } catch {
    // SSRF / fetch failures must not block article queue.
  }

  return { promptsSeeded, visibilityQueued, geoScore };
}
