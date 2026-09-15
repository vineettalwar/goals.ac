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
});
