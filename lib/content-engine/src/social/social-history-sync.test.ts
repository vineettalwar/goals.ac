import { describe, expect, it } from "vitest";
import { mergeImportedSamples } from "../platform-voice/platform-voice-import-service";

describe("mergeImportedSamples oauth", () => {
  it("stores oauth source metadata and normalized samples", () => {
    const sample =
      "Here is a long enough LinkedIn post sample that should be kept after normalization and filtering for minimum length requirements.";
    const voices = mergeImportedSamples({
      voices: null,
      platform: "linkedin",
      channel: "posts",
      samples: [sample],
      source: "oauth",
    });

    const profile = voices.linkedin;
    expect(profile?.importMeta?.source).toBe("oauth");
    expect(profile?.importMeta?.sampleCount).toBe(1);
    expect(profile?.channels.posts.writingExamples).toHaveLength(1);
    expect(profile?.importMeta?.lastSyncedAt).toBeTruthy();
  });
});
