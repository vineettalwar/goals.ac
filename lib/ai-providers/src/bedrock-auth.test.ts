import { describe, expect, it } from "vitest";
import {
  resolveBedrockAuth,
  resolveModel,
  resolveBedrockModelId,
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

describe("resolveBedrockModelId", () => {
  it("returns configured model without listing", async () => {
    await expect(
      resolveBedrockModelId({ apiKey: "k", model: "amazon.nova-lite-v1:0" }),
    ).resolves.toBe("amazon.nova-lite-v1:0");
  });

  it("uses Nova Lite when no model is configured", async () => {
    await expect(resolveBedrockModelId({ apiKey: "k" })).resolves.toBe("amazon.nova-lite-v1:0");
  });
});

describe("toBedrockModelChoices", () => {
  it("filters specialty models and prefers Nova", async () => {
    const { toBedrockModelChoices } = await import("./bedrock-models");
    const choices = toBedrockModelChoices([
      "amazon.titan-embed-text-v2:0",
      "nvidia.nemotron-nano-12b-v2",
      "meta.llama3-70b-instruct-v1:0",
      "amazon.nova-lite-v1:0",
      "amazon.nova-2-sonic-v1:0",
    ]);
    expect(choices.map((c) => c.id)).toEqual([
      "amazon.nova-lite-v1:0",
      "meta.llama3-70b-instruct-v1:0",
      "nvidia.nemotron-nano-12b-v2",
    ]);
    expect(choices[0]?.label).toBe("Amazon Nova Lite");
  });

  it("keeps Anthropic, OpenAI, and DeepSeek chat models", async () => {
    const { toBedrockModelChoices } = await import("./bedrock-models");
    const choices = toBedrockModelChoices([
      "amazon.titan-embed-text-v2:0",
      "us.anthropic.claude-sonnet-4-20250514-v1:0",
      "openai.gpt-4o",
      "us.deepseek.r1-v1:0",
    ]);
    expect(choices.map((c) => c.id)).toEqual([
      "us.anthropic.claude-sonnet-4-20250514-v1:0",
      "openai.gpt-4o",
      "us.deepseek.r1-v1:0",
    ]);
    expect(choices.map((c) => c.label)).toEqual(["Claude Sonnet 4", "GPT-4o", "DeepSeek R1"]);
  });
});

describe("defaultBedrockModelId", () => {
  it("picks first choice then Nova Lite", async () => {
    const { defaultBedrockModelId, FALLBACK_BEDROCK_MODEL } = await import("./bedrock-models");
    expect(defaultBedrockModelId([])).toBe(FALLBACK_BEDROCK_MODEL);
    expect(defaultBedrockModelId([{ id: "amazon.nova-pro-v1:0", label: "Amazon Nova Pro" }])).toBe(
      "amazon.nova-pro-v1:0",
    );
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
    expect(
      formatBedrockAuthError(
        new Error(
          "Access denied. This Model is marked by provider as Legacy and you have not been actively using the model in the last 30 days.",
        ),
      ),
    ).toMatch(/Legacy/);
    expect(formatBedrockAuthError(new Error("UnknownOperationException"))).toMatch(
      /unsupported operation/,
    );
    expect(formatBedrockAuthError(new Error("model not found"))).toBe("model not found");
  });
});
