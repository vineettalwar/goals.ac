import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Unauthorized" }) }),
  );
});

test("protected pages redirect signed-out visitors to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("Welcome back", { exact: true })).toBeVisible();
});

test("login validates fields and surfaces an API error", async ({ page }) => {
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Invalid credentials" }) }),
  );
  await page.goto("/login");

  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Invalid email address")).toBeVisible();
  await expect(page.getByText("Password is required")).toBeVisible();

  await page.getByLabel("Email").fill("person@example.com");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Invalid credentials")).toBeVisible();
});

test("signup enforces account requirements", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Full name").fill("A");
  await page.getByLabel("Email").fill("person@example.com");
  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText("Name must be at least 2 characters")).toBeVisible();
  await expect(page.getByText("Password must be at least 8 characters")).toBeVisible();

  await page.getByLabel("Full name").fill("Ada Lovelace");
  await page.getByLabel("Email").fill("");
  await page.getByLabel("Password").fill("long-enough-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Invalid email address")).toBeVisible();
});

test("unknown routes render the 404 page and recover home", async ({ page }) => {
  await page.goto("/definitely-not-a-page");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await page.getByRole("link", { name: "Back to home" }).click();
  await expect(page).toHaveURL(/\/$/);
});
