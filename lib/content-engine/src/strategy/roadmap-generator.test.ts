import { describe, expect, it } from "vitest";
import { buildRoadmapPrompt, parseRoadmapContent } from "./roadmap-generator";

describe("buildRoadmapPrompt", () => {
  it("asks for one 12-month plan whose later phases continue earlier ones", () => {
    const prompt = buildRoadmapPrompt("HVAC software", "Austin", "seed", "Company: Acme");
    expect(prompt).toContain("Phase 2 must explicitly continue phase 1");
    expect(prompt).toContain("Phase 3 must assume phases 1-2 succeeded");
    expect(prompt).toContain("Return ONLY this JSON");
    expect(prompt.match(/Generate phase /g)).toBeNull();
  });
});

describe("parseRoadmapContent", () => {
  it("normalizes titles and requires three complete phases", () => {
    const content = parseRoadmapContent(
      JSON.stringify({
        executiveSummary: "Win regional HVAC with field-service SEO.",
        phases: [
          {
            title: "whatever",
            timeframe: "q1",
            objectives: ["instrument pipeline"],
            tactics: ["GSC + local pages"],
            kpis: ["20 SQLs"],
          },
          {
            title: "x",
            timeframe: "q2",
            objectives: ["scale winning pages"],
            tactics: ["repurpose top URLs"],
            kpis: ["40 SQLs"],
          },
          {
            title: "y",
            timeframe: "q3",
            objectives: ["adjacent trades"],
            tactics: ["partner webinars"],
            kpis: ["$200k pipeline"],
          },
        ],
      }),
    );
    expect(content.phases.map((p) => p.title)).toEqual([
      "Foundation & Quick Wins",
      "Scaling & Automation",
      "Market Expansion",
    ]);
    expect(content.phases.map((p) => p.timeframe)).toEqual([
      "Months 1-3",
      "Months 4-6",
      "Months 7-12",
    ]);
  });

  it("rejects a two-phase plan", () => {
    expect(() =>
      parseRoadmapContent(
        JSON.stringify({
          executiveSummary: "Nope",
          phases: [
            {
              title: "a",
              timeframe: "1",
              objectives: ["o"],
              tactics: ["t"],
              kpis: ["k"],
            },
          ],
        }),
      ),
    ).toThrow(/exactly 3 phases/);
  });
});
