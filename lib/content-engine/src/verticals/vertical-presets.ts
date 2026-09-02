import type { OrgVertical } from "@workspace/db/schema";

/**
 * Per-vertical onboarding and content presets.
 *
 * Two of these verticals (law, dental) are YMYL — "your money or your life" — categories.
 * Search engines hold them to a higher accuracy bar, and more importantly a wrong claim
 * about the law or about a medical procedure is a real liability for the firm publishing
 * it. Those verticals set `requiresReview`, which keeps generated drafts out of any
 * auto-publish path until a human at the firm approves them.
 */
export interface VerticalPreset {
  id: OrgVertical;
  /** Shown in the onboarding vertical picker. */
  label: string;
  /** One-line description under the label. */
  blurb: string;
  /** Seeds the audience step so the firm edits rather than composes from nothing. */
  defaultAudience: string;
  /** Appended to the brand voice prompt for this vertical. */
  toneGuidance: string;
  /**
   * Claim patterns the generator must not produce for this vertical. Matched
   * case-insensitively against draft bodies by the guardrail check.
   */
  forbiddenClaims: string[];
  /** Cold-start topic angles used when there is no Search Console data yet. */
  seedAngles: string[];
  /** schema.org type for structured data on published articles. */
  schemaType: string;
  /**
   * True when drafts must be reviewed by a human before publishing. Auto-publish
   * is disabled for these orgs regardless of other settings.
   */
  requiresReview: boolean;
  /** Rendered at the foot of published articles for regulated verticals. */
  disclaimer?: string;
}

export const VERTICAL_PRESETS: Record<OrgVertical, VerticalPreset> = {
  law: {
    id: "law",
    label: "Law firm",
    blurb: "Legal services, practice areas, client advisory",
    defaultAudience:
      "People and businesses facing a legal problem who are researching their options before contacting a firm.",
    toneGuidance:
      "Precise and calm. Explain legal concepts in plain language without dumbing them down. Never predict an outcome, never state what the reader should do in their specific matter, and always distinguish general information from advice. Prefer 'may', 'often', 'in many cases' over absolutes.",
    forbiddenClaims: [
      "guaranteed outcome",
      "we will win",
      "you will win",
      "guaranteed compensation",
      "100% success",
      "no risk",
      "this is legal advice",
      "you should sue",
    ],
    seedAngles: [
      "What to do in the first 48 hours after {situation}",
      "How much does {service} actually cost, and what drives the range",
      "{Process} explained step by step, and how long each stage takes",
      "The documents you need before your first consultation about {topic}",
      "{Jurisdiction} rules on {topic}: what changed and who it affects",
      "Common mistakes people make when handling {topic} without a lawyer",
    ],
    schemaType: "LegalService",
    requiresReview: true,
    disclaimer:
      "This article is general information, not legal advice, and does not create a solicitor-client relationship. Laws differ by jurisdiction and change over time. Speak to a qualified lawyer about your specific situation.",
  },
  dental: {
    id: "dental",
    label: "Dental practice",
    blurb: "Dentistry, orthodontics, patient care",
    defaultAudience:
      "Local patients comparing practices, researching a procedure, or worried about a symptom and deciding whether to book.",
    toneGuidance:
      "Warm, reassuring, and concrete. Anxiety is the main barrier, so name it and reduce it. Describe procedures honestly including discomfort and recovery. Never diagnose the reader, never promise a clinical result, and always point toward an examination for anything specific.",
    forbiddenClaims: [
      "painless",
      "completely safe",
      "no side effects",
      "guaranteed results",
      "permanent results",
      "cures",
      "risk-free",
      "you have",
      "you are suffering from",
    ],
    seedAngles: [
      "{Procedure}: what actually happens, appointment by appointment",
      "What {procedure} costs in {location} and what affects the price",
      "{Symptom}: what it can mean and when it needs an appointment",
      "{Procedure A} vs {procedure B}: how patients actually choose",
      "How to prepare for {procedure} and what recovery looks like",
      "What to expect at a first visit if you have not seen a dentist in years",
    ],
    schemaType: "Dentist",
    requiresReview: true,
    disclaimer:
      "This article is general information, not a diagnosis or treatment plan. Individual results vary and every mouth is different. Book an examination with a qualified dentist to discuss your own situation.",
  },
  software: {
    id: "software",
    label: "Software development firm",
    blurb: "Custom builds, platform work, technical consulting",
    defaultAudience:
      "Founders and technical leaders evaluating whether to build in-house or hire a partner, and comparing firms on judgment rather than rate card.",
    toneGuidance:
      "Direct and specific. Show the tradeoff, not the brochure. Use concrete numbers, architectures, and failure modes. Assume the reader has been burned by a vendor before and is reading for evidence of judgment. No hype adjectives.",
    forbiddenClaims: [
      "fully automated",
      "zero downtime guaranteed",
      "bug-free",
      "infinitely scalable",
      "no maintenance required",
    ],
    seedAngles: [
      "What {technology} actually costs to run at {scale}",
      "{Approach A} vs {approach B}: the decision, not the feature list",
      "Why {common architecture} breaks at {scale} and what replaces it",
      "How long {type of build} really takes, and where the estimates go wrong",
      "Build vs buy for {capability}: the numbers that decide it",
      "A postmortem shape: what went wrong with {pattern} and what we changed",
    ],
    schemaType: "ProfessionalService",
    requiresReview: false,
  },
  marketing: {
    id: "marketing",
    label: "Marketing firm",
    blurb: "Growth, brand, demand generation",
    defaultAudience:
      "Marketing leads and founders who need results attributable to spend and are sceptical of agencies that talk in impressions.",
    toneGuidance:
      "Confident and evidence-led. Every claim carries a number or an example. Avoid the vocabulary the reader has heard from every other agency. Show the work and the failure cases, not just the wins.",
    forbiddenClaims: [
      "guaranteed rankings",
      "guaranteed leads",
      "instant results",
      "#1 on Google",
      "viral guaranteed",
      "risk-free",
    ],
    seedAngles: [
      "What {channel} actually costs per qualified lead in {industry}",
      "{Tactic}: when it works, when it wastes money",
      "How to tell whether your {channel} spend is working, in one dashboard",
      "The {industry} funnel benchmarks worth comparing yourself to",
      "Why {common tactic} stopped working and what replaced it",
      "A teardown shape: what {type of campaign} got right and wrong",
    ],
    schemaType: "ProfessionalService",
    requiresReview: false,
  },
  other: {
    id: "other",
    label: "Something else",
    blurb: "We will learn your category from your website",
    defaultAudience: "People researching this category before choosing who to buy from.",
    toneGuidance:
      "Match the register of the firm's own website. Be specific and concrete, avoid marketing filler, and prefer examples over adjectives.",
    forbiddenClaims: ["guaranteed results", "risk-free", "instant results"],
    seedAngles: [
      "What {service} costs and what drives the range",
      "How to choose a {category} provider, and the questions worth asking",
      "{Process} explained step by step",
      "Common mistakes buyers make with {topic}",
    ],
    schemaType: "Organization",
    requiresReview: false,
  },
};

export const VERTICAL_IDS = Object.keys(VERTICAL_PRESETS) as OrgVertical[];

export function getVerticalPreset(vertical: OrgVertical | null | undefined): VerticalPreset {
  if (!vertical) return VERTICAL_PRESETS.other;
  return VERTICAL_PRESETS[vertical] ?? VERTICAL_PRESETS.other;
}

/** True when this vertical's drafts must be human-approved before publishing. */
export function verticalRequiresReview(vertical: OrgVertical | null | undefined): boolean {
  return getVerticalPreset(vertical).requiresReview;
}

export interface ForbiddenClaimHit {
  claim: string;
  /** Character offset of the match in the scanned text. */
  index: number;
  /** The surrounding text, for showing the reviewer where the problem is. */
  excerpt: string;
}

/**
 * Scans a draft for claim patterns this vertical must not make. Returns every hit
 * rather than the first, so a reviewer sees the whole problem in one pass.
 */
export function findForbiddenClaims(
  body: string,
  vertical: OrgVertical | null | undefined,
): ForbiddenClaimHit[] {
  const preset = getVerticalPreset(vertical);
  const haystack = body.toLowerCase();
  const hits: ForbiddenClaimHit[] = [];

  for (const claim of preset.forbiddenClaims) {
    const needle = claim.toLowerCase();
    let from = 0;
    for (;;) {
      const index = haystack.indexOf(needle, from);
      if (index === -1) break;
      hits.push({
        claim,
        index,
        excerpt: body.slice(Math.max(0, index - 60), Math.min(body.length, index + needle.length + 60)).trim(),
      });
      from = index + needle.length;
    }
  }

  return hits.sort((a, b) => a.index - b.index);
}
