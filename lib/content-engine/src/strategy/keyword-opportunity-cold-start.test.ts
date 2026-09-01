import { describe, it, expect } from "vitest";
import {
  containsLiteralPlaceholder,
  fillSeedAngleTemplate,
  type ColdStartFillers,
} from "@workspace/content-engine/strategy/keyword-opportunity-service";
import { VERTICAL_PRESETS } from "@workspace/content-engine/vertical-presets";

const dentalFillers: ColdStartFillers = {
  services: ["dental implants", "teeth whitening"],
  industry: "dentistry",
  location: "Austin",
};

describe("fillSeedAngleTemplate", () => {
  it("fills every placeholder with real brand data — never emits the literal token", () => {
    for (const template of VERTICAL_PRESETS.dental.seedAngles) {
      const filled = fillSeedAngleTemplate(template, dentalFillers);
      expect(filled).not.toBeNull();
      expect(containsLiteralPlaceholder(filled!)).toBe(false);
    }
  });

  it("substitutes {procedure} with a real service name", () => {
    const filled = fillSeedAngleTemplate(
      "{Procedure}: what actually happens, appointment by appointment",
      dentalFillers,
    );
    expect(filled).toBe("dental implants: what actually happens, appointment by appointment");
  });

  it("substitutes {location}", () => {
    const filled = fillSeedAngleTemplate(
      "What {procedure} costs in {location} and what affects the price",
      dentalFillers,
    );
    expect(filled).toContain("Austin");
    expect(filled).not.toContain("{location}");
  });

  it("varies paired A/B placeholders instead of repeating the same value", () => {
    const filled = fillSeedAngleTemplate(
      "{Procedure A} vs {procedure B}: how patients actually choose",
      dentalFillers,
    );
    expect(filled).toBe("dental implants vs teeth whitening: how patients actually choose");
  });

  it("returns null (never the literal placeholder) when there is no service data to fill from", () => {
    const noServices: ColdStartFillers = { services: [], industry: "", location: "your area" };
    const filled = fillSeedAngleTemplate("{Procedure}: what actually happens", noServices);
    expect(filled).toBeNull();
  });

  it("fills {industry} and {scale} for the software vertical without needing services", () => {
    const filled = fillSeedAngleTemplate(
      "What {technology} actually costs to run at {scale}",
      { services: ["managed Postgres"], industry: "fintech", location: "" },
    );
    expect(filled).toBe("What managed Postgres actually costs to run at your typical scale");
  });

  it("passes templates with no placeholders through unchanged", () => {
    expect(fillSeedAngleTemplate("A plain title with no tokens", dentalFillers)).toBe(
      "A plain title with no tokens",
    );
  });
});

describe("containsLiteralPlaceholder", () => {
  it("detects a leftover brace token", () => {
    expect(containsLiteralPlaceholder("Reaching a {procedure} customer is a defect")).toBe(true);
  });

  it("does not false-positive on ordinary curly-free text", () => {
    expect(containsLiteralPlaceholder("Dental implants explained appointment by appointment")).toBe(
      false,
    );
  });
});
