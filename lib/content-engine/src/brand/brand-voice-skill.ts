import { db } from "@workspace/db";
import { brandProfilesTable, brandVoiceChunksTable, websiteProjectsTable } from "@workspace/db/schema";
import { getAiProviderClient } from "@workspace/ai-providers/client";
import { eq, sql } from "drizzle-orm";
import { resolveAiClientForUser } from "../support/ai/resolve-ai-client-for-user";
import { AGENT_PERSONALITY_PROMPTS } from "../agents/agent-prompts";
import { cleanAndParse } from "../core/utils";
import { loadBrandContextForProject } from "../support/brand/brand-context-loader";
import { logger } from "../core/logger";

const SKILL_SYSTEM = `${AGENT_PERSONALITY_PROMPTS.chameleon}

You are writing a Brand Voice Skill so later drafts sound like this company, not like generic AI.

Rules:
- Return JSON only (no markdown fences)
- skill: markdown with ## headings: Voice Summary, Tone & Cadence, Audience & Positioning, Structure Patterns, Vocabulary, Style Examples
- Style examples are paraphrased, not copied
- Keep skill under 1200 words
- Lists are short (3–8 items). Invent nothing as if the founder wrote it; infer a starting draft from the company and industry
- If there are no samples, say so in Voice Summary and draft a plausible B2B starting voice they can edit
- Avoid banned filler: seamless, leverage, elevate, delve, "not just X but Y"`;

const MAX_TERMS = 20;

export type BrandVoiceDraft = {
  skill: string;
  typicalStructure: string;
  brandGlossary: string[];
  antiPatterns: string[];
  doWords: string[];
  dontWords: string[];
  voiceTone: string;
};

function clipTerms(values: unknown, max = MAX_TERMS): string[] {
  if (!Array.isArray(values)) return [];
  const out: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed || out.includes(trimmed)) continue;
    out.push(trimmed);
    if (out.length >= max) break;
  }
  return out;
}

export function parseBrandVoiceDraft(raw: string): BrandVoiceDraft | null {
  try {
    const parsed = cleanAndParse<Record<string, unknown>>(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const skill = typeof parsed.skill === "string" ? parsed.skill.trim() : "";
    if (!skill) return null;
    return {
      skill,
      typicalStructure:
        typeof parsed.typicalStructure === "string" ? parsed.typicalStructure.trim() : "",
      brandGlossary: clipTerms(parsed.brandGlossary),
      antiPatterns: clipTerms(parsed.antiPatterns),
      doWords: clipTerms(parsed.doWords),
      dontWords: clipTerms(parsed.dontWords),
      voiceTone: typeof parsed.voiceTone === "string" ? parsed.voiceTone.trim() : "",
    };
  } catch {
    return null;
  }
}

function keepExistingList(existing: string[] | null | undefined, draft: string[]): string[] {
  const current = (existing ?? []).map((s) => s.trim()).filter(Boolean);
  return current.length > 0 ? current : draft;
}

const voiceProfileColumns = {
  skillLocked: brandProfilesTable.skillLocked,
  brandVoiceSkill: brandProfilesTable.brandVoiceSkill,
  brandMemory: brandProfilesTable.brandMemory,
  typicalStructure: brandProfilesTable.typicalStructure,
  brandGlossary: brandProfilesTable.brandGlossary,
  antiPatterns: brandProfilesTable.antiPatterns,
  doWords: brandProfilesTable.doWords,
  dontWords: brandProfilesTable.dontWords,
  voiceTone: brandProfilesTable.voiceTone,
};

async function getOrCreateVoiceProfile(projectId: number) {
  const [existing] = await db
    .select(voiceProfileColumns)
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .limit(1);
  if (existing) return existing;

  try {
    await db.insert(brandProfilesTable).values({ websiteProjectId: projectId });
  } catch {
    // unique race: another request created the row
  }

  const [created] = await db
    .select(voiceProfileColumns)
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .limit(1);
  return created ?? null;
}

export async function regenerateBrandVoiceSkill(projectId: number): Promise<string | null> {
  const profile = await getOrCreateVoiceProfile(projectId);
  if (!profile) return null;

  if (profile.skillLocked) {
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
  const writingExamples = (brand.writingExamples ?? []).filter(Boolean).join("\n\n---\n\n").slice(0, 4000);

  const structuredContext = [
    brand.companyName && `Company: ${brand.companyName}`,
    brand.websiteUrl && `Website: ${brand.websiteUrl}`,
    brand.industry && `Industry: ${brand.industry}`,
    brand.targetAudience && `Audience: ${brand.targetAudience}`,
    brand.voiceTone && `Voice/tone: ${brand.voiceTone}`,
    brand.contentStyle?.tonePreset && `Tone preset: ${brand.contentStyle.tonePreset}`,
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

  const prompt = `Draft a starting brand voice for this company.

STRUCTURED BRAND DATA:
${structuredContext || "(minimal — infer from company name and website if present)"}

WRITING EXAMPLES:
${writingExamples || "(none)"}

SAMPLE PASSAGES FROM INDEXED CONTENT:
${samplePassages || "(none — infer a starting voice from structured data)"}

Return JSON with keys:
skill (markdown string),
typicalStructure (short string like "Hook → Problem → Proof → CTA"),
brandGlossary (string[]),
antiPatterns (string[] of phrases to never use),
doWords (string[]),
dontWords (string[]),
voiceTone (one sentence).`;

  try {
    const [project] = await db
      .select({ userId: websiteProjectsTable.userId })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, projectId))
      .limit(1);
    const ai =
      project?.userId != null
        ? (await resolveAiClientForUser(project.userId)).client
        : await getAiProviderClient();
    const response = await ai.generate({
      prompt,
      systemInstruction: SKILL_SYSTEM,
      temperature: 0.4,
      maxOutputTokens: 3072,
      thinkingBudget: 0,
      responseMimeType: "application/json",
    });

    const raw = (response.text ?? "").trim();
    if (!raw) return null;

    const draft = parseBrandVoiceDraft(raw);
    const skill = draft?.skill ?? (raw.startsWith("{") ? "" : raw);
    if (!skill) return null;

    const memory = profile?.brandMemory ?? {};
    const nextVersion = (memory.skillVersion ?? 0) + 1;

    await db
      .update(brandProfilesTable)
      .set({
        brandVoiceSkill: skill,
        ...(draft
          ? {
              typicalStructure: profile?.typicalStructure?.trim()
                ? profile.typicalStructure
                : draft.typicalStructure,
              brandGlossary: keepExistingList(profile?.brandGlossary, draft.brandGlossary),
              antiPatterns: keepExistingList(profile?.antiPatterns, draft.antiPatterns),
              doWords: keepExistingList(profile?.doWords, draft.doWords),
              dontWords: keepExistingList(profile?.dontWords, draft.dontWords),
              voiceTone: profile?.voiceTone?.trim() ? profile.voiceTone : draft.voiceTone,
            }
          : {}),
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
  const profile = await getOrCreateVoiceProfile(projectId);
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
