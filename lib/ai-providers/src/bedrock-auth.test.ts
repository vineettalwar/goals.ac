import { describe, expect, it } from "vitest";
import {
  resolveBedrockAuth,
  resolveModel,
  formatBedrockAuthError,
  DEFAULT_BEDROCK_REGION,
} from "./bedrock";

describe("resolveBedrockAuth", () => {
  it("returns null for empty input", () => {
    expect(resolveBedrockAuth(null)).toBeNull();
  });

  it("treats apiKey as bearer auth", () => {
    const auth = resolveBedrockAuth({ apiKey: "bedrock-api-key-xyz" });
    expect(auth).toEqual({
      mode: "bearer",
      apiKey: "bedrock-api-key-xyz",
      region: DEFAULT_BEDROCK_REGION,
      model: undefined,
    });
  });

  it("treats secretAccessKey-only as bearer (stored api key)", () => {
    const auth = resolveBedrockAuth({
      secretAccessKey: "stored-as-api-key",
      region: "eu-west-1",
      model: "anthropic.claude-sonnet-4-20250514-v1:0",
    });
    expect(auth).toEqual({
      mode: "bearer",
      apiKey: "stored-as-api-key",
      region: "eu-west-1",
      model: "anthropic.claude-sonnet-4-20250514-v1:0",
    });
  });

  it("treats accessKeyId + secret as IAM auth", () => {
    const auth = resolveBedrockAuth({
      accessKeyId: "AKIAEXAMPLE",
      secretAccessKey: "secret",
      sessionToken: "sess",
    });
    expect(auth).toMatchObject({
      mode: "iam",
      accessKeyId: "AKIAEXAMPLE",
      sessionToken: "sess",
      model: undefined,
    });
  });
});

describe("resolveModel", () => {
  it("returns undefined for empty", () => {
    expect(resolveModel(null)).toBeUndefined();
    expect(resolveModel("  ")).toBeUndefined();
  });
});

describe("formatBedrockAuthError", () => {
  it("rewrites session expiry and retired-model errors", () => {
    expect(
      formatBedrockAuthError(new Error("Your session has expired. Please reauthenticate.")),
    ).toMatch(/AWS Bedrock authentication failed/);
    expect(
      formatBedrockAuthError(new Error("Your session has expired. Please reauthenticate.")),
    ).toMatch(/not your goals\.ac login/);
    expect(
      formatBedrockAuthError(new Error("This model version has reached the end of its life.")),
    ).toMatch(/retired/);
    expect(formatBedrockAuthError(new Error("UnknownOperationException"))).toMatch(
      /unsupported operation/,
    );
    expect(formatBedrockAuthError(new Error("model not found"))).toBe("model not found");
  });
});
