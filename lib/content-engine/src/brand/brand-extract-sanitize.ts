import type { BrandExtract, Confidence } from "./brand-extract-types";

export type { BrandExtract, Confidence } from "./brand-extract-types";

const PLACEHOLDER_URL_RE =
  /^(?:https?:\/\/)?(?:www\.)?(competitor\d*|example\d*|sample|test|placeholder|your(?:site|company|domain)|domain|company|rival\d*)\./i;

const PLACEHOLDER_KEYWORD_RE =
  /^(example|sample|placeholder|keyword\s*\d+|lorem|ipsum|todo|tbd|n\/a)$/i;

export function isPlaceholderUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;
  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    return PLACEHOLDER_URL_RE.test(parsed.hostname.toLowerCase());
  } catch {
    return true;
  }
}

export function repairIncompleteText(text: string, maxLength = 200): string {
  let value = text.trim();
  if (!value) return value;

  if (value.includes("(") && !value.includes(")")) {
    value = value.replace(/\s*\([^)]*$/, "").trim();
  }
  if (value.includes("[") && !value.includes("]")) {
    value = value.replace(/\s*\[[^\]]*$/, "").trim();
  }

  value = value.replace(/[,;:—–-]\s*$/, "").trim();

  if (value.length > maxLength) {
    const cut = value.slice(0, maxLength);
    const lastSpace = cut.lastIndexOf(" ");
    value = (lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
  }

  return value;
}

const AI_VOICE_CLICHES = [
  /\boutcome[- ]focused\b/gi,
  /\bresults[- ]oriented\b/gi,
  /\bcutting[- ]edge\b/gi,
  /\bworld[- ]class\b/gi,
  /\bbest[- ]in[- ]class\b/gi,
  /\bsynerg(?:y|ies)\b/gi,
  /\bleverage\b/gi,
  /\brobust\b/gi,
  /\bseamless(?:ly)?\b/gi,
  /\bholistic(?:ally)?\b/gi,
  /\bempower(?:ing|s)?\b/gi,
  /\btransformative\b/gi,
  /\bgame[- ]changer\b/gi,
  /\bdisruptive\b/gi,
];

export function sanitizeVoiceTone(voiceTone: string): string {
  let value = voiceTone.trim();
  if (!value) return value;

  for (const pattern of AI_VOICE_CLICHES) {
    value = value.replace(pattern, "").trim();
  }

  value = value
    .replace(/,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .replace(/^[,.\s]+|[,.\s]+$/g, "")
    .replace(/,\s*and\s*$/i, "")
    .replace(/,\s*emphasizing\b.*$/i, "")
    .trim();

  if (!value) return voiceTone.trim();

  const sentences = value.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length > 2) {
    value = sentences.slice(0, 2).join(" ");
  }

  if (value.length > 160) {
    value = repairIncompleteText(value, 160);
  }

  return value;
}

function downgrade(confidence: Confidence): Confidence {
  return confidence === "high" ? "medium" : "low";
}

export function sanitizeBrandExtract(extract: BrandExtract): BrandExtract {
  const industryRaw = String(extract.industry || "");
  const industryRepaired = repairIncompleteText(industryRaw, 120);
  const industryChanged = industryRepaired !== industryRaw.trim();

  const competitorUrls = (extract.competitorUrls ?? [])
    .map((u) => u.trim())
    .filter((u) => u && !isPlaceholderUrl(u));
  const competitorsStripped = competitorUrls.length < (extract.competitorUrls?.length ?? 0);

  const primaryKeywords = (extract.primaryKeywords ?? [])
    .map((k) => k.trim())
    .filter((k) => k && !PLACEHOLDER_KEYWORD_RE.test(k));

  const voiceTone = sanitizeVoiceTone(String(extract.voiceTone || ""));

  const targetAudience = repairIncompleteText(String(extract.targetAudience || ""), 400);

  const confidence = { ...extract.confidence };

  if (industryChanged) confidence.industry = downgrade(confidence.industry);
  if (competitorsStripped || competitorUrls.length === 0) {
    confidence.competitorUrls = competitorUrls.length === 0 ? "low" : downgrade(confidence.competitorUrls);
  }
  if (voiceTone !== String(extract.voiceTone || "").trim()) {
    confidence.voiceTone = downgrade(confidence.voiceTone);
  }

  return {
    ...extract,
    companyName: String(extract.companyName || "").trim(),
    industry: industryRepaired,
    targetAudience,
    voiceTone,
    primaryKeywords,
    competitorUrls,
    confidence,
  };
}
