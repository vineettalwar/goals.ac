import { describe, expect, it } from "vitest";
import {
  buildFunnelStagePrompt,
  buildProofAssetPrompt,
  selectProofAssets,
  type ProofAsset,
} from "./personalization";
import { buildSeoLongformRequirements } from "./content-piece-seo";

describe("buildFunnelStagePrompt", () => {
  it("produces materially different text per stage", () => {
    const tofu = buildFunnelStagePrompt("tofu");
    const mofu = buildFunnelStagePrompt("mofu");
    const bofu = buildFunnelStagePrompt("bofu");

    expect(tofu).not.toBe(mofu);
    expect(mofu).not.toBe(bofu);
    expect(tofu).not.toBe(bofu);

    expect(tofu).toMatch(/awareness/i);
    expect(tofu).toMatch(/Do not mention the product/i);

    expect(mofu).toMatch(/consideration/i);
    expect(mofu).toMatch(/one credible option among several/i);

    expect(bofu).toMatch(/decision/i);
    expect(bofu).toMatch(/Skip category education entirely/i);
  });
});

describe("buildProofAssetPrompt", () => {
  it("returns an empty string for an empty list", () => {
    expect(buildProofAssetPrompt([])).toBe("");
  });

  it("instructs the model to use only the supplied proof points", () => {
    const assets: ProofAsset[] = [
      { kind: "metric", claim: "cut onboarding from 14 days to 3", source: "Acme case study" },
    ];
    const block = buildProofAssetPrompt(assets);
    expect(block).toMatch(/use ONLY these/i);
    expect(block).toMatch(/cut onboarding from 14 days to 3/);
    expect(block).toMatch(/stay general/i);
  });
});

describe("selectProofAssets", () => {
  const assets: ProofAsset[] = [
    { kind: "metric", claim: "reduced churn rate by 40 percent for enterprise accounts" },
    { kind: "named_example", claim: "unrelated onboarding flow redesign for a mobile app" },
  ];

  it("ranks a relevant asset above an irrelevant one", () => {
    const selected = selectProofAssets(assets, "reduce churn enterprise", 5);
    expect(selected[0]?.claim).toContain("churn");
  });

  it("respects the limit", () => {
    const many: ProofAsset[] = Array.from({ length: 10 }, (_, i) => ({
      kind: "metric",
      claim: `metric number ${i} about churn`,
    }));
    const selected = selectProofAssets(many, "churn", 3);
    expect(selected).toHaveLength(3);
  });
});

describe("backward compatibility: buildSeoLongformRequirements with no personalization options", () => {
  it("matches the exact pre-personalization output", () => {
    const result = buildSeoLongformRequirements("Acme", "best crm software", "1200-1500");
    expect(result.startsWith("Requirements for body_markdown:")).toBe(true);
    expect(result).not.toMatch(/FUNNEL STAGE/);
    expect(result).not.toMatch(/PROOF ASSETS/);
    expect(result).toMatchSnapshot();
  });

  it("adds a funnel stage block only when funnelStage is supplied", () => {
    const withStage = buildSeoLongformRequirements("Acme", "best crm software", "1200-1500", "Article", {
      funnelStage: "bofu",
    });
    expect(withStage).toMatch(/FUNNEL STAGE: Bottom of funnel/);
  });

  it("adds a proof asset block only when proofAssets is non-empty", () => {
    const withProof = buildSeoLongformRequirements("Acme", "best crm software", "1200-1500", "Article", {
      proofAssets: [{ kind: "metric", claim: "grew MRR 3x in 12 months" }],
    });
    expect(withProof).toMatch(/PROOF ASSETS/);
    expect(withProof).toMatch(/grew MRR 3x in 12 months/);
  });
});
