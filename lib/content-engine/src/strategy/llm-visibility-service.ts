import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  websiteProjectsTable,
  brandProfilesTable,
  llmVisibilityPromptsTable,
  llmVisibilitySnapshotsTable,
} from "@workspace/db/schema";
import {
  buildDefaultPrompts,
  checkPromptVisibility,
  competitorNamesFromUrls,
  LLM_VISIBILITY_ENGINES,
} from "@workspace/seo-tools/llmVisibilityChecker";
import { isLlmMentionsConfigured, lookupBrandMentions } from "@workspace/serp-provider";
import { resolveAiClient } from "@workspace/ai-providers";
import { getDecryptedUserGeminiKey } from "../support/ai/user-api-key";
import { getUserAiProviderOptions } from "../support/ai/user-ai-provider";
import { parseVisibilitySettings } from "../support/settings/visibility-settings";
import { logger } from "../core/logger";
import {
  brandLookupQuery,
  liveVisibilitySnapshotsFromLookup,
} from "./live-visibility-snapshots";

export function getVisibilityDataMode(): "live" | "simulated" {
  return isLlmMentionsConfigured() ? "live" : "simulated";
}

export async function seedPromptsForProject(
  projectId: number,
  options?: { replace?: boolean },
): Promise<number> {
  const [project] = await db
    .select({ url: websiteProjectsTable.url, name: websiteProjectsTable.name })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);
  if (!project) return 0;

  const existing = await db
    .select({ id: llmVisibilityPromptsTable.id })
    .from(llmVisibilityPromptsTable)
    .where(eq(llmVisibilityPromptsTable.websiteProjectId, projectId))
    .limit(1);

  if (existing.length > 0 && !options?.replace) return 0;

  const [brand] = await db
    .select()
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .limit(1);

  const defaults = buildDefaultPrompts({
    brandName: brand?.companyName || project.name,
    industry: brand?.industry ?? "",
    targetAudience: brand?.targetAudience ?? "",
    primaryKeywords: brand?.primaryKeywords ?? [],
    competitorUrls: brand?.competitorUrls ?? [],
  });

  // Build first — never delete existing prompts when the brand profile yields zero defaults.
  if (defaults.length === 0) return 0;

  if (options?.replace && existing.length > 0) {
    await db
      .delete(llmVisibilityPromptsTable)
      .where(eq(llmVisibilityPromptsTable.websiteProjectId, projectId));
  }

  await db.insert(llmVisibilityPromptsTable).values(
    defaults.map((p) => ({
      websiteProjectId: projectId,
      prompt: p.prompt,
      category: p.category,
      isActive: true,
    })),
  );

  return defaults.length;
}

async function markVisibilityChecked(projectId: number, visibilitySettings: unknown) {
  const settings = parseVisibilitySettings(visibilitySettings);
  await db
    .update(websiteProjectsTable)
    .set({
      visibilitySettings: {
        ...settings,
        lastVisibilityCheckAt: new Date().toISOString(),
      },
    })
    .where(eq(websiteProjectsTable.id, projectId));
}

async function runLiveBrandLookup(
  projectId: number,
  brandName: string,
  brandUrl: string,
  competitorUrls: string[],
): Promise<number> {
  const result = await lookupBrandMentions({
    query: brandLookupQuery(brandUrl, brandName),
    competitors: competitorUrls,
  });

  const rows = liveVisibilitySnapshotsFromLookup(result);
  for (const row of rows) {
    await db.insert(llmVisibilitySnapshotsTable).values({
      websiteProjectId: projectId,
      promptId: null,
      ...row,
    });
  }

  return rows.length;
}

export async function runVisibilityCheckForProject(projectId: number): Promise<number> {
  const [project] = await db
    .select({
      id: websiteProjectsTable.id,
      userId: websiteProjectsTable.userId,
      url: websiteProjectsTable.url,
      name: websiteProjectsTable.name,
      visibilitySettings: websiteProjectsTable.visibilitySettings,
    })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);

  if (!project) {
    logger.warn({ projectId }, "Visibility check: project not found");
    return 0;
  }

  const [brand] = await db
    .select()
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .limit(1);

  const brandName = brand?.companyName || project.name;
  const brandUrl = project.url;
  const competitorUrls = brand?.competitorUrls ?? [];

  if (isLlmMentionsConfigured()) {
    try {
      const inserted = await runLiveBrandLookup(projectId, brandName, brandUrl, competitorUrls);
      if (inserted > 0) {
        await markVisibilityChecked(projectId, project.visibilitySettings);
        logger.info({ projectId, inserted, mode: "live" }, "Visibility check completed");
        return inserted;
      }
      logger.warn(
        { projectId },
        "Visibility check: live lookup returned no platforms; falling back to simulated",
      );
    } catch (err) {
      logger.error(
        { err, projectId },
        "Visibility check: live brand lookup failed; falling back to simulated",
      );
    }
  }

  let prompts = await db
    .select()
    .from(llmVisibilityPromptsTable)
    .where(
      and(
        eq(llmVisibilityPromptsTable.websiteProjectId, projectId),
        eq(llmVisibilityPromptsTable.isActive, true),
      ),
    );

  if (prompts.length === 0) {
    await seedPromptsForProject(projectId);
    prompts = await db
      .select()
      .from(llmVisibilityPromptsTable)
      .where(
        and(
          eq(llmVisibilityPromptsTable.websiteProjectId, projectId),
          eq(llmVisibilityPromptsTable.isActive, true),
        ),
      );
  }

  if (prompts.length === 0) {
    logger.info({ projectId }, "Visibility check: no prompts available");
    return 0;
  }

  const competitorNames = competitorNamesFromUrls(competitorUrls);

  const [userApiKey, aiProviderOptions] = await Promise.all([
    getDecryptedUserGeminiKey(project.userId),
    getUserAiProviderOptions(project.userId),
  ]);
  let client;
  try {
    client = await resolveAiClient(userApiKey, aiProviderOptions);
  } catch {
    logger.warn({ projectId }, "Visibility check: no AI client available");
    return 0;
  }

  let inserted = 0;
  for (const promptRow of prompts) {
    for (const engine of LLM_VISIBILITY_ENGINES) {
      try {
        const result = await checkPromptVisibility(client, {
          prompt: promptRow.prompt,
          brandName,
          brandUrl,
          competitorNames,
          engine,
        });

        await db.insert(llmVisibilitySnapshotsTable).values({
          websiteProjectId: projectId,
          promptId: promptRow.id,
          prompt: promptRow.prompt,
          engine,
          cited: result.cited,
          citationUrl: result.citationUrl,
          competitorsMentioned: result.competitorsMentioned,
          responseSnippet: result.responseSnippet,
          source: "simulated",
        });
        inserted += 1;
      } catch (err) {
        logger.error({ err, projectId, promptId: promptRow.id, engine }, "Visibility check failed for prompt");
      }
    }
  }

  await markVisibilityChecked(projectId, project.visibilitySettings);

  logger.info({ projectId, inserted, mode: "simulated" }, "Visibility check completed");
  return inserted;
}
