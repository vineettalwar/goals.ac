/**
 * End-to-end evaluation: runs full, realistic article drafts through the whole
 * content-quality stack (publish-readiness gate, AI-tell diagnosis, keyword density, alt-text
 * coverage, article quality scoring) and asserts that the system RANKS them correctly relative
 * to each other. Unit tests already cover each scorer in isolation; this file is the check that
 * the system as a whole agrees with a human reader about which draft is actually good.
 *
 * Assertions here are deliberately relative (ordering, membership, boolean outcomes) rather
 * than pinned to exact scores, per the rule in README.md: a suite that breaks whenever someone
 * tunes a threshold by one point is worse than no suite.
 */
import { describe, expect, it } from "vitest";
import { assessPublishReadiness, type PublishReadinessPiece } from "../publish-readiness";
import { countAiSlopSignals } from "../ai-writing-rules";
import { analyzeAltTextCoverage, analyzeKeywordDensity } from "../seo-guardrails";
import { countExternalLinks } from "../content-piece-seo";
import { scoreArticleQuality } from "../../articles/article-quality-score";
import { badAlt, borderline, clean, danglingLinks, sloppy, stuffed, thin } from "./articles";
import type { ArticleFixture } from "./articles";

function toPiece(fixture: ArticleFixture): PublishReadinessPiece {
  return {
    title: fixture.title,
    bodyMarkdown: fixture.bodyMarkdown,
    metaTitle: fixture.title,
    metaDescription: fixture.metaDescription,
  };
}

function codesOf(issues: { code: string }[]): string[] {
  return issues.map((issue) => issue.code);
}

describe("assessPublishReadiness across realistic drafts", () => {
  it("clean passes with zero blockers", () => {
    const result = assessPublishReadiness(toPiece(clean), {
      targetKeyword: clean.targetKeyword,
      knownSlugs: ["blog/evergreen-event-pages", "blog/indie-retailer-interviews"],
    });

    // Print the codes on failure so a regression here is diagnosable without re-running
    // the test in a debugger.
    expect(result.blockers, `expected zero blockers, got: ${JSON.stringify(codesOf(result.blockers))}`).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("stuffed blocks with keyword_stuffing; clean does not", () => {
    const stuffedResult = assessPublishReadiness(toPiece(stuffed), {
      targetKeyword: stuffed.targetKeyword,
    });
    const cleanResult = assessPublishReadiness(toPiece(clean), {
      targetKeyword: clean.targetKeyword,
      knownSlugs: ["blog/evergreen-event-pages", "blog/indie-retailer-interviews"],
    });

    expect(codesOf(stuffedResult.blockers)).toContain("keyword_stuffing");
    expect(codesOf(cleanResult.blockers)).not.toContain("keyword_stuffing");

    // The density report itself should agree with the blocker: stuffed reads as "over",
    // clean does not.
    expect(analyzeKeywordDensity(stuffed.bodyMarkdown, stuffed.targetKeyword).verdict).toBe("over");
    expect(analyzeKeywordDensity(clean.bodyMarkdown, clean.targetKeyword).verdict).not.toBe("over");
  });

  it("thin produces thin-content and low-score warnings, and no false blockers", () => {
    const result = assessPublishReadiness(toPiece(thin), {
      targetKeyword: thin.targetKeyword,
    });

    expect(codesOf(result.warnings)).toContain("thin_content");
    expect(codesOf(result.warnings)).toContain("few_citations");
    expect(codesOf(result.warnings)).toContain("no_faq");
    // A thin, honestly-written draft still shouldn't trip anything structural.
    expect(codesOf(result.blockers)).toEqual([]);
  });

  it("dangling-links blocks with dangling_internal_link when known slugs are supplied, and does not when they are omitted", () => {
    const withKnownSlugs = assessPublishReadiness(toPiece(danglingLinks), {
      targetKeyword: danglingLinks.targetKeyword,
      // Deliberately does not include the slugs this fixture links to.
      knownSlugs: ["blog/totally-unrelated-page"],
    });
    const withoutKnownSlugs = assessPublishReadiness(toPiece(danglingLinks), {
      targetKeyword: danglingLinks.targetKeyword,
    });

    expect(
      codesOf(withKnownSlugs.blockers),
      `expected dangling_internal_link, got: ${JSON.stringify(codesOf(withKnownSlugs.blockers))}`,
    ).toContain("dangling_internal_link");
    expect(codesOf(withoutKnownSlugs.blockers)).not.toContain("dangling_internal_link");
  });

  it("bad-alt blocks on empty alt text and warns on weak/duplicated alt text", () => {
    const result = assessPublishReadiness(toPiece(badAlt), {
      targetKeyword: badAlt.targetKeyword,
    });

    expect(
      codesOf(result.blockers),
      `expected missing_alt_text, got: ${JSON.stringify(codesOf(result.blockers))}`,
    ).toContain("missing_alt_text");
    expect(codesOf(result.warnings)).toContain("weak_alt_text");

    const coverage = analyzeAltTextCoverage(badAlt.bodyMarkdown);
    expect(coverage.emptyAlt.length).toBeGreaterThan(0);
    expect(coverage.lowQualityAlt.length).toBeGreaterThan(0);
  });
});

describe("AI-tell density ranks drafts the way a human editor would", () => {
  it("sloppy has materially higher AI-slop density than clean and borderline", () => {
    const cleanScore = countAiSlopSignals(clean.bodyMarkdown);
    const borderlineScore = countAiSlopSignals(borderline.bodyMarkdown);
    const sloppyScore = countAiSlopSignals(sloppy.bodyMarkdown);

    // "Materially higher": not just "more than zero more", but a clear multiple, since a
    // couple of stray tells in a long article shouldn't count as "as bad as" a slop-dense one.
    expect(sloppyScore).toBeGreaterThan(cleanScore * 3);
    expect(sloppyScore).toBeGreaterThan(borderlineScore * 3);
  });

  it("borderline scores close to clean, not close to sloppy: the anti-false-positive guard", () => {
    const cleanScore = countAiSlopSignals(clean.bodyMarkdown);
    const borderlineScore = countAiSlopSignals(borderline.bodyMarkdown);
    const sloppyScore = countAiSlopSignals(sloppy.bodyMarkdown);

    // The ordering that matters: clean <= borderline, and the gap from borderline to sloppy
    // dwarfs the gap from clean to borderline. This is the assertion that proves the detector
    // does not punish acceptable writing that happens to use an ordinary word ("capabilities",
    // "ultimately") once or twice in a long article.
    expect(cleanScore).toBeLessThanOrEqual(borderlineScore);
    const cleanToBorderlineGap = borderlineScore - cleanScore;
    const borderlineToSloppyGap = sloppyScore - borderlineScore;
    expect(
      borderlineToSloppyGap,
      `clean=${cleanScore} borderline=${borderlineScore} sloppy=${sloppyScore}: expected the sloppy jump to dwarf the clean-to-borderline gap`,
    ).toBeGreaterThan(cleanToBorderlineGap * 3);
  });
});

describe("scoreArticleQuality ranks fixtures the way a human editor would", () => {
  // Score every fixture the same way: bodyMarkdown + meta fields only, letting the FAQ/
  // citation/internal-link counts infer from the Markdown itself (scoreArticleQuality's own
  // fallback path), which is the fairest apples-to-apples comparison across fixtures that were
  // not authored with a pre-structured citations/faqSection/internalLinkSuggestions payload.
  const scores: Record<string, number> = Object.fromEntries(
    [clean, sloppy, stuffed, thin, danglingLinks, badAlt, borderline].map((fixture) => [
      fixture.name,
      scoreArticleQuality({
        bodyMarkdown: fixture.bodyMarkdown,
        metaTitle: fixture.title,
        metaDescription: fixture.metaDescription,
      }).total,
    ]),
  );

  it("clean scores highest and thin scores lowest", () => {
    const entries = Object.entries(scores);
    const [highestName] = entries.reduce((best, entry) => (entry[1] > best[1] ? entry : best));
    const [lowestName] = entries.reduce((worst, entry) => (entry[1] < worst[1] ? entry : worst));

    expect(highestName, `scores: ${JSON.stringify(scores)}`).toBe("clean");
    expect(lowestName, `scores: ${JSON.stringify(scores)}`).toBe("thin");
  });

  it("clean outranks sloppy and stuffed, and borderline outranks sloppy", () => {
    expect(scores.clean).toBeGreaterThan(scores.sloppy);
    expect(scores.clean).toBeGreaterThan(scores.stuffed);
    expect(scores.borderline).toBeGreaterThan(scores.sloppy);
  });
});

describe("known bug: assessPublishReadiness undercounts quality for body-only pieces", () => {
  /**
   * assessPublishReadiness's `resolveFields` defaults citations/faqSection/
   * internalLinkSuggestions to `[]` whenever a piece does not carry pre-structured versions of
   * those fields (see resolveFields in publish-readiness.ts). It then hands that concrete
   * empty array straight to scoreArticleQuality. scoreArticleQuality's own fallback logic
   * (`input.citations?.length ?? countExternalLinks(body)`) exists specifically to infer these
   * counts from the Markdown body when the caller has not pre-structured them, but an empty
   * array is not nullish, so `[].length` (0) wins over the fallback and the inference path
   * never runs.
   *
   * Net effect: any piece submitted as bodyMarkdown-only (a completely valid shape per
   * PublishReadinessPiece's own types, and how a raw import would look) gets its FAQ,
   * citation, and internal-link bands scored as zero inside assessPublishReadiness's
   * `qualityScore`, even when the body markdown plainly contains a 4-item FAQ section and
   * several external citations. That is a real scoring gap, not a fixture problem: this test
   * demonstrates it with `clean`, whose direct scoreArticleQuality total (all bands correctly
   * inferred from the body) and assessPublishReadiness-reported qualityScore diverge by more
   * than half the point total, purely because of which object shape the caller happened to
   * use. It does not flip assessPublishReadiness's pass/fail outcome for `clean` today (the
   * gate's low_quality_score check is advisory by default), but it does mean the score number
   * itself cannot be trusted for any UI or automation that reads `result.qualityScore` on a
   * bodyMarkdown-only piece. Fixed by making the gate pass `undefined` rather than `[]` to
   * scoreArticleQuality when the piece carries nothing structured, so the body inference runs.
   */
  it("qualityScore from a body-only piece tracks scoreArticleQuality's own body inference", () => {
    const readiness = assessPublishReadiness(toPiece(clean), {
      targetKeyword: clean.targetKeyword,
      knownSlugs: ["blog/evergreen-event-pages", "blog/indie-retailer-interviews"],
    });
    const direct = scoreArticleQuality({
      bodyMarkdown: clean.bodyMarkdown,
      metaTitle: clean.title,
      metaDescription: clean.metaDescription,
    });

    // Both score the same body, so they must agree within a small margin. The residual gap is
    // only the meta fields the gate resolves and the direct call is handed explicitly.
    expect(Math.abs(readiness.qualityScore - direct.total)).toBeLessThanOrEqual(10);
  });
});

describe("regression: image embeds are not external citation links", () => {
  /**
   * `countExternalLinks` (duplicated in content-piece-seo.ts and article-quality-score.ts) is
   * `/\[.+?\]\(https?:\/\/[^)]+\)/g`. That pattern has no requirement that the match NOT be
   * preceded by a `!`, so a plain image embed `![alt text](https://cdn.example.com/photo.jpg)`
   * contains a substring, `[alt text](https://cdn.example.com/photo.jpg)`, that matches it
   * exactly. Every image hosted at an https URL, which in practice is nearly all of them, is
   * silently counted as an external citation.
   *
   * `bad-alt` is a natural demonstration: it has four images, all https-hosted, and zero real
   * citation links. It should read as "0 external citations" (and should trip the few_citations
   * warning in assessPublishReadiness). Instead it reads as 4, which both inflates the
   * Citations band in scoreArticleQuality and silently suppresses the few_citations warning in
   * the publish gate. That is a false negative on an article-quality signal: a draft with no
   * outside sourcing at all can look adequately cited purely because it has stock photos.
   *
   * Fixed by anchoring both copies of the pattern with a negative
   * lookbehind so a leading `!` disqualifies the match.
   */
  it("image embeds do not count as external citations", () => {
    expect(countExternalLinks(badAlt.bodyMarkdown)).toBe(0);
  });
});
