import { describe, expect, it } from "vitest";
import { CF_EDGE_PROCESS_ENV_KEYS, copyCfWorkerProcessEnv } from "./wire";

describe("copyCfWorkerProcessEnv", () => {
  it("copies GEMINI_API_KEY from Worker bindings onto process.env", () => {
    expect(CF_EDGE_PROCESS_ENV_KEYS).toContain("GEMINI_API_KEY");
    const previous = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    copyCfWorkerProcessEnv({ GEMINI_API_KEY: "  platform-key  " });
    expect(process.env.GEMINI_API_KEY).toBe("platform-key");
    if (previous === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
  });

  it("copies social OAuth and encryption secrets used to detect publishing config", () => {
    expect(CF_EDGE_PROCESS_ENV_KEYS).toEqual(
      expect.arrayContaining([
        "GEMINI_KEY_ENCRYPTION_SECRET",
        "LINKEDIN_CLIENT_ID",
        "LINKEDIN_CLIENT_SECRET",
        "TWITTER_CLIENT_ID",
        "TWITTER_CLIENT_SECRET",
        "META_APP_ID",
        "META_APP_SECRET",
        "BLUESKY_OAUTH_PRIVATE_KEY_JWK",
      ]),
    );
  });
});
