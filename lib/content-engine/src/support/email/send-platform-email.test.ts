import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies before importing module under test
vi.mock("@workspace/billing", () => ({
  resolvePlatformResendCredentials: vi.fn(),
}));
vi.mock("../../core/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { sendPlatformEmail, resolveAppOrigin } from "./send-platform-email";
import { resolvePlatformResendCredentials } from "@workspace/billing";

const mockResend = vi.mocked(resolvePlatformResendCredentials);

describe("sendPlatformEmail", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns sent:false when no Resend credentials", async () => {
    mockResend.mockResolvedValue(null);
    const result = await sendPlatformEmail({ to: "a@b.com", subject: "hi", html: "<p>hi</p>" });
    expect(result).toEqual({ sent: false, reason: "no_resend_credentials" });
  });

  it("returns sent:false when no recipients", async () => {
    mockResend.mockResolvedValue({ apiKey: "key", fromEmail: "noreply@goals.ac", source: "env" });
    const result = await sendPlatformEmail({ to: [], subject: "hi", html: "<p>hi</p>" });
    expect(result).toEqual({ sent: false, reason: "no_recipients" });
  });

  it("sends email via Resend API and returns sent:true", async () => {
    mockResend.mockResolvedValue({ apiKey: "re_test", fromEmail: "noreply@goals.ac", source: "env" });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;

    const result = await sendPlatformEmail({ to: "u@x.com", subject: "test", html: "<p>ok</p>" });
    expect(result).toEqual({ sent: true });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"to":["u@x.com"]'),
      }),
    );
  });

  it("returns sent:false on Resend 4xx", async () => {
    mockResend.mockResolvedValue({ apiKey: "re_test", fromEmail: "noreply@goals.ac", source: "env" });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 422, text: async () => "bad" }) as unknown as typeof fetch;

    const result = await sendPlatformEmail({ to: "u@x.com", subject: "x", html: "x" });
    expect(result).toEqual({ sent: false, reason: "resend_422" });
  });

  it("returns sent:false on fetch exception", async () => {
    mockResend.mockResolvedValue({ apiKey: "re_test", fromEmail: "noreply@goals.ac", source: "env" });
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network")) as unknown as typeof fetch;

    const result = await sendPlatformEmail({ to: "u@x.com", subject: "x", html: "x" });
    expect(result).toEqual({ sent: false, reason: "exception" });
  });
});

describe("resolveAppOrigin", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
  });
  afterEach(() => {
    process.env = env;
  });

  it("prefers NEXT_PUBLIC_APP_URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://custom.app/";
    expect(resolveAppOrigin()).toBe("https://custom.app");
  });

  it("falls back to NEXTAUTH_URL", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXTAUTH_URL = "http://localhost:3001";
    expect(resolveAppOrigin()).toBe("http://localhost:3001");
  });

  it("falls back to default", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXTAUTH_URL;
    delete process.env.APP_ORIGIN;
    expect(resolveAppOrigin()).toBe("https://app.goals.ac");
  });
});
