import crypto from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildGoalsAcAuthHeaders,
  goalsAcApiUrl,
  goalsAcSignPath,
  GOALS_HMAC_HEADERS,
  type GoalsAcPluginPlatform,
} from "./goals-ac-plugin";

describe("goals.ac CMS plugin contract", () => {
  afterEach(() => vi.useRealTimers());

  it.each<[GoalsAcPluginPlatform, string, string]>([
    ["wordpress", "https://site.test/wp-json/goals-ac/v1/content", "/goals-ac/v1/content"],
    ["drupal", "https://site.test/goals-ac/content", "/goals-ac/content"],
    ["joomla", "https://site.test/api/index.php/v1/goals-ac/content", "/api/index.php/v1/goals-ac/content"],
    ["shopify", "https://site.test/goals-ac/v1/content", "/goals-ac/v1/content"],
    ["typo3", "https://site.test/goals-ac/v1/content", "/goals-ac/v1/content"],
  ])("builds matching %s request and signature paths", (platform, url, path) => {
    const credentials = { siteUrl: "https://site.test/", siteKey: "key", platform };
    expect(goalsAcApiUrl(credentials, "/content")).toBe(url);
    expect(goalsAcSignPath(platform, "/content")).toBe(path);
  });

  it("creates a verifiable canonical HMAC signature", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-12T12:00:00Z"));
    const body = JSON.stringify({ title: "Roadmap" });
    const headers = buildGoalsAcAuthHeaders("post", "/goals-ac/v1/content", body, "site-key");
    const timestamp = headers[GOALS_HMAC_HEADERS.timestamp]!;
    const nonce = headers[GOALS_HMAC_HEADERS.nonce]!;
    const bodyHash = crypto.createHash("sha256").update(body).digest("hex");
    const canonical = ["POST", "/goals-ac/v1/content", timestamp, nonce, bodyHash].join("\n");
    const expected = crypto.createHmac("sha256", "site-key").update(canonical).digest("hex");

    expect(timestamp).toBe(String(Date.now() / 1000));
    expect(nonce).toMatch(/^[a-f0-9]{32}$/);
    expect(headers[GOALS_HMAC_HEADERS.signature]).toBe(expected);
  });
});
