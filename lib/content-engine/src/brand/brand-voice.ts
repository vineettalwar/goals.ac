import type { ContentStyle, OrgVertical, PlatformVoices } from "@workspace/db";
import { getVerticalPreset } from "../verticals/vertical-presets";

export type HumanizationLevel = "off" | "light" | "strong";

export interface BrandVoiceFields {
  voiceTone?: string;
  writingExamples?: string[];
  brandGlossary?: string[];
  antiPatterns?: string[];
  typicalStructure?: string;
  doWords?: string[];
  dontWords?: string[];
  projectId?: number;
  brandMemory?: {
    summary?: string;
    voiceTraits?: string[];
    audienceInsights?: string[];
    competitorPositioning?: string;
  } | null;
}

export interface UnifiedBrandContext extends BrandVoiceFields {
  companyName: string;
  websiteUrl: string;
  industry: string;
  targetAudience: string;
  voiceTone: string;
  primaryKeywords: string[];
  brandMemory?: {
    summary?: string;
    voiceTraits?: string[];
    audienceInsights?: string[];
    competitorPositioning?: string;
    lastIndexedAt?: string;
    skillVersion?: number;
  } | null;
  contentStyle?: ContentStyle | null;
  humanizationLevel?: HumanizationLevel;
  writingSample?: string | null;
  brandVoiceSkill?: string;
  skillLocked?: boolean;
  projectId?: number;
  platformVoices?: PlatformVoices | null;
  /** Org vertical, used to inject tone guardrails into the brand voice prompt. Null/undefined
   * when the org has no vertical set — generation falls back to generic brand voice only. */
  vertical?: OrgVertical | null;
}

export function normalizeSiteHost(url: string): string {
  try {
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const hostname = new URL(normalized).hostname.toLowerCase();
    return hostname.replace(/^www\./, "");
  } catch {
    return url.trim().toLowerCase().replace(/^www\./, "");
  }
}

export function resolveHumanizationLevel(
  brand: Pick<UnifiedBrandContext, "humanizationLevel" | "contentStyle">,
): HumanizationLevel {
  const fromStyle = brand.contentStyle?.humanizationLevel;
  if (fromStyle === "off" || fromStyle === "light" || fromStyle === "strong") {
    return fromStyle;
  }
  if (
    brand.humanizationLevel === "off" ||
    brand.humanizationLevel === "light" ||
    brand.humanizationLevel === "strong"
  ) {
    return brand.humanizationLevel;
  }
  return "light";
}

export function resolveWritingSample(
  brand: Pick<UnifiedBrandContext, "writingExamples" | "writingSample">,
): string | undefined {
  const explicit = brand.writingSample?.trim();
  if (explicit) return explicit.slice(0, 4000);

  const examples = (brand.writingExamples ?? [])
    .map((sample) => sample.trim())
    .filter(Boolean);
  if (examples.length === 0) return undefined;
  return examples.join("\n\n---\n\n").slice(0, 4000);
}

function listSection(label: string, items: string[] | undefined, max = 12): string {
  const values = (items ?? []).map((item) => item.trim()).filter(Boolean).slice(0, max);
  if (values.length === 0) return "";
  return `${label}:\n${values.map((item) => `- ${item}`).join("\n")}`;
}

export function buildBrandVoicePromptContext(
  brand: BrandVoiceFields & { contentStyle?: ContentStyle | null; vertical?: OrgVertical | null },
): string {
  const sections: string[] = [];

  if (brand.voiceTone?.trim()) {
    sections.push(`BRAND VOICE: ${brand.voiceTone.trim()}`);
  }

  if (brand.vertical) {
    const preset = getVerticalPreset(brand.vertical);
    sections.push(`VERTICAL TONE GUARDRAILS (${preset.label}): ${preset.toneGuidance}`);
  }

  if (brand.brandMemory?.summary?.trim()) {
    sections.push(`BRAND MEMORY: ${brand.brandMemory.summary.trim()}`);
  }
  if (brand.brandMemory?.voiceTraits?.length) {
    sections.push(listSection("VOICE TRAITS", brand.brandMemory.voiceTraits, 8));
  }
  if (brand.brandMemory?.audienceInsights?.length) {
    sections.push(listSection("AUDIENCE INSIGHTS", brand.brandMemory.audienceInsights, 6));
  }

  const style = brand.contentStyle;
  if (style) {
    const styleLines: string[] = [];
    if (style.personaName) styleLines.push(`WRITING PERSONA: ${style.personaName}`);
    if (style.tonePreset) styleLines.push(`TONE: ${style.tonePreset}`);
    if (style.defaultWordCount) {
      styleLines.push(`TARGET WORD COUNT: ~${style.defaultWordCount} words`);
    }
    if (style.primaryLanguage) styleLines.push(`LANGUAGE: ${style.primaryLanguage}`);
    if (style.readingLevel) styleLines.push(`READING LEVEL: ${style.readingLevel}`);
    const forbidden = [
      ...(style.forbiddenWords ?? []),
      ...(brand.dontWords ?? []),
    ]
      .map((word) => word.trim())
      .filter(Boolean);
    if (forbidden.length > 0) {
      styleLines.push(`DO NOT USE THESE WORDS/PHRASES: ${[...new Set(forbidden)].join(", ")}`);
    }
    if (styleLines.length > 0) {
      sections.push(`CONTENT STYLE GUIDELINES:\n${styleLines.map((line) => `- ${line}`).join("\n")}`);
    }
  } else if (brand.dontWords?.length) {
    const forbidden = brand.dontWords.map((word) => word.trim()).filter(Boolean);
    if (forbidden.length > 0) {
      sections.push(`DO NOT USE THESE WORDS/PHRASES: ${forbidden.join(", ")}`);
    }
  }

  const examples = (brand.writingExamples ?? []).map((sample) => sample.trim()).filter(Boolean);
  if (examples.length > 0) {
    sections.push(
      `WRITING EXAMPLES (match cadence and diction — do NOT copy content):\n${examples
        .slice(0, 3)
        .map((sample, index) => `Example ${index + 1}:\n${sample.slice(0, 1200)}`)
        .join("\n\n")}`,
    );
  }

  const glossary = listSection("BRAND GLOSSARY (use these terms consistently)", brand.brandGlossary);
  if (glossary) sections.push(glossary);

  const doWords = listSection("PREFERRED WORDS & PHRASES", brand.doWords, 16);
  if (doWords) sections.push(doWords);

  const antiPatterns = listSection("ANTI-PATTERNS (never write like this)", brand.antiPatterns, 10);
  if (antiPatterns) sections.push(antiPatterns);

  if (brand.typicalStructure?.trim()) {
    sections.push(`TYPICAL STRUCTURE:\n${brand.typicalStructure.trim()}`);
  }

  if (sections.length === 0) return "";
  return `\n${sections.join("\n\n")}\n`;
}

export interface HybridBrandVoiceOptions {
  brandVoiceSkill?: string;
  retrievedPassages?: string;
}

export function buildHybridBrandVoicePromptContext(
  brand: BrandVoiceFields & { contentStyle?: ContentStyle | null },
  options?: HybridBrandVoiceOptions,
): string {
  const sections: string[] = [];
  const base = buildBrandVoicePromptContext(brand).trim();
  if (base) sections.push(base);

  const skill = options?.brandVoiceSkill?.trim();
  if (skill) {
    sections.push(
      `BRAND VOICE SKILL (follow this voice guide):\n${skill.slice(0, 4000)}`,
    );
  }

  const passages = options?.retrievedPassages?.trim();
  if (passages) {
    sections.push(passages);
  }

  if (sections.length === 0) return "";
  return `\n${sections.join("\n\n")}\n`;
}

export function brandVoiceCacheFingerprint(brand: UnifiedBrandContext): string {
  const join = (values?: string[]) => (values ?? []).map((v) => v.trim()).filter(Boolean).sort().join("|");
  return [
    brand.voiceTone,
    join(brand.writingExamples),
    join(brand.brandGlossary),
    join(brand.antiPatterns),
    join(brand.doWords),
    join(brand.dontWords),
    brand.typicalStructure ?? "",
    brand.contentStyle?.tonePreset ?? "",
    brand.contentStyle?.personaName ?? "",
    brand.contentStyle?.defaultWordCount?.toString() ?? "",
    brand.contentStyle?.primaryLanguage ?? "",
    brand.contentStyle?.readingLevel ?? "",
    join(brand.contentStyle?.forbiddenWords),
    resolveHumanizationLevel(brand),
    brand.writingSample ?? "",
    brand.brandMemory?.lastIndexedAt ?? "",
    brand.brandVoiceSkill?.slice(0, 200) ?? "",
    String(brand.brandMemory?.skillVersion ?? 0),
    brand.vertical ?? "",
    "brand-voice-v3",
  ].join("::");
}
