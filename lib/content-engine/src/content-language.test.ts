import { describe, expect, it } from "vitest";
import {
  buildLanguagePromptLine,
  contentLanguageLabel,
  isSemrushDatabaseMismatch,
  semrushDatabaseForLanguage,
  semrushDatabaseLabel,
} from "./support/content-language";

describe("content-language", () => {
  it("maps language codes to labels", () => {
    expect(contentLanguageLabel("de")).toBe("German");
    expect(contentLanguageLabel("en-GB")).toBe("English (UK)");
    expect(contentLanguageLabel(undefined)).toBe("English (US)");
  });

  it("maps supported languages to Semrush databases", () => {
    expect(semrushDatabaseForLanguage("de")).toBe("de");
    expect(semrushDatabaseForLanguage("en-GB")).toBe("uk");
    expect(semrushDatabaseForLanguage("pt")).toBe("br");
    expect(semrushDatabaseForLanguage("nl")).toBeNull();
  });

  it("detects database mismatch when a direct mapping exists", () => {
    expect(isSemrushDatabaseMismatch("de", "us")).toBe(true);
    expect(isSemrushDatabaseMismatch("de", "de")).toBe(false);
    expect(isSemrushDatabaseMismatch("nl", "us")).toBe(false);
  });

  it("builds language prompt line for non-English only", () => {
    expect(buildLanguagePromptLine("en")).toBe("");
    expect(buildLanguagePromptLine("de")).toContain("German");
    expect(buildLanguagePromptLine("de")).toContain("suggestedTitle");
  });

  it("formats Semrush database labels", () => {
    expect(semrushDatabaseLabel("de")).toBe("Germany (de)");
    expect(semrushDatabaseLabel("us")).toBe("United States (us)");
  });
});
