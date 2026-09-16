import { describe, expect, it } from "vitest";
import { chatCapabilityPromptList, chatCapabilityPrompts } from "./chat-catalog";

describe("chatCapabilityPrompts", () => {
  it("hides GEO, Social, and Research on the blog surface", () => {
    const labels = chatCapabilityPrompts("blog_wordpress").map((group) => group.label);
    expect(labels).not.toContain("GEO");
    expect(labels).not.toContain("Social");
    expect(labels).not.toContain("Research");
    expect(labels).toContain("Create");
    expect(labels).toContain("Search");
  });

  it("lists GEO and Social on the full surface", () => {
    const list = chatCapabilityPromptList("full");
    expect(list.some((prompt) => /GEO/i.test(prompt))).toBe(true);
    expect(list.some((prompt) => /LinkedIn/i.test(prompt))).toBe(true);
    expect(chatCapabilityPromptList("blog_wordpress").some((prompt) => /LinkedIn/i.test(prompt))).toBe(false);
  });
});
