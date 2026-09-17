import { describe, expect, it } from "vitest";
import { geoCitationIssues, issueForAiRobots, issueForLlmsTxt } from "./geoAuditor";

describe("issueForLlmsTxt", () => {
  it("warns when missing", () => {
    expect(issueForLlmsTxt(null).status).toBe("warn");
  });
  it("passes a real file", () => {
    expect(issueForLlmsTxt("# goals.ac\n\nProgrammatic SEO platform for B2B teams.\n").status).toBe(
      "pass",
    );
  });
});

describe("issueForAiRobots", () => {
  it("warns when GPTBot is disallowed", () => {
    const issue = issueForAiRobots("User-agent: GPTBot\nDisallow: /\n");
    expect(issue.status).toBe("warn");
    expect(issue.detail).toMatch(/GPTBot/);
  });
  it("passes when no AI crawler is blocked", () => {
    expect(issueForAiRobots("User-agent: *\nDisallow:\n").status).toBe("pass");
  });
});

describe("geoCitationIssues", () => {
  it("flags missing sameAs, author, dates, citations, and thin copy", () => {
    const issues = geoCitationIssues(
      "<html><body><p>Hi</p></body></html>",
      "https://acme.test/page",
    );
    expect(issues.map((i) => i.check)).toEqual([
      "Entity sameAs",
      "Author / Person",
      "Freshness dates",
      "Outbound citations",
      "Citability length",
    ]);
    expect(issues.every((i) => i.status === "warn")).toBe(true);
  });

  it("passes when JSON-LD and outbound links exist", () => {
    const html = `<html><head>
      <script type="application/ld+json">${JSON.stringify({
        "@type": "Organization",
        sameAs: ["https://linkedin.com/company/acme"],
        dateModified: "2026-01-01",
      })}</script>
      <script type="application/ld+json">${JSON.stringify({ "@type": "Person", name: "Ada" })}</script>
      </head><body><p>${" word".repeat(320)}</p>
      <a href="https://example.com/source">source</a>
      <a href="https://example.org/paper">paper</a>
      </body></html>`;
    const issues = geoCitationIssues(html, "https://acme.test/page");
    expect(issues.every((i) => i.status === "pass")).toBe(true);
  });
});
