import { expect, test } from "../fixtures/vault";

test.describe("Seal/Unseal Operations", () => {
  test("should unseal vault with keys", async ({ page, initializedVault, unsealVault, apiURL }) => {
    await page.goto("/");

    // Unseal with keys
    const keysToUse = initializedVault.keys.slice(0, 3);
    await unsealVault(keysToUse);

    // Verify vault is unsealed
    const healthResponse = await page.request.get(`${apiURL}/v1/sys/health`);
    const health = await healthResponse.json();
    expect(health.sealed).toBe(false);
  });

  test("should display unseal progress", async ({ page, initializedVault, apiURL }) => {
    await page.goto("/");

    // Check if unseal UI is shown
    const unsealInput = page.locator('input[type="password"], input[placeholder*="key" i]').first();
    if (await unsealInput.isVisible()) {
      // Enter first key
      await unsealInput.fill(initializedVault.keys[0]);
      await page.locator('button:has-text("Unseal")').click();

      // Should show progress
      await expect(page.locator("text=/.*[0-9]+\\/[0-9]+.*/")).toBeVisible();
    }
  });

  test("should seal vault when authenticated", async ({ authenticatedPage, apiURL }) => {
    await authenticatedPage.goto("/system");

    // Look for seal button
    const sealButton = authenticatedPage.locator('button:has-text("Seal")').first();
    if (await sealButton.isVisible()) {
      await sealButton.click();
      await authenticatedPage.waitForLoadState("networkidle");

      // Verify vault is sealed
      const healthResponse = await authenticatedPage.request.get(`${apiURL}/v1/sys/health`);
      const health = await healthResponse.json();
      expect(health.sealed).toBe(true);
    }
  });
});
