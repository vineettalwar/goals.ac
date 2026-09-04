import type { BrandExtract, Confidence, ProofAssetExtract } from "./brand-extract-types";

export type { BrandExtract, Confidence } from "./brand-extract-types";

const VALID_PROOF_ASSET_KINDS = new Set([
  "metric",
  "case_study",
  "customer_quote",
  "named_example",
]);

/** Upper bound on stored proof assets per brand so a runaway extraction cannot bloat every future prompt. */
export const MAX_PROOF_ASSETS = 20;

/** Upper bound on a single claim's length, for the same reason. */
export const MAX_PROOF_ASSET_CLAIM_LENGTH = 300;

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Sanitizes raw, unverified proof-asset extraction output before it is
 * stored on `brandMemory`. Anything that does not clearly match the expected
 * shape is dropped rather than coerced, since a malformed or fabricated
 * proof asset is more harmful than having none.
 */
export function sanitizeProofAssets(raw: unknown): ProofAssetExtract[] {
  if (!Array.isArray(raw)) return [];

  const result: ProofAssetExtract[] = [];
  for (const entry of raw) {
    if (result.length >= MAX_PROOF_ASSETS) break;
    if (!entry || typeof entry !== "object") continue;

    const candidate = entry as Record<string, unknown>;
    const kind = typeof candidate.kind === "string" ? candidate.kind.trim() : "";
    if (!VALID_PROOF_ASSET_KINDS.has(kind)) continue;

    const claim = typeof candidate.claim === "string" ? candidate.claim.trim() : "";
    if (!claim) continue;

    const asset: ProofAssetExtract = {
      kind: kind as ProofAssetExtract["kind"],
      claim: repairIncompleteText(claim, MAX_PROOF_ASSET_CLAIM_LENGTH),
    };

    if (typeof candidate.source === "string" && candidate.source.trim()) {
      asset.source = candidate.source.trim().slice(0, 200);
    }

    if (typeof candidate.url === "string" && candidate.url.trim() && isHttpUrl(candidate.url.trim())) {
      asset.url = candidate.url.trim();
    }

    result.push(asset);
  }

  return result;
}

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
