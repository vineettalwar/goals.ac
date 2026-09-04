import { describe, expect, it } from "vitest";
import { extractFactualClaims } from "./claim-extractor";
import { clean, borderline } from "./__fixtures__/articles";

describe("extractFactualClaims", () => {
  it("flags a study statistic written as bare prose with no link", () => {
    const audit = extractFactualClaims(
      "According to a 2024 Harvard study, 73 percent of buyers abandon checkout.",
    );
    expect(audit.claims).toHaveLength(1);
    expect(audit.unattributed).toHaveLength(1);
    expect(audit.claims[0]?.attributed).toBe(false);
    expect(audit.claims[0]?.signals).toEqual(
      expect.arrayContaining(["percentage", "study_reference", "year"]),
    );
  });

  it("does not flag the same claim when it carries a markdown link", () => {
    const audit = extractFactualClaims(
      "According to a [2024 Harvard study](https://harvard.edu/study), 73 percent of buyers abandon checkout.",
    );
    expect(audit.claims).toHaveLength(1);
    expect(audit.unattributed).toHaveLength(0);
    expect(audit.claims[0]?.attributed).toBe(true);
  });

  it("treats a linked named source as attributed", () => {
    const audit = extractFactualClaims(
      "According to [Google](https://developers.google.com/search), proximity drives rankings.",
    );
    expect(audit.unattributed).toHaveLength(0);
    expect(audit.claims[0]?.attributed).toBe(true);
  });

  it("treats an unlinked but named inline source as attributed", () => {
    const audit = extractFactualClaims("Google reports that proximity drives rankings.");
    expect(audit.unattributed).toHaveLength(0);
    expect(audit.claims[0]?.attributed).toBe(true);
    expect(audit.claims[0]?.signals).toContain("study_reference");
  });

  it("does not treat list ordinals, versions, or times of day as claims", () => {
    expect(extractFactualClaims("Step 3 of 5").claims).toHaveLength(0);
    expect(extractFactualClaims("We use version 2.1 of the framework.").claims).toHaveLength(0);
    expect(extractFactualClaims("We open at 9 am.").claims).toHaveLength(0);
  });

  it("does not flag a writer describing their own pricing", () => {
    // A lone currency figure is usually the writer stating a price, not a
    // sourced assertion. Requiring money to travel with a second signal is what
    // keeps this module quiet on commercial copy, which is most of what this
    // platform generates.
    const audit = extractFactualClaims("Our Starter plan costs $49 a month.");
    expect(audit.claims).toHaveLength(0);
  });

  it("does not treat a bare year with no study context as a claim", () => {
    const audit = extractFactualClaims("Sarah opened her shop in 2019.");
    expect(audit.claims).toHaveLength(0);
  });

  it("does not treat an anecdotal growth verb with no digit as a statistic", () => {
    const audit = extractFactualClaims("Traffic from that search term tripled within six weeks.");
    expect(audit.claims).toHaveLength(0);
  });

  it("does not mistake a journalist ('reporters') for a study reference", () => {
    const audit = extractFactualClaims("Local reporters need story angles too.");
    expect(audit.claims).toHaveLength(0);
  });

  it("does not split sentences on a decimal point or a URL's internal periods", () => {
    const audit = extractFactualClaims(
      "Read [BrightLocal's survey](https://www.brightlocal.com/research/survey/) for more, found in 65 percent of listings.",
    );
    expect(audit.claims).toHaveLength(1);
    expect(audit.claims[0]?.attributed).toBe(true);
  });

  it("produces zero unattributed claims on a clean, fully cited article", () => {
    const audit = extractFactualClaims(clean.bodyMarkdown);
    expect(audit.unattributed).toHaveLength(0);
  });

  it("produces a low false-positive rate on a borderline but publishable article", () => {
    const audit = extractFactualClaims(borderline.bodyMarkdown);
    // Every flagged claim here is a genuinely unsourced dollar figure or a
    // "cited above" back-reference with no link in its own sentence, not a
    // spurious match on ordinary prose.
    expect(audit.unattributed.length).toBeLessThanOrEqual(6);
  });

  it("does not treat a bare price band as a claim needing attribution", () => {
    // Commercial content discusses price ranges constantly. Flagging every one
    // would make the warning surface noise, so money needs a second signal.
    const audit = extractFactualClaims(
      "Under $300 usually means a single motor, a laminate top, and a basic frame.",
    );
    expect(audit.claims).toHaveLength(0);
    expect(audit.unattributed).toHaveLength(0);
  });

  it("still flags a money figure that travels with a research reference", () => {
    const audit = extractFactualClaims(
      "The market grew to $4.2 billion in 2024 according to industry research.",
    );
    expect(audit.claims).toHaveLength(1);
    expect(audit.unattributed).toHaveLength(1);
  });
});
