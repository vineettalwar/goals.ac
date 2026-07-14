import { db } from "@workspace/db";
import { brandProfilesTable, brandVoiceChunksTable } from "@workspace/db/schema";
import { getAiProviderClient } from "@workspace/ai-providers/client";
import { eq, sql } from "drizzle-orm";
import { loadBrandContextForProject } from "../support/brand/brand-context-loader";
import { logger } from "../core/logger";

const SKILL_SYSTEM = `You are a brand voice analyst. Given structured brand data and sample passages, write a concise Brand Voice Skill document in markdown.

Rules:
- Use clear sections with ## headings
- Describe tone, cadence, audience, structure patterns, vocabulary preferences
- Include 3-5 short annotated style examples (paraphrased, not verbatim copies)
- Be actionable for a content writer
- Keep under 1200 words`;

export async function regenerateBrandVoiceSkill(projectId: number): Promise<string | null> {
  const [profile] = await db
    .select({
      skillLocked: brandProfilesTable.skillLocked,
      brandVoiceSkill: brandProfilesTable.brandVoiceSkill,
      brandMemory: brandProfilesTable.brandMemory,
    })
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .limit(1);

  if (profile?.skillLocked) {
    return profile.brandVoiceSkill ?? null;
  }

  const brand = await loadBrandContextForProject(projectId);
  if (!brand) return null;

  const chunkRows = await db
    .select({ text: brandVoiceChunksTable.text })
    .from(brandVoiceChunksTable)
    .where(eq(brandVoiceChunksTable.websiteProjectId, projectId))
    .orderBy(sql`random()`)
    .limit(20);

  const samplePassages = chunkRows.map((r) => r.text).join("\n\n---\n\n").slice(0, 8000);

  const structuredContext = [
    brand.companyName && `Company: ${brand.companyName}`,
    brand.industry && `Industry: ${brand.industry}`,
    brand.targetAudience && `Audience: ${brand.targetAudience}`,
    brand.voiceTone && `Voice/tone: ${brand.voiceTone}`,
    brand.brandMemory?.summary && `Summary: ${brand.brandMemory.summary}`,
    brand.brandMemory?.voiceTraits?.length &&
      `Voice traits: ${brand.brandMemory.voiceTraits.join(", ")}`,
    brand.doWords?.length && `Preferred words: ${brand.doWords.join(", ")}`,
    brand.dontWords?.length && `Avoid words: ${brand.dontWords.join(", ")}`,
    brand.antiPatterns?.length && `Anti-patterns: ${brand.antiPatterns.join(", ")}`,
    brand.typicalStructure && `Structure: ${brand.typicalStructure}`,
    brand.brandGlossary?.length && `Glossary: ${brand.brandGlossary.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `Write a Brand Voice Skill markdown document.

STRUCTURED BRAND DATA:
${structuredContext}

SAMPLE PASSAGES FROM INDEXED CONTENT:
${samplePassages || "(no indexed passages yet — infer from structured data)"}

Output markdown only. Sections: Voice Summary, Tone & Cadence, Audience & Positioning, Structure Patterns, Vocabulary, Style Examples.`;

  try {
    const ai = await getAiProviderClient();
    const response = await ai.generate({
      prompt,
      systemInstruction: SKILL_SYSTEM,
      temperature: 0.4,
      maxOutputTokens: 3072,
      thinkingBudget: 0,
    });

    const skill = (response.text ?? "").trim();
    if (!skill) return null;

    const memory = profile?.brandMemory ?? {};
    const nextVersion = (memory.skillVersion ?? 0) + 1;

    await db
      .update(brandProfilesTable)
      .set({
        brandVoiceSkill: skill,
        brandMemory: {
          ...memory,
          skillVersion: nextVersion,
        },
      })
      .where(eq(brandProfilesTable.websiteProjectId, projectId));

    return skill;
  } catch (err) {
    logger.error({ err, projectId }, "Brand voice skill regeneration failed");
    return null;
  }
}

export async function getBrandVoiceSkill(projectId: number): Promise<{
  skill: string;
  skillLocked: boolean;
  skillVersion: number;
}> {
  const [profile] = await db
    .select({
      brandVoiceSkill: brandProfilesTable.brandVoiceSkill,
      skillLocked: brandProfilesTable.skillLocked,
      brandMemory: brandProfilesTable.brandMemory,
    })
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .limit(1);

  return {
    skill: profile?.brandVoiceSkill ?? "",
    skillLocked: profile?.skillLocked ?? false,
    skillVersion: profile?.brandMemory?.skillVersion ?? 0,
  };
}

export async function updateBrandVoiceSkill(
  projectId: number,
  skill: string,
  skillLocked?: boolean,
): Promise<void> {
  const [profile] = await db
    .select({ brandMemory: brandProfilesTable.brandMemory })
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .limit(1);

  const memory = profile?.brandMemory ?? {};
  await db
    .update(brandProfilesTable)
    .set({
      brandVoiceSkill: skill,
      ...(skillLocked !== undefined ? { skillLocked } : {}),
      brandMemory: {
        ...memory,
        skillVersion: (memory.skillVersion ?? 0) + 1,
      },
    })
    .where(eq(brandProfilesTable.websiteProjectId, projectId));
}
