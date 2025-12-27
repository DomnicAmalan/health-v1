import { test, expect } from "../fixtures/vault";

test.describe("Dashboard", () => {
  test("should display dashboard with seal status", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/");

    // Should show dashboard title
    await expect(authenticatedPage.locator('h1:has-text("Dashboard")')).toBeVisible();

    // Should show seal status card
    await expect(authenticatedPage.locator('text=/.*Seal.*Status.*/i')).toBeVisible();
  });

  test("should display statistics", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/");

    // Should show statistics cards
    await expect(authenticatedPage.locator('text=/.*Realms.*/i')).toBeVisible();
    await expect(authenticatedPage.locator('text=/.*Mounts.*/i')).toBeVisible();
    await expect(authenticatedPage.locator('text=/.*Secrets.*/i')).toBeVisible();
  });

  test("should navigate to different sections", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/");

    // Navigate to secrets
    const secretsLink = authenticatedPage.locator('a:has-text("Secrets"), button:has-text("Secrets")').first();
    if (await secretsLink.isVisible()) {
      await secretsLink.click();
      await authenticatedPage.waitForLoadState("networkidle");
      await expect(authenticatedPage).toHaveURL(/.*secrets.*/i);
    }
  });
});
