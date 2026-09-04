/**
 * Personalization inputs for SEO longform generation: funnel stage guidance and
 * proof assets. Both close real gaps found in the generator prompts:
 *
 * 1. `CompiledBriefDraft.funnelStage` is compiled and persisted but never reached
 *    a generation prompt, so a bottom-of-funnel comparison piece and a
 *    top-of-funnel explainer were written from identical instructions.
 * 2. The SEO prompts demand "real numbers, named examples, concrete behavior"
 *    while also (correctly) forbidding invention of stats or anecdotes. Brand
 *    context alone carries no proof material, so the model was told to be
 *    specific, given nothing specific to be specific about, and told not to
 *    invent it. Proof assets give the prompt a real source of truth to draw
 *    from, or an explicit license to stay general when none applies.
 *
 * Pure string-building, no I/O.
 */

export type FunnelStage = "tofu" | "mofu" | "bofu";

export type ProofAsset = {
  kind: "metric" | "case_study" | "customer_quote" | "named_example";
  /** e.g. "cut onboarding from 14 days to 3" */
  claim: string;
  /** Attribution, if any (customer name, company, report). */
  source?: string;
  url?: string;
};

const FUNNEL_STAGE_GUIDANCE: Record<FunnelStage, string> = {
  tofu: `FUNNEL STAGE: Top of funnel (awareness).
The reader does not yet know they have a named problem, let alone a product category for it. They arrived with a broad, curious question, not a buying question.
- Teach the category from first principles. Define terms before using them.
- Do not mention the product as a solution to buy. A passing, non-promotional reference to the brand as a source of the idea is fine; a pitch is not.
- Success for this piece is a reader who now understands the problem well enough to search for a solution next, not one who clicks a demo link.
- The call to action should ask for very little: read a related explainer, subscribe, follow. Never "book a demo" or "start a trial" here.`,
  mofu: `FUNNEL STAGE: Middle of funnel (consideration).
The reader knows the problem and is actively comparing ways to solve it. They are evaluating approaches, not yet vendors.
- Assume category literacy. Do not re-explain basic terms the reader already knows from having searched this far.
- Compare approaches, tradeoffs, and criteria a buyer should weigh. The product may appear as one credible option among several, positioned by its actual strengths, not oversold.
- Success for this piece is a reader who can now name what they need in a solution and shortlist vendors, including this one.
- The call to action can ask for a moderate commitment: a comparison guide, a checklist, a webinar signup. Not yet a hard sales ask.`,
  bofu: `FUNNEL STAGE: Bottom of funnel (decision).
The reader is close to choosing and is validating a specific option, often this product, against alternatives or against doing nothing.
- Skip category education entirely. Get straight to the decision-relevant specifics: pricing structure, implementation effort, proof of results, objection handling.
- Direct product mention and comparison against named alternatives is appropriate and expected here.
- Success for this piece is a reader who is ready to start a trial, book a call, or request a quote.
- The call to action should ask for the real next step: start a trial, book a demo, talk to sales.`,
};

/**
 * Stage-specific guidance block for the SEO longform prompt. Optional by
 * design: when no stage is known, callers omit this entirely and the prompt
 * output is unchanged from before funnel-stage support existed.
 */
export function buildFunnelStagePrompt(stage: FunnelStage): string {
  return FUNNEL_STAGE_GUIDANCE[stage];
}

/**
 * Ranks proof assets by relevance to a keyword using simple token overlap
 * (no new dependencies) and caps the result so the prompt block stays small.
 */
export function selectProofAssets(
  assets: ProofAsset[],
  keyword: string,
  limit = 5,
): ProofAsset[] {
  const keywordTokens = tokenize(keyword);
  if (keywordTokens.length === 0) return assets.slice(0, limit);

  const scored = assets.map((asset) => ({
    asset,
    score: overlapScore(keywordTokens, tokenize(`${asset.claim} ${asset.source ?? ""}`)),
  }));

  // Stable sort by score descending; ties keep original order.
  return scored
    .map((entry, index) => ({ ...entry, index }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.asset);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

function overlapScore(keywordTokens: string[], assetTokens: string[]): number {
  const assetSet = new Set(assetTokens);
  return keywordTokens.reduce((score, token) => score + (assetSet.has(token) ? 1 : 0), 0);
}

const PROOF_ASSET_KIND_LABEL: Record<ProofAsset["kind"], string> = {
  metric: "Metric",
  case_study: "Case study",
  customer_quote: "Customer quote",
  named_example: "Named example",
};

function formatProofAsset(asset: ProofAsset): string {
  const attribution = [asset.source, asset.url].filter(Boolean).join(", ");
  const suffix = attribution ? ` (${attribution})` : "";
  return `- [${PROOF_ASSET_KIND_LABEL[asset.kind]}] ${asset.claim}${suffix}`;
}

/**
 * Proof-asset block for the SEO longform prompt. This is what resolves the
 * be-specific vs do-not-invent tension: when real proof points exist, the
 * model is told to use ONLY these for concrete claims, so "be specific"
 * has somewhere real to draw from. When the list is empty, callers omit this
 * block entirely, leaving the existing "do not invent" instruction as the
 * sole and sufficient guidance, so the model is licensed to stay general
 * rather than fabricate.
 */
export function buildProofAssetPrompt(assets: ProofAsset[]): string {
  if (assets.length === 0) return "";

  const lines = assets.map(formatProofAsset).join("\n");
  return `PROOF ASSETS (use ONLY these for concrete claims, quote them accurately, do not alter numbers or attribution):
${lines}
If a section calls for a specific example or stat and none of these fit, stay general there rather than inventing one.`;
}
