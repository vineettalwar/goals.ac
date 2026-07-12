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
import { resolveAiClient } from "@workspace/ai-providers";
import { getDecryptedUserGeminiKey } from "./support/user-api-key";
import { getUserAiProviderOptions } from "./support/user-ai-provider";
import { parseVisibilitySettings } from "./support/visibility-settings";
import { logger } from "./logger";

export async function seedPromptsForProject(projectId: number): Promise<number> {
  const [project] = await db
    .select({ url: websiteProjectsTable.url, name: websiteProjectsTable.name })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);
  if (!project) return 0;

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

  if (defaults.length === 0) return 0;

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

  const [brand] = await db
    .select()
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .limit(1);

  const brandName = brand?.companyName || project.name;
  const brandUrl = project.url;
  const competitorNames = competitorNamesFromUrls(brand?.competitorUrls ?? []);

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
        });
        inserted += 1;
      } catch (err) {
        logger.error({ err, projectId, promptId: promptRow.id, engine }, "Visibility check failed for prompt");
      }
    }
  }

  const settings = parseVisibilitySettings(project.visibilitySettings);
  await db
    .update(websiteProjectsTable)
    .set({
      visibilitySettings: {
        ...settings,
        lastVisibilityCheckAt: new Date().toISOString(),
      },
    })
    .where(eq(websiteProjectsTable.id, projectId));

  logger.info({ projectId, inserted }, "Visibility check completed");
  return inserted;
}
