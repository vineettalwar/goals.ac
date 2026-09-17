import { describe, expect, it } from "vitest";
import { isSocialOauthReady, SOCIAL_OAUTH_DISABLED } from "./social-oauth-availability";

describe("isSocialOauthReady", () => {
  it("treats missing config as not ready", () => {
    expect(isSocialOauthReady("linkedin", undefined)).toBe(false);
    expect(isSocialOauthReady("linkedin", SOCIAL_OAUTH_DISABLED)).toBe(false);
  });

  it("reads per-network flags", () => {
    expect(
      isSocialOauthReady("mastodon", {
        ...SOCIAL_OAUTH_DISABLED,
        mastodon: true,
      }),
    ).toBe(true);
    expect(
      isSocialOauthReady("linkedin", {
        ...SOCIAL_OAUTH_DISABLED,
        linkedin: true,
      }),
    ).toBe(true);
    expect(isSocialOauthReady("unknown", { ...SOCIAL_OAUTH_DISABLED, linkedin: true })).toBe(false);
  });
});
