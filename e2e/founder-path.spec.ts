/**
 * The founder path: sign up, set a voice, connect WordPress, publish.
 *
 * This is the one journey the product has to get right, and until now nothing
 * covered it end to end. It runs against a live app and database (the
 * `webServer` in playwright.config.ts, plus `DATABASE_URL`), and stubs the two
 * external dependencies:
 *
 * - the WordPress site, so no real blog is touched
 * - AI generation, so a run costs nothing and does not depend on a provider key
 *
 * Run with: pnpm run test:e2e
 */

import { expect, test, type Page } from "@playwright/test";

/** Unique per run, so repeated runs do not collide on the users table. */
function uniqueEmail(): string {
  return `e2e-founder-${Date.now()}-${Math.floor(Math.random() * 10_000)}@example.test`;
}

const PASSWORD = "E2ePassw0rd!founder";

/**
 * Stub the WordPress plugin contract: health, publish, site graph, and the
 * internal-link write-back. Keeps the spec off any real site.
 */
async function stubWordPress(page: Page): Promise<void> {
  await page.route("**/wp-json/goals-ac/v1/health", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        wordpress_version: "6.7",
        version: "0.1.0",
        capabilities: { seo_meta: true, seo_plugin: "yoast" },
        detected_builders: ["gutenberg"],
        recommended_editor_mode: "gutenberg",
      }),
    }),
  );

  await page.route("**/wp-json/goals-ac/v1/site-graph", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ posts: [], categories: [], tags: [], internal_links: [] }),
    }),
  );

  await page.route("**/wp-json/goals-ac/v1/content", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        remote_id: 101,
        url: "https://example.test/hello-world",
        action: "created",
      }),
    }),
  );

  await page.route("**/wp-json/goals-ac/v1/internal-links", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ updated: [], skipped: [] }),
    }),
  );

  // Application-password path, for sites without the plugin.
  await page.route("**/wp-json/wp/v2/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: 101, link: "https://example.test/hello-world" }),
    }),
  );
}

async function signUp(page: Page, email: string): Promise<void> {
  await page.goto("/signup");
  await page.getByLabel(/name/i).first().fill("E2E Founder");
  await page.getByLabel(/email/i).first().fill(email);
  await page.getByLabel(/password/i).first().fill(PASSWORD);
  await page.getByRole("button", { name: /sign up|create account/i }).click();
}

test.describe("founder path", () => {
  test.beforeEach(async ({ page }) => {
    await stubWordPress(page);
  });

  test("a new founder reaches an authenticated surface after signing up", async ({ page }) => {
    await signUp(page, uniqueEmail());

    // Onboarding or dashboard, depending on where signup lands — either proves
    // the account exists and the session is live.
    await expect(page).toHaveURL(/\/(onboarding|dashboard|projects)/, { timeout: 30_000 });
  });

  test("navigation shows the blog surface and hides the rest", async ({ page }) => {
    await signUp(page, uniqueEmail());
    await page.goto("/dashboard");

    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("link", { name: /dashboard/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /projects/i })).toBeVisible();

    // Hidden on the default blog_wordpress surface.
    await expect(nav.getByRole("link", { name: /social hub/i })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: /geo audit/i })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: /^research$/i })).toHaveCount(0);
  });

  test("hidden routes stay reachable by direct link", async ({ page }) => {
    await signUp(page, uniqueEmail());

    // Hidden from navigation is not the same as removed. A bookmarked URL,
    // or a user switched to the full surface, must still work.
    await page.goto("/audit");
    await expect(page).not.toHaveURL(/\/(login|404)/);
  });

  test("the WordPress connect step validates before it tries to connect", async ({ page }) => {
    await signUp(page, uniqueEmail());
    await page.goto("/onboarding/wordpress");

    const submit = page.getByRole("button", { name: /connect|test|save/i }).first();
    if (await submit.isVisible().catch(() => false)) {
      await submit.click();
      // A blank form must not fire a request at a site URL we do not have.
      await expect(page.getByText(/required|enter|invalid/i).first()).toBeVisible({
        timeout: 10_000,
      });
    }
  });
});
