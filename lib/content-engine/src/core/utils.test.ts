import { describe, expect, it } from "vitest";
import { cleanAndParse, cleanAndParseLenient, closeTruncatedJson } from "./utils";

describe("closeTruncatedJson", () => {
  it("repairs a body_markdown string cut off at max tokens", () => {
    const raw = `{"title":"Ship JSON","body_markdown":"# Start\\n\\nThis draft was cut`;
    const parsed = JSON.parse(closeTruncatedJson(raw)) as {
      title: string;
      body_markdown: string;
    };
    expect(parsed.title).toBe("Ship JSON");
    expect(parsed.body_markdown).toContain("This draft was cut");
  });

  it("leaves valid JSON unchanged", () => {
    const raw = `{"title":"ok","body_markdown":"long enough body here"}`;
    expect(cleanAndParseLenient(raw)).toEqual(cleanAndParse(raw));
  });
});
