import { describe, expect, it } from "vitest";
import type { PlatformVoices } from "@workspace/db";
import {
  evaluateProjectVoiceReady,
  hasBrandVoiceFields,
  hasAnyPlatformVoice,
  isProjectVoiceReady,
} from "./project-voice-ready";

const emptyPlatform: PlatformVoices = {};

const linkedInVoice: PlatformVoices = {
  linkedin: {
    channels: {
      posts: {
        writingExamples: ["A long enough LinkedIn sample that trains personal voice."],
        typicalStructure: "",
        hookPatterns: [],
        doWords: [],
        dontWords: [],
        voiceTraits: [],
        platformTraits: {},
      },
    },
    importMeta: { source: "oauth", sampleCount: 1 },
  },
};

describe("hasBrandVoiceFields", () => {
  it("accepts voiceTone, skill, or writing examples", () => {
    expect(hasBrandVoiceFields({ voiceTone: "Direct and warm" })).toBe(true);
    expect(hasBrandVoiceFields({ brandVoiceSkill: "# Voice\nBe direct." })).toBe(true);
    expect(hasBrandVoiceFields({ writingExamples: ["We ship weekly."] })).toBe(true);
    expect(hasBrandVoiceFields({ voiceTone: "  ", writingExamples: [""] })).toBe(false);
  });
});

describe("hasAnyPlatformVoice", () => {
  it("detects trained platform channels", () => {
    expect(hasAnyPlatformVoice(emptyPlatform)).toBe(false);
    expect(hasAnyPlatformVoice(null)).toBe(false);
    expect(hasAnyPlatformVoice(linkedInVoice)).toBe(true);
  });
});

describe("evaluateProjectVoiceReady", () => {
  it("is not ready and building while scrape is pending with no voice", () => {
    const result = evaluateProjectVoiceReady({ scrapeStatus: "pending" });
    expect(result.ready).toBe(false);
    expect(result.building).toBe(true);
    expect(isProjectVoiceReady({ scrapeStatus: "pending" })).toBe(false);
  });

  it("is ready from brand fields even while scrape pending", () => {
    const result = evaluateProjectVoiceReady({
      scrapeStatus: "pending",
      voiceTone: "Practical and blunt",
    });
    expect(result.ready).toBe(true);
    expect(result.building).toBe(false);
    expect(result.hasBrandVoice).toBe(true);
  });

  it("is ready from platform voice when scrape failed", () => {
    const result = evaluateProjectVoiceReady({
      scrapeStatus: "failed",
      platformVoices: linkedInVoice,
    });
    expect(result.ready).toBe(true);
    expect(result.hasPlatformVoice).toBe(true);
    expect(result.building).toBe(false);
  });

  it("is not ready when scrape done but voice empty", () => {
    const result = evaluateProjectVoiceReady({ scrapeStatus: "done" });
    expect(result.ready).toBe(false);
    expect(result.building).toBe(false);
  });
});
