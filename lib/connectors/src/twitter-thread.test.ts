import { describe, expect, it } from "vitest";
import {
  isTwitterThreadOverLimit,
  splitTwitterThread,
} from "./twitter-thread";

describe("splitTwitterThread", () => {
  it("keeps multi-line tweets until the next number", () => {
    const body = `1/ Hook line.

More context.
Thread 🧵

2/ Second tweet insight.

3/ Close — bookmark this.`;
    const tweets = splitTwitterThread(body, 280);
    expect(tweets).toHaveLength(3);
    expect(tweets[0]).toContain("More context");
    expect(tweets[0]).toContain("Thread");
    expect(tweets[1]).toContain("Second tweet");
  });

  it("flags over-limit when a single tweet exceeds 280", () => {
    const long = "x".repeat(300);
    expect(isTwitterThreadOverLimit(`1/ ${long}\n\n2/ short ok`)).toBe(true);
    expect(isTwitterThreadOverLimit(`1/ fine hook Thread 🧵\n\n2/ also fine`)).toBe(false);
  });
});
