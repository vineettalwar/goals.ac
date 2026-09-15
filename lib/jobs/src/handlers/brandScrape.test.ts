import { describe, expect, it } from "vitest";
import { QUEUES } from "../queues";

describe("brand-scrape queue", () => {
  it("is a distinct queue from brand-voice-index", () => {
    expect(QUEUES.brandScrape).toBe("brand-scrape");
    expect(QUEUES.brandScrape).not.toBe(QUEUES.brandVoiceIndex);
  });
});
