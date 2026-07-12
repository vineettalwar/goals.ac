import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./encryption";

describe("secret encryption", () => {
  const originalSecret = process.env.GEMINI_KEY_ENCRYPTION_SECRET;

  beforeEach(() => {
    process.env.GEMINI_KEY_ENCRYPTION_SECRET = "test-only-encryption-secret";
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.GEMINI_KEY_ENCRYPTION_SECRET;
    else process.env.GEMINI_KEY_ENCRYPTION_SECRET = originalSecret;
  });

  it("round-trips Unicode plaintext", () => {
    const plaintext = "sk-test-🔐-秘密";
    expect(decryptSecret(encryptSecret(plaintext))).toBe(plaintext);
  });

  it("uses a fresh IV for every encryption", () => {
    expect(encryptSecret("same value")).not.toBe(encryptSecret("same value"));
  });

  it("rejects malformed ciphertext", () => {
    expect(() => decryptSecret("not:ciphertext")).toThrow("Invalid encrypted format");
  });

  it("rejects ciphertext that was tampered with", () => {
    const encrypted = encryptSecret("sensitive");
    const [iv, tag, data] = encrypted.split(":");
    const tampered = `${iv}:${tag}:${data?.slice(0, -2)}00`;
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("fails closed when the encryption secret is missing", () => {
    delete process.env.GEMINI_KEY_ENCRYPTION_SECRET;
    expect(() => encryptSecret("sensitive")).toThrow(
      "GEMINI_KEY_ENCRYPTION_SECRET environment variable is not set",
    );
  });
});
