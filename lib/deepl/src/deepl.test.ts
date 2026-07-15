import { describe, expect, it } from "vitest";
import { deeplTargetLangForLanguage, isDeeplSupportedLanguage } from "./language-map";
import { resolveDeeplApiKey, resolveDeeplCredentialSource } from "./credentials";

describe("deepl language-map", () => {
  it("maps supported language codes", () => {
    expect(deeplTargetLangForLanguage("de")).toBe("DE");
    expect(deeplTargetLangForLanguage("en-GB")).toBe("EN-GB");
    expect(deeplTargetLangForLanguage("zh-CN")).toBe("ZH-HANS");
    expect(deeplTargetLangForLanguage("zh")).toBe("ZH-HANS");
    expect(deeplTargetLangForLanguage("zh-TW")).toBe("ZH-HANT");
    expect(deeplTargetLangForLanguage("pt")).toBe("PT-BR");
    expect(deeplTargetLangForLanguage("th")).toBe("TH");
    expect(deeplTargetLangForLanguage("he")).toBe("HE");
  });

  it("returns null for English and unknown codes", () => {
    expect(deeplTargetLangForLanguage("en")).toBeNull();
    expect(deeplTargetLangForLanguage(undefined)).toBeNull();
    expect(deeplTargetLangForLanguage("xx")).toBeNull();
  });

  it("detects supported languages", () => {
    expect(isDeeplSupportedLanguage("fr")).toBe(true);
    expect(isDeeplSupportedLanguage("en")).toBe(false);
  });
});

describe("deepl credentials", () => {
  it("prefers project key over org key", () => {
    expect(resolveDeeplApiKey({ org: "org-key", project: "project-key" })).toBe("project-key");
    expect(resolveDeeplCredentialSource({ org: "org-key", project: "project-key" })).toBe("project");
  });

  it("falls back to org key", () => {
    expect(resolveDeeplApiKey({ org: "org-key" })).toBe("org-key");
    expect(resolveDeeplCredentialSource({ org: "org-key" })).toBe("org");
  });

  it("returns undefined when no keys are set", () => {
    expect(resolveDeeplApiKey({})).toBeUndefined();
    expect(resolveDeeplCredentialSource({})).toBeNull();
  });
});
